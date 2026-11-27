## MODIFIED Requirements

### Requirement: Admin page access (FR-2)
`/admin` SHALL render for an admin whose session is `aal2` only. A signed-out request SHALL be redirected to `/login`. A signed-in non-admin request SHALL get the not-found screen (a soft 404, status 200, as on the public pages), the same screen as an unknown URL, with no breadcrumb trail. An admin whose session is not `aal2` SHALL be redirected to `/admin/verify` (admin-second-factor). When the session or the admin check cannot be told (Supabase unreachable), the page SHALL show the existing "service unavailable" state, not the admin tools and not a 404. The page SHALL never be cached.

#### Scenario: Admin opens the page
- **GIVEN** a signed-in admin with an `aal2` session
- **WHEN** they request `/admin`
- **THEN** the page shows the user list

#### Scenario: Admin without the second factor
- **GIVEN** a signed-in admin with an `aal1` session
- **WHEN** they request `/admin`
- **THEN** the response redirects to `/admin/verify`

#### Scenario: Signed-out visitor
- **GIVEN** no session
- **WHEN** a browser requests `/admin`
- **THEN** the response redirects to `/login`

#### Scenario: Signed-in non-admin
- **GIVEN** a signed-in user who is not an admin
- **WHEN** they request `/admin`
- **THEN** the not-found screen shows, without a breadcrumb trail, and carries no admin data

#### Scenario: Admin check unavailable
- **GIVEN** the admin check fails with an outage
- **WHEN** an admin requests `/admin`
- **THEN** the page shows the "service unavailable" state and no user data

## ADDED Requirements

### Requirement: Admin controls need the second factor (pre-deploy-security-hardening FR-8)
For an admin session below `aal2`, public pages SHALL show no admin control (delete, add to home, add to the review list), while the header admin link SHALL still show.

#### Scenario: Public poem page at aal1
- **GIVEN** an admin with an `aal1` session
- **WHEN** they open another author's poem page
- **THEN** no admin control shows and the header link does
