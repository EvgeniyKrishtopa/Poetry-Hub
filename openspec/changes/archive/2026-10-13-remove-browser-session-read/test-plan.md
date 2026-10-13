# Test Plan

One row per acceptance criterion in `proposal.md`. Rows whose criterion is a property of the
source tree, the build, or the docs (not runtime behaviour) are closed by a named check, not a
test; their level reads `static check` on purpose, so `code-review` doesn't look for a test that
shouldn't exist.

| Requirement | Tests / checks that close it | Level |
| --- | --- | --- |
| FR-1 (no session cookies → site link and "Sign in" → `/login`, no "Sign out") | `tests/components/AuthStatus.test.tsx`: `signedIn={false}` → a "Sign in" link with `href` `/login` and no "Sign out" button | unit |
| FR-1 (same, rendered in a real page) | Gate 3 signed out on `/`, `/login`, `/signup` (task 3.3); recorded scenario `header-sign-in-link` tagged `@remove-browser-session-read` asserting the "Sign in" link on `/` | end-to-end |
| FR-2 (valid session → "Sign out", no "Sign in", no email) | `tests/components/AuthStatus.test.tsx`: `signedIn={true}` → a "Sign out" button, no "Sign in" link, no text containing "@"; Gate 3 signed in on `/`, `/login`, `/signup` (task 3.3) | unit + end-to-end |
| FR-3 (claims → `true`; no claims, error result, config error, other throw → `false`, never throws) | `tests/dal/is-signed-in.test.ts`: each case, plus `connection` called before the server client (also with invalid config), the error result and config error not logged, the other throw logged by name only | unit |
| FR-3 (Suspense fallback shows neither link) | Source check in task 1.4: the layout's fallback is `<div aria-hidden="true" className="min-w-24" />`; builds with and without the Supabase env succeed with `/` as `◐` (task 1.4), proving the session part is only in the streamed hole | static check |
| FR-4 (sign out succeeds → `signOut({ scope: "local" })`, refresh, header shows "Sign in") | `tests/actions/auth.actions.test.ts`: success → `signOut` called with `scope: "local"` and `refresh` called once; `tests/components/SignOutButton.test.tsx`: `{ ok: true }` → no alert; Gate 3 sign-out round trip on each of the three pages (task 3.3) | unit + end-to-end |
| FR-4 (sign out fails → button stays, alert, no refresh) | `tests/actions/auth.actions.test.ts`: Supabase error and config error → `{ ok: false }`, `refresh` not called; `tests/components/SignOutButton.test.tsx`: `{ ok: false }`, `serverError`, rejected call → "Sign out" still shown and a `role="alert"` paragraph with `text-danger` reading "Couldn't sign out. Try again."; disabled while pending; a succeeding retry clears the alert | unit |
| FR-5 (no browser client or browser read; supabase index exports only `SupabaseConfigError`) | `src/shared/lib/supabase/tests/index.test.ts`: export names are exactly `["SupabaseConfigError"]`; grep in task 1.5 finds none of the removed names in `src/` (excluding `tests/`) | unit + static check |
| FR-6 (archived specs: no browser read, header and rendering-mode requirements match; `feedback-tones` FR-5 unchanged, NFR-4 defers to `auth` NFR-2) | `openspec validate remove-browser-session-read --strict` and post-archive read of both main specs (task 3.4) | static check |
| FR-7 (docs and comments describe no browser client, browser read, or header email, negations included; `design-system.md` regenerated; ADR 0004) | Read-through plus grep in task 2.1 over `docs README.md src` (excluding `tests/`); `docs/design-system.md` `Commit` line check (task 2.2); ADR 0004 content check (task 2.3) | static check |
| NFR-1 (builds with and without env succeed; same routes; `/`, `/login`, `/signup`, `/_not-found` `◐`; `ƒ` routes unchanged; `/` 1m/1h) | Route tables of the branch builds (task 1.4) and the merge-base build compared (task 3.1) | static check |
| NFR-2 (no dependency change) | `git diff main -- package.json` (task 3.2) | static check |
| NFR-3 (knip clean, coverage ≥ 80%) | `npm run knip` and `npm run test:coverage` (task 3.2); sign-in, sign-up, confirm, config, server, session, and proxy tests keep passing unedited | unit |
