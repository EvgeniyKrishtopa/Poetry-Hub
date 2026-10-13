# Proposal

## Why

The header's `AuthStatus` widget is the only code that reads the session in the browser. To do
that, the app carries a Supabase browser client, a TanStack session query, a re-read on every
pathname change, and the race handling around them (stale reads, sign-out vs. an in-flight
read, a browser-side token refresh that can write cookies). The user decided (2026-10-13) that
this client-side machinery is unnecessary: the server already has the session cookies on every
request, and the header only needs to know "signed in or not" to offer "Sign in" or "Sign out".
The reader's email in the header is dropped as well.

## What Changes

- **BREAKING (internal API):** the Supabase browser client is removed:
  `getSupabaseBrowserClient` and `src/shared/lib/supabase/browser.ts` are deleted, and
  `@/shared/lib/supabase` no longer exports it.
- The browser session read is removed: `getSignedInEmail`, `sessionQueryOptions`, `authKeys`
  (`src/features/auth/api/`), and the re-read on pathname change.
- The session is read on the server instead, by a server-only function in the auth feature's
  `dal/`, which reports only whether the request carries a valid session.
- `AuthStatus` becomes a Server Component rendered inside a `<Suspense>` boundary in the root
  layout's header. Signed out: a "Sign in" link to `/login`. Signed in: a "Sign out" button
  only, no email.
- `signOutAction` stays. On success it refreshes the server-rendered tree from the server; the
  inline "Couldn't sign out. Try again." alert on failure stays.
- Because the header now reads request data, every page that uses the root layout is
  partially prerendered: a static shell plus the header's session part streamed per request.
  `/` keeps its cached page body.
- The `auth` spec's header and config requirements are rewritten for the server read; the
  `feedback-tones` sign-out failure requirement stays.
- The docs that describe the browser client and the widget are updated, and a new decision
  record supersedes the "Session freshness and the header" part of ADR 0003.

Sign-in, sign-up, email confirmation, the proxy's session refresh, and the Supabase config
validation stay as they are.

**Mockups.** None. The header keeps the existing "Sign in" link and the existing ghost
"Sign out" button and inline failure text; it only loses the email. The user chose
(2026-10-13) to skip the Claude Design brief step in `docs/claude-design.md` for this change.

## Requirements

- **FR-1** — Header, signed out: the root layout renders a `<header>` with the site-name link to
  `/` and, for a request without a valid session, a "Sign in" link to `/login`, styled
  `text-sm font-medium text-accent` as today.
- **FR-2** — Header, signed in: for a request with a valid session, the header shows a
  "Sign out" button (the existing ghost `Button`) and no email and no "Sign in" link.
- **FR-3** — Server-side read: whether the reader is signed in is decided on the server, per
  request, from the session cookies, by one server-only function in `features/auth/dal/`.
  - It returns a boolean and never throws.
  - It is always request-bound, even when the Supabase config is invalid, so no build
    prerenders a session state into the static shell.
  - It returns `false` on missing claims, on any Supabase error, and on `SupabaseConfigError`.
  - The header part that calls it sits inside a `<Suspense>` boundary whose fallback renders
    neither "Sign in" nor "Sign out".
- **FR-4** — Sign out: "Sign out" calls `signOutAction`, which calls Supabase
  `signOut({ scope: "local" })`.
  - On success the action refreshes the server-rendered tree, so the header shows "Sign in"
    without a full page reload.
  - On failure the button stays and "Couldn't sign out. Try again." shows in an inline
    `role="alert"` element with `text-danger`.
- **FR-5** — No browser Supabase client: no module under `src/` imports `createBrowserClient`,
  and `@/shared/lib/supabase` exports only `SupabaseConfigError` from its client-safe entry
  (`index.ts`). No code in the browser reads the session; `getSignedInEmail`,
  `sessionQueryOptions`, and `authKeys` no longer exist.
- **FR-6** — Specs: the `auth` spec's "Auth status in the header (FR-7)" requirement is replaced
  by "Session-aware header (FR-7)" and "Sign out from the header (FR-7a)", matching FR-1 to
  FR-4 above. Its "Supabase configuration
  (FR-8)" requirement is replaced by "Supabase configuration validation (FR-8)", which says the
  header shows "Sign in" with invalid config instead of naming `AuthStatus`'s browser read. Its
  "Rendering mode of `/` preserved (NFR-2)" requirement is replaced by "Rendering modes with a
  session-aware header (NFR-2)", matching NFR-1 below. The `feedback-tones` FR-5 requirement
  ("Inline sign-out failure in danger") is unchanged; its NFR-3 ("Behaviour unchanged") lets
  the sign-out failure assertions move with the message into the sign-out button; its NFR-4
  ("Rendering modes unchanged") defers to the new `auth` NFR-2 instead of requiring `/` static.
- **FR-7** — Docs: no file under `docs/` (outside `docs/decisions/`), no line of `README.md`,
  and no source comment describes a browser client, a browser session read, or the header
  email, whatever words it uses — negations included ("no browser client" counts). Docs and
  comments describe what exists now (the server-side session read); the history lives only in
  `docs/decisions/`. This covers at least `docs/architecture.md`,
  `docs/environment.md`, `docs/state-management.md` if it mentions the session query,
  `README.md`, and the `config.ts` header comment; `docs/design-system.md` is regenerated by
  the `design-system` skill from the code instead of being edited by hand. A new file in
  `docs/decisions/` records the server-side read and supersedes ADR 0003's "Session freshness
  and the header" bullet; ADR 0003 itself is not edited.
- **NFR-1** — Rendering modes: `npm run build` succeeds and lists the same routes as a build of
  the branch's merge-base with `main`. Every route that renders the root layout and was static
  (`○`) or partially prerendered (`◐`) is now partially prerendered (`◐`); dynamic (`ƒ`) routes
  stay dynamic; `/` keeps its Revalidate/Expire values (1m / 1h).
- **NFR-2** — `package.json` dependencies are unchanged. `@supabase/ssr` stays: the server
  client and the proxy use it.
- **NFR-3** — No dead code is left behind: `npm run knip` reports no unused file, export, or
  dependency, and `npm run test:coverage` meets the 80% threshold.

## Acceptance Criteria

- **FR-1:** GIVEN a request with no session cookies, WHEN any page renders, THEN the header
  contains the site-name link to `/` and one link "Sign in" with `href` `/login`, and no
  "Sign out" button.
- **FR-2:** GIVEN a request whose cookies hold a valid session for "reader@example.com", WHEN
  any page renders, THEN the header contains a "Sign out" button, no "Sign in" link, and the
  text "reader@example.com" appears nowhere in the header.
- **FR-3:** GIVEN the session check finds claims, WHEN it runs, THEN it resolves to `true`;
  GIVEN it finds no claims, a Supabase error, or a thrown `SupabaseConfigError`, WHEN it runs,
  THEN it resolves to `false` without throwing.
- **FR-3:** GIVEN the session check has not resolved yet, WHEN the header's Suspense fallback
  renders, THEN neither "Sign in" nor "Sign out" is present.
- **FR-4:** GIVEN a signed-in header, WHEN the reader clicks "Sign out" and Supabase `signOut`
  succeeds, THEN the action called `signOut` with `scope: "local"` and refreshed the
  server-rendered tree, and the header then shows "Sign in".
- **FR-4:** GIVEN a signed-in header, WHEN the reader clicks "Sign out" and `signOutAction`
  returns `{ ok: false }` or a `serverError`, THEN "Sign out" is still shown, an alert reads
  "Couldn't sign out. Try again.", and no refresh happened.
- **FR-5:** GIVEN the change is complete, WHEN `src/` (excluding `tests/` folders) is searched
  for `createBrowserClient`, `getSupabaseBrowserClient`, `getSignedInEmail`,
  `sessionQueryOptions`, and `authKeys`, THEN there are no matches, and
  `src/shared/lib/supabase/index.ts` exports only `SupabaseConfigError`.
- **FR-6:** GIVEN the change is archived, WHEN `openspec/specs/auth/spec.md` is read, THEN it
  does not mention the browser client or a browser session read, its header requirement
  matches FR-1 to FR-4, and its rendering-mode requirement matches NFR-1; `feedback-tones` FR-5
  is unchanged and its NFR-4 no longer requires `/` to be static.
- **FR-7:** GIVEN the change is complete, WHEN `docs/` (outside `docs/decisions/`) and
  `README.md` are read, THEN none describes a browser client, a browser session read, or the
  header email; a search for "browser client", "getSignedInEmail", "sessionQueryOptions", and
  "signed-in email" across `docs/`, `README.md`, and `src/` (excluding `tests/`) matches only
  `docs/decisions/`; `docs/design-system.md`'s `Commit` line is a commit of this change; and
  the new record names ADR 0003 as partly superseded.
- **NFR-1:** GIVEN the change is complete, WHEN `npm run build` runs on the branch (with and
  without the Supabase env) and on its merge-base with `main`, THEN every build succeeds, both list the same routes, `/`, `/login`,
  `/signup`, and `/_not-found` are `◐`, `/api/revalidate` and `/auth/confirm` stay `ƒ`, and `/`
  shows Revalidate 1m and Expire 1h.
- **NFR-2:** GIVEN the change is complete, WHEN `package.json` `dependencies` and
  `devDependencies` are diffed against `main`, THEN there is no difference.
- **NFR-3:** GIVEN the change is complete, WHEN `npm run knip` and `npm run test:coverage` run,
  THEN knip reports nothing and coverage is at least 80% for statements, lines, and functions.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `auth`: the header requirement (FR-7) reads the session on the server and shows only
  "Sign in" or "Sign out"; the config requirement (FR-8) drops the browser-widget wording; the
  rendering-mode requirement (NFR-2) accepts partial prerendering for routes under the root
  layout.
- `feedback-tones`: NFR-3 ("Behaviour unchanged") lets the sign-out failure assertions move
  into the sign-out button with the same text, role, and tone; NFR-4 ("Rendering modes
  unchanged") defers to `auth` NFR-2 instead of requiring `/` to stay static.

## Out of Scope

- The proxy's session refresh (`auth` FR-6), sign-in, sign-up, and the email confirmation route.
- Showing any reader data in the header (email, name, avatar).
- Renaming the `NEXT_PUBLIC_SUPABASE_*` variables. With no browser client, no Client Component
  reads them, so Next inlines nothing into the browser bundle; the names stay to avoid touching
  every environment.
- Making the session cookies HttpOnly (now possible, since the browser no longer reads them);
  a follow-up.
- Removing `@supabase/ssr` or TanStack Query (the server client, the proxy, and the poems list
  still use them).

## Risks

- Every page now streams its header per request instead of being fully static. The static
  shell, the page bodies, and `/`'s cached content are unaffected; only the small header part
  waits for the session check (a cookie read plus `getClaims`).
- `getClaims` may call Supabase's auth server when the project signs JWTs with a shared secret
  instead of asymmetric keys, adding a network round trip to the header on every request.
- An open browser tab built before the change still runs the old `AuthStatus` JS until it
  reloads; `signOutAction` keeps its name and contract, so its "Sign out" keeps working.

## Impact

- Code: `src/app/layout.tsx`; `src/features/auth/` (`api/` removed, `dal/` gains the session
  check, `components/AuthStatus/` rewritten as a synchronous presentational component, a new
  `components/SignOutButton/` Client Component, `actions/auth.actions.ts`, `index.ts`, and matching tests); `src/shared/lib/supabase/`
  (`browser.ts` removed, `index.ts`, `config.ts` comment, `tests/browser.test.ts` removed).
- Specs: `openspec/specs/auth/spec.md`, `openspec/specs/feedback-tones/spec.md` (NFR-3, NFR-4).
- Docs: `docs/architecture.md`, `docs/environment.md`, `docs/state-management.md` (if it
  mentions the session query), `README.md`, `docs/design-system.md` (regenerated by the
  `design-system` skill), a new `docs/decisions/` record.
- Dependencies: none.
