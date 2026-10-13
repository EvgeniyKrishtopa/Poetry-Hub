## ADDED Requirements

### Requirement: Session-aware header (FR-7)
The root layout SHALL render a `<header>` with a link to `/` showing the site name and a session part rendered on the server, inside a `<Suspense>` boundary, from the request's session cookies. The session part SHALL show a "Sign in" link to `/login` when the request has no valid session, and only a "Sign out" button when it has one. The header SHALL NOT show the reader's email. No code in the browser SHALL read the session.

#### Scenario: Signed out
- **GIVEN** a request with no session cookies
- **WHEN** any page renders
- **THEN** the header shows the site-name link to `/` and a link "Sign in" with `href` `/login`, and no "Sign out" button

#### Scenario: Signed in
- **GIVEN** a request whose session cookies hold a valid session for "reader@example.com"
- **WHEN** any page renders
- **THEN** the header shows a "Sign out" button and no "Sign in" link
- **AND** "reader@example.com" does not appear in the header

#### Scenario: Session check fails
- **GIVEN** the server's session check gets no claims, a Supabase error, or a thrown error
- **WHEN** the header renders
- **THEN** it shows the "Sign in" link and the page still renders

#### Scenario: Pending session check
- **GIVEN** the session check has not resolved yet
- **WHEN** the header's Suspense fallback renders
- **THEN** neither "Sign in" nor "Sign out" is present

### Requirement: Sign out from the header (FR-7a)
"Sign out" SHALL call `signOutAction`, which calls Supabase `signOut({ scope: "local" })`. On success the action SHALL refresh the server-rendered tree, so the header shows "Sign in" without a full reload. On failure the header SHALL keep "Sign out" and show "Couldn't sign out. Try again." in a `role="alert"` element.

#### Scenario: Sign out
- **GIVEN** a signed-in header
- **WHEN** the reader clicks "Sign out" and Supabase `signOut` succeeds
- **THEN** the action called `signOut` with `scope: "local"` and refreshed the server-rendered tree
- **AND** the header then shows "Sign in"

#### Scenario: Sign out fails
- **GIVEN** a signed-in header
- **WHEN** the reader clicks "Sign out" and `signOutAction` returns `{ ok: false }` or a `serverError`
- **THEN** "Sign out" is still shown
- **AND** an alert reads "Couldn't sign out. Try again."
- **AND** no refresh happened

### Requirement: Supabase configuration validation (FR-8)
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` SHALL be validated lazily on each client creation.
- The URL must use `https://`, or `http://` only for `localhost` / `127.0.0.1`.
- The key must be non-empty and contain no whitespace.

Invalid config SHALL raise `SupabaseConfigError` naming the variables, never their values. With invalid config:
- the proxy SHALL skip the refresh, log the variable names with `console.error`, and still return the security headers;
- the actions SHALL return the `unavailable` failure;
- the header SHALL show the signed-out state.

#### Scenario: Names only in the error
- **GIVEN** `NEXT_PUBLIC_SUPABASE_URL` is unset and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is "  has space"
- **WHEN** the config is read
- **THEN** a `SupabaseConfigError` is thrown whose message names both variables and contains neither value

#### Scenario: URL scheme rule
- **GIVEN** `NEXT_PUBLIC_SUPABASE_URL` is `http://example.com`
- **WHEN** the config is read
- **THEN** a `SupabaseConfigError` naming `NEXT_PUBLIC_SUPABASE_URL` is thrown
- **AND** with `http://localhost:54321` no error is thrown

#### Scenario: Proxy with invalid config
- **GIVEN** Supabase config is invalid
- **WHEN** the proxy handles a request
- **THEN** the response carries all four security headers, `console.error` was called with a message naming the variables, and `getClaims` was not called

#### Scenario: Header with invalid config
- **GIVEN** Supabase config is invalid
- **WHEN** any page renders
- **THEN** the header shows the "Sign in" link to `/login`

### Requirement: Rendering modes with a session-aware header (NFR-2)
`npm run build` SHALL succeed. Every route that renders the root layout and is not dynamic SHALL be partially prerendered: a static shell, with the header's session part streamed per request. Dynamic routes SHALL stay dynamic, and `/` SHALL keep its cache lifetimes (Revalidate 1m, Expire 1h).

#### Scenario: Build route table
- **GIVEN** the change is complete
- **WHEN** `npm run build` runs
- **THEN** `/`, `/login`, `/signup`, and `/_not-found` are listed as partially prerendered, `/api/revalidate` and `/auth/confirm` as dynamic, and `/` with Revalidate 1m and Expire 1h

## REMOVED Requirements

### Requirement: Auth status in the header (FR-7)
**Reason**: The header no longer reads the session in the browser (change `remove-browser-session-read`, user decision 2026-10-13). Replaced by "Session-aware header (FR-7)" and "Sign out from the header (FR-7a)".

**Migration**: The session is read on the server inside a Suspense boundary; the header shows "Sign in" or "Sign out" only, without the email. Sign-out keeps `signOutAction` and its failure message.

### Requirement: Supabase configuration (FR-8)
**Reason**: Its widget clause and "Widget with invalid config" scenario describe the browser read through `AuthStatus`, which is removed. Replaced by "Supabase configuration validation (FR-8)", which keeps every other rule and scenario unchanged.

**Migration**: None; the config rules, the proxy and action behaviour, and the error format are unchanged.

### Requirement: Rendering mode of `/` preserved (NFR-2)
**Reason**: Reading the session on the server for the header makes every non-dynamic route partially prerendered. Replaced by "Rendering modes with a session-aware header (NFR-2)".

**Migration**: None; `/` keeps its cached page body and cache lifetimes.
