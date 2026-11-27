## ADDED Requirements

### Requirement: Baseline Content-Security-Policy (pre-deploy-security-hardening FR-2)
Every response that carries the security headers SHALL also carry `Content-Security-Policy` with `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'` and `form-action 'self' <Supabase origin> https://accounts.google.com`, and no `script-src` or `default-src`. When the Supabase configuration is invalid the policy SHALL omit only the Supabase origin.

#### Scenario: Page response
- **GIVEN** a configured application
- **WHEN** a browser requests `/`
- **THEN** the response carries the four directives with the configured Supabase origin

#### Scenario: Invalid configuration
- **GIVEN** the Supabase URL is missing
- **WHEN** a browser requests `/`
- **THEN** the policy has `form-action 'self' https://accounts.google.com` and the page still answers

#### Scenario: Google sign-in under the policy
- **GIVEN** the policy is sent
- **WHEN** a reader starts a Google sign-in with JavaScript on, and again with it off
- **THEN** each time the browser reaches Google and no CSP violation is reported

### Requirement: Responses do not name the framework (pre-deploy-security-hardening FR-15)
Responses SHALL NOT carry an `X-Powered-By` header.

#### Scenario: Production server
- **GIVEN** a production build is running
- **WHEN** a browser requests `/`
- **THEN** the response has no `X-Powered-By` header
