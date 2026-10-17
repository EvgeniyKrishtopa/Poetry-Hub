# Spec Delta

## MODIFIED Requirements

### Requirement: Session-aware header (FR-7)
The root layout SHALL render a `<header>` with a link to `/` showing the site name, an "Наши авторы" link to `/authors` for every visitor, and a session part rendered on the server, inside a `<Suspense>` boundary, from the request's session cookies. The session part SHALL show a "Sign in" link to `/login` when the request has no valid session, and a "Мастерская поэта" link to `/account` plus a "Sign out" button when it has one. When the session can't be checked (Supabase unreachable or failing, or its config missing), it SHALL show only the empty placeholder it shows while loading (add-author-profiles FR-20). The header SHALL NOT show the reader's email. No code in the browser SHALL read the session. The two navigation links come from add-author-profiles FR-3.

#### Scenario: Signed out
- **GIVEN** a request with no session cookies
- **WHEN** any page renders
- **THEN** the header shows the site-name link to `/`, a link "Наши авторы" with `href` `/authors`, and a link "Sign in" with `href` `/login`
- **AND** there is no "Sign out" button and no "Мастерская поэта" link

#### Scenario: Signed in
- **GIVEN** a request whose session cookies hold a valid session for "reader@example.com"
- **WHEN** any page renders
- **THEN** the header shows "Наши авторы" (`/authors`), "Мастерская поэта" (`/account`), and a "Sign out" button, and no "Sign in" link
- **AND** "reader@example.com" does not appear in the header

#### Scenario: Session check fails
- **GIVEN** the server's session check gets no claims or a non-retryable Supabase error (an expired or invalid token); an unreachable or failing Supabase is "Session check unavailable" below (add-author-profiles FR-20)
- **WHEN** the header renders
- **THEN** it shows the "Sign in" link and "Наши авторы", and the page still renders

#### Scenario: Session check unavailable
- **GIVEN** the server's session check gets a retryable Supabase error (unreachable, or status 500 or above), a thrown error, or no Supabase config
- **WHEN** the header renders
- **THEN** it shows "Наши авторы" and the empty placeholder, with no "Sign in", "Sign out", or "Мастерская поэта"
- **AND** the page still renders

#### Scenario: Pending session check
- **GIVEN** the session check has not resolved yet
- **WHEN** the header's Suspense fallback renders
- **THEN** neither "Sign in", "Sign out", nor "Мастерская поэта" is present
- **AND** "Наши авторы" is present

### Requirement: Session refresh in the proxy (FR-6)
The proxy SHALL refresh the Supabase session on every request its matcher lets through. It SHALL call `getClaims()` through a server client that writes refreshed cookies to the forwarded request and the response. Every response the proxy returns SHALL carry the four security headers. A response that sets at least one session cookie SHALL carry `Cache-Control: private, no-store`. The refresh SHALL also report whether that same `getClaims()` call found a valid session, or that it couldn't tell (missing config, a retryable network or outage error, returned or thrown), using the same reading of the result as the page gate, so the proxy can gate routes (add-author-profiles FR-19) with no additional Supabase call.

#### Scenario: Refreshed cookie, headers, and no-store
- **GIVEN** the server client's `getClaims` triggers `setAll` with a refreshed cookie
- **WHEN** the proxy handles a request
- **THEN** the response carries that cookie, all four security headers, and `Cache-Control: private, no-store`

#### Scenario: No session
- **GIVEN** a request with no session cookies for a path outside `/account`
- **WHEN** the proxy handles it
- **THEN** the response carries all four security headers and sets no cookie
- **AND** the proxy adds no `Cache-Control: private, no-store`
- **AND** a signed-out request for `/account` is the exception: its redirect always carries `Cache-Control: private, no-store`, cookies or not, because it depends on the session (add-author-profiles FR-19)

#### Scenario: The refresh reports the session state
- **GIVEN** `getClaims` returns claims with a subject; returns no claims or a non-retryable error; or returns a retryable error (network, status 500 or above) or throws
- **WHEN** the session is refreshed
- **THEN** it reports signed-in, signed-out, or unknown respectively, and `getClaims` was called once

#### Scenario: Odd results
- **GIVEN** `getClaims` returns claims together with a retryable error, or claims without a non-empty string subject
- **WHEN** the session is refreshed
- **THEN** the first reports unknown and the second signed-out (the rules apply in order: retryable error, then subject, then signed-out)

#### Scenario: Missing config is unknown
- **GIVEN** the Supabase environment variables are missing
- **WHEN** the session is refreshed
- **THEN** it reports unknown and the request continues
