## ADDED Requirements

### Requirement: Auth cookies are not readable by page scripts (pre-deploy-security-hardening FR-1)
Every auth cookie the app writes or clears, chunked cookies and the PKCE code verifier included, SHALL be `HttpOnly` with `SameSite=Lax`, and `Secure` in a production build. Both the request-scoped server client and the proxy's session refresh SHALL apply the same options.

#### Scenario: Password sign-in
- **GIVEN** a confirmed reader
- **WHEN** they sign in with the password
- **THEN** every `sb-*` cookie in the response is `HttpOnly` and `SameSite=Lax`
- **AND** `document.cookie` holds none of them

#### Scenario: Refresh by the proxy
- **GIVEN** a request whose access token has expired and whose refresh token is valid
- **WHEN** the proxy refreshes the session
- **THEN** the rewritten cookies carry the same attributes

#### Scenario: Google sign-in still works
- **GIVEN** the app with these cookie options
- **WHEN** a reader signs in with Google
- **THEN** they end on `/` signed in

#### Scenario: Production build
- **GIVEN** `NODE_ENV` is `production`
- **WHEN** an auth cookie is written
- **THEN** it is also `Secure`
