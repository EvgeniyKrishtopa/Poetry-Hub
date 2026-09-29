# security-headers Specification

## Purpose
TBD - created by archiving change add-contentful-home-greeting. Update Purpose after archive.
## Requirements
### Requirement: Security headers on page responses (FR-8)
Every page response SHALL include:
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

#### Scenario: Home page response carries the headers
- **GIVEN** the application is running
- **WHEN** a browser requests `/`
- **THEN** the response includes all four headers with exactly those values

### Requirement: Static assets are excluded (FR-8)
The header-setting step SHALL NOT run for Next.js static build assets (`/_next/static/…`), optimized images (`/_next/image…`), `favicon.ico`, or any request path that contains a dot (`.`) anywhere. Page routes whose path contains a dot (for example `/poems/mr.smith`) are therefore also excluded; this is accepted, and page slugs are expected not to contain dots.

#### Scenario: Static asset request
- **GIVEN** the application is running
- **WHEN** a browser requests a file under `/_next/static/`
- **THEN** the header-setting step does not run for that request

#### Scenario: Dotted path is excluded
- **GIVEN** the application is running
- **WHEN** a browser requests `/poems/mr.smith`
- **THEN** the header-setting step does not run for that request

#### Scenario: Page path is matched
- **GIVEN** the application is running
- **WHEN** a browser requests `/poems/some-poem`
- **THEN** the header-setting step runs for that request

