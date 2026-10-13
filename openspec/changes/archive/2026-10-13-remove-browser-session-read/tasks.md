# Tasks

## 1. Server-side session read and the new header (`src/app`, `src/features/auth`, `src/shared/lib/supabase`) <!-- judgement-heavy -->

One group on purpose: the browser read path and its replacement swap in the same commit, so no
commit leaves an orphan export for `knip` or a header without a session part (design D5).

- [x] 1.1 (FR-3) Add `src/features/auth/dal/is-signed-in.ts` with
  `isSignedIn(): Promise<boolean>` per design D1 (`server-only`, `await connection()` first and
  outside any `try`, `getClaims` through `createSupabaseServerClient`, never throws, non-config
  errors logged by name only); export it from `src/features/auth/index.ts`.
  - Verify with `src/features/auth/tests/dal/is-signed-in.test.ts`: `connection` is called
    before the server client is created, also when the config is invalid; claims → `true`; no
    claims, an error result, a thrown `SupabaseConfigError`, and another throw → `false`; the
    error result and the config error are not logged, and the other throw logs only its name.
- [x] 1.2 (FR-4) In `signOutAction`, call `refresh()` from `next/cache` after a successful
  `signOut({ scope: "local" })`, before returning `{ ok: true }` (design D4).
  - Verify in `tests/actions/auth.actions.test.ts`: success → `signOut` called with
    `scope: "local"` and `refresh` called once; Supabase error and config error →
    `{ ok: false }` and `refresh` not called. Sign-in and sign-up action tests stay unedited.
- [x] 1.3 (FR-1, FR-2, FR-4) Rewrite `components/AuthStatus/AuthStatus.tsx` as a synchronous
  presentational component with a `signedIn: boolean` prop (no `"use client"`, no DAL call)
  and add `components/SignOutButton/SignOutButton.tsx` (`"use client"`) per design D2. Remove `useSessionRefreshOnNavigation`, the query client, and `router.refresh()`.
  Replace the `FR-7 of add-supabase-auth` markers in these files with this change's FR markers
  (design D5).
  - Verify with `tests/components/AuthStatus.test.tsx` (render `<AuthStatus signedIn={…} />`):
    `false` → "Sign in" link to `/login` and no "Sign out"; `true` →
    "Sign out" button, no "Sign in", no email.
  - Verify with `tests/components/SignOutButton.test.tsx` (action mocked): `{ ok: true }` → no
    alert; `{ ok: false }`, a `serverError`, and a rejected call → "Sign out" still shown and a
    `role="alert"` element with `text-danger` reading "Couldn't sign out. Try again."; the
    button is disabled while the action is pending; a retry that succeeds clears the alert.
- [x] 1.4 (FR-1, FR-3) In `src/app/layout.tsx`, add the async `HeaderSession` wrapper
  (`<AuthStatus signedIn={await isSignedIn()} />`) and render it inside
  `<Suspense fallback={<div aria-hidden="true" className="min-w-24" />}>` (design D3), and
  rewrite the header comment: the session part is read on the server inside the boundary
  (`implements FR-1, FR-2, FR-3 of remove-browser-session-read`); drop the
  `FR-7` and `NFR-2 of add-supabase-auth` markers.
  - Verify `npm run typecheck` passes and `npm run build` succeeds both with and without the
    Supabase env (because `isSignedIn` calls `connection()` first, a header outside the
    boundary would fail either build), and `/` shows `◐` in both.
- [x] 1.5 (FR-5, FR-7) Delete `src/features/auth/api/` (`auth.api.ts`, `auth.queries.ts`) and
  `tests/api/auth.api.test.ts`; delete `src/shared/lib/supabase/browser.ts` and
  `tests/browser.test.ts`; `src/shared/lib/supabase/index.ts` exports only
  `SupabaseConfigError` (update its header comment); rewrite the first-line comment of
  `config.ts` so it no longer mentions a browser client, not even as a negation (FR-7).
  - Add `src/shared/lib/supabase/tests/index.test.ts`: the module's export names are exactly
    `["SupabaseConfigError"]`.
  - Verify `npm run typecheck`, `npm run lint`, and `npm run knip` pass, and
    `grep -rn "createBrowserClient\|getSupabaseBrowserClient\|getSignedInEmail\|sessionQueryOptions\|authKeys" src --exclude-dir=tests`
    finds nothing.

## 2. Docs and the decision record (`docs/`, `README.md`) <!-- isolated -->

- [x] 2.1 (FR-7) Update `docs/architecture.md` (layout line: header = site link + server-read
  session part; auth feature line; `supabase/` line: lists only what the folder holds now,
  without mentioning the removed client — negations count, FR-7), `docs/environment.md`,
  `docs/state-management.md` if it mentions the session query, and `README.md` so none
  describes a browser client, a browser session read, or the header email, in any wording.
  - Verify by reading each file, then
    `grep -rn -i "browser client\|getSignedInEmail\|sessionQueryOptions\|signed-in email" docs README.md src --exclude-dir=tests`
    matches only `docs/decisions/` and `docs/design-system.md` (fixed by 2.2).
- [x] 2.2 (FR-7) After group 1 is committed, re-run the `design-system` skill (extract from code)
  so `docs/design-system.md` describes the header as it now is.
  - Verify the same grep finds nothing in `docs/design-system.md` and its `Commit` line is the
    short hash of this change's last implementation commit.
- [x] 2.3 (FR-7) Write `docs/decisions/0004-*.md` with `record-decision` per design D7: the
  server-side read, no browser client, partial prerendering; it names ADR 0003's "Session
  freshness and the header" bullet as superseded and covers the three D7 points. ADR 0003 is
  not edited.
  - Verify the new file exists, has status Accepted, references ADR 0003, and covers the three
    D7 points.

## 3. Verification <!-- judgement-heavy -->

- [x] 3.1 (NFR-1) Run `npm run build` on the branch and on its merge-base with `main`
  (`git merge-base HEAD origin/main`, built in a scratch worktree) and compare: the same routes;
  `/`, `/login`, `/signup`, `/_not-found` are `◐`; `/api/revalidate` and `/auth/confirm` stay
  `ƒ`; `/` shows Revalidate 1m and Expire 1h.
- [x] 3.2 (NFR-2, NFR-3) `git diff main -- package.json` shows no dependency change;
  `npm run knip` reports nothing; `npm run test:coverage` meets 80%.
- [x] 3.3 (FR-1, FR-2, FR-4) Gate 3 (`web-qa`), on each of `/`, `/login`, and `/signup`
  separately: signed out, the header shows "Sign in" (→ `/login`) and no "Sign out"; signed in
  (visit the page after signing in), it shows "Sign out", no "Sign in", and no email; clicking
  "Sign out" on that page turns the header back into "Sign in" without a full reload. Record a `@playwright/test` scenario `header-sign-in-link` (tagged
  `@remove-browser-session-read`) asserting the signed-out header's "Sign in" link on `/`.
  "Any page" and the invalid-config scenario are closed by the shared layout plus the unit
  tests of 1.1 and 1.3, not by a run with broken env values.
- [x] 3.4 (FR-6) `npx openspec validate remove-browser-session-read --strict` passes, and once
  archived the `auth` spec has no browser-client or browser-session-read wording,
  `feedback-tones` FR-5 is unchanged, and `feedback-tones` NFR-4 no longer requires `/` to be
  static (it defers to `auth` NFR-2).
