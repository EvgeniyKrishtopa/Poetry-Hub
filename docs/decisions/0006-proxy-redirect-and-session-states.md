# 0006. Proxy redirect for account routes, and three session states

## Status

Accepted (2026-10-16)

Supersedes: 0004 — only its first Decision bullet's boolean `isSignedIn()` and two-state `AuthStatus`. The rest of ADR 0004 stays in force.

## Context

`add-author-profiles` added the first pages for signed-in readers, `/account` and `/account/author`. Each checks the session itself inside a Suspense boundary (ADR 0004; design D9 of the change). Two problems showed up in the PR #81 discussion (2026-10-16):

- A signed-out guest briefly saw the page's heading and skeleton before a client-side redirect to `/login`. The redirect is streamed because reading the session needs Suspense under Cache Components.
- Every failure of the session check read as "signed out". During a Supabase outage, a signed-in reader saw "Sign in" in the header and was sent from `/account` to `/login`, where sign-in failed too. supabase-js *returns* network and 5xx failures (`AuthRetryableFetchError`) rather than throwing them, so even the proxy would have treated an outage as "signed out".

ADR 0004 had the header receive only a boolean from `isSignedIn()`. It had also rejected putting the "signed in?" check in `shared/lib/supabase/session.ts`, the proxy's refresh module, because that question belongs to the auth feature.

## Decision

1. **The proxy redirects a signed-out page request under `/account` to `/login` with a 307, before anything renders** (FR-19).
   - A page request is a GET or HEAD without a `Next-Action` header. A Server Action is a POST to the page's path and is never redirected, so an expired session still gets the action's own "session expired" field error.
   - The redirect carries the refresh's cookies, the cookie-clearing ones for a revoked session included, plus the security headers and `Cache-Control: private, no-store`. It always carries no-store, cookies or not, because it depends on the session.
   - There is no `?next=` parameter: returning to the requested page needs open-redirect validation, so it is a separate feature.
   - The proxy check is optimistic. Pages keep `requireSession()` and actions keep their own session check (NFR-2), because the Next docs warn that a matcher change can silently drop proxy coverage.
2. **There are three session states: `signed-in` (with the user id), `signed-out`, and `unknown`.** One pure helper, `readClaimsState` in `shared/lib/supabase/claims.ts`, reads a `getClaims()` result. Its rules apply in order:
   1. a retryable error, a status of 500 or above, or a 429 rate limit → unknown;
   2. any other error → signed-out;
   3. a non-empty string `sub` → signed-in;
   4. anything else → signed-out.

   A missing config or a throw also counts as unknown. The proxy's refresh and auth's `getSessionState()` both use it, so the proxy and the page gate can't disagree.
3. **This narrows ADR 0004's rejected alternative, for routing only.** `refreshSession` now reports the state its own `getClaims()` call found, with no second Supabase call. Only the proxy routes on it. Rendering and actions still ask auth's `dal/`: `getSessionState()`, `getCurrentUserId()`, `requireSession()`.
4. **"Can't tell" is shown honestly (FR-20), replacing ADR 0004's boolean.**
   - `HeaderAuthLinksContent` passes only the state's name, never the user id, to `AuthStatus`. For `unknown`, `AuthStatus` shows the same empty placeholder as while loading.
   - `requireSession()` redirects only on `signed-out`. On `unknown`, the account pages show «Сервис временно недоступен. Попробуйте позже.» with «Повторить» instead of redirecting.
   - Profile actions map `unknown` to the "unavailable" failure.
   - `isSignedIn()` and `requireUserId()` are removed.
   - ADR 0005 point 2's `getCurrentUserId()` is now `getSessionState()` for actions, with the same principle: the user comes from the session, never from input.
5. **«Повторить» calls `router.refresh()` inside `useTransition`, and the button is disabled while pending.** ADR 0004 rejected a client-side refresh after sign-out because the server knew when cookies changed. No server event marks the end of an outage, so here the reader triggers the refresh.

## Consequences

**Positive**

- A guest never sees the account page's shell; the browser gets a real 307.
- An outage no longer looks like being signed out: the reader stays on the page, and nothing pretends their session is gone.
- One rule for "who is signed in", tested once (`claims.test.ts`) and used by every caller.

**Negative**

- The redirect goes by path prefix (`ACCOUNT_PATH`). An `(authorized)` page added outside `/account` gets only its own gate until the prefix is extended.
- FR-20 only appears when the session really can't be checked. The local stack signs tokens with ES256, despite ADR 0004's "shared secret" note, so once the server has Auth's signing keys, `getClaims()` verifies a valid token locally. During an Auth outage such a reader stays signed in, which is correct, and only a reader whose keys can't be loaded or whose expired token can't be refreshed sees "service unavailable". Verified in the browser on 2026-10-16: stop Auth, then restart the dev server.
- `shared/lib/supabase/session.ts` now knows about session states, which ADR 0004 had kept out of it.

## Alternatives Considered

- **Keep only the page gate's streamed redirect** — rejected: the flash of the account shell for guests, and no answer for the outage case.
- **Have the proxy call an auth-owned helper** — rejected: `@/features/auth`'s index also exports React components and server-only DAL modules, which would be pulled into the proxy bundle. Sharing only the pure reading in `shared/lib/supabase` gives the same single rule.
- **Redirect every method, Server Actions included** — rejected: an expired session would get a failed action call instead of FR-9's "session expired" message under the field.
- **Treat an outage as signed out (the old behaviour)** — rejected: it sent signed-in readers to a sign-in page that couldn't work either.
- **Show the generic error screen (`error.tsx`) on an outage** — rejected: it is English, says "Something went wrong", and replaces the whole page; the alert keeps the page's structure and says what happened.
- **Keep the editor state in Zustand for the retry** — not needed: `router.refresh()` re-requests the server tree, and the header recovers in the same round trip.
