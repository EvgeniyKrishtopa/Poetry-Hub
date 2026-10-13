# 0004. The header reads the session on the server; no browser Supabase client

## Status

Accepted (2026-10-13)

Supersedes: 0003 — only its "Session freshness and the header" bullet and the consequences that follow from it. The rest of ADR 0003 stays in force.

## Context

ADR 0003 kept `/` static and identical for every reader by reading the session only in the browser: the header's `AuthStatus` used a Supabase browser client and a TanStack `["auth","session"]` query, re-read on every pathname change. That needed a browser client, a session query, a navigation re-read, and race handling around them (stale reads, sign-out against an in-flight read, a browser-side token refresh that could write cookies) — all to answer one question the server can already answer from the request's cookies: is the reader signed in?

The user decided (2026-10-13, change `remove-browser-session-read`) that this client-side machinery is unnecessary and that the header no longer shows the reader's email.

## Decision

- **The header reads the session on the server, per request, inside a `<Suspense>` boundary.** `isSignedIn()` in `features/auth/dal/is-signed-in.ts` (server-only) calls `await connection()` first, then `getClaims()` through `createSupabaseServerClient`, and returns only a boolean; it never throws. The root layout awaits it in a small `HeaderSession` wrapper inside `<Suspense>` and passes `signedIn` to the synchronous `AuthStatus`, which shows "Sign in" or "Sign out" — never the email.
- **No browser Supabase client.** Nothing in the browser reads the session. Sign-out stays a Server Action (`signOutAction`), which calls `refresh()` from `next/cache` on success so the server tree re-renders the header.
- **Routes under the root layout are partially prerendered.** The static shell (site link, page bodies, `/`'s `"use cache"` body) prerenders; only the header's session part streams per request. `connection()` makes the check request-bound whatever the config, so a header moved outside the boundary fails every build, including an env-less CI build.
- **Still in force from ADR 0003:** the proxy refreshes the session on every matched request and is the only token refresher.

## Consequences

**Positive**

- One server-side answer to "signed in or not", verified by `getClaims` (a forged or stale cookie doesn't show "Sign out").
- Less code: the browser client, the session query, the navigation re-read, and their race handling are gone; no reader data reaches the client.
- The browser no longer reads the session cookies, so making them HttpOnly becomes possible. **Follow-up**, not done here.

**Negative**

- Every page waits on a per-request read for the header's session part (the rest stays prerendered). `getClaims` may call Supabase Auth per request when the project signs JWTs with a shared secret; asymmetric JWT keys are the follow-up if the latency shows.
- A shared layout isn't re-rendered on soft navigation, so a session that expires or is ended in another tab keeps showing "Sign out" until a full load, a `refresh()`, or a cookie-changing action or redirect. Clicking a stale "Sign out" is harmless.

These ADR 0003 consequences no longer apply:

- "A future feature reads 'who is signed in' from the same `["auth","session"]` query" — the query no longer exists; a server-side feature asks the auth feature's `dal/`.
- "Session cookies are readable by JavaScript … and the header relies on it" — the header no longer relies on it (the cookies are still JS-readable today; see the HttpOnly follow-up above). The Content Security Policy follow-up stays relevant.
- "The header syncs on navigation" — it no longer re-reads on navigation; see the soft-navigation trade-off above.
- "The server render stays identical for every reader" (and `/` building as fully static) — the header's session part now differs per reader; `/`'s cached body is still shared.

## Alternatives Considered

- **Keep the browser read from ADR 0003.** Rejected by the user: it carries a client, a query, a navigation re-read, and race handling just to show one of two links, and it kept the email in the client.
- **Check only whether the auth cookie is present, without `getClaims`.** Rejected: cheaper, but a stale or forged cookie would show "Sign out".
- **Put the check in `shared/lib/supabase/session.ts`.** Rejected: that module is the proxy's refresh; "is the reader signed in" is the auth feature's question, and ADR 0001 puts server-only data access in the feature's `dal/`.
- **Pass reader data (email, id) to a client-side user context.** Rejected: the header needs only a boolean, and a narrower return keeps reader data out of the render tree.
- **Keep `router.refresh()` in the client after sign-out.** Rejected: the server knows the moment the cookies change, so `signOutAction` refreshes there and the client component stays free of router logic.
