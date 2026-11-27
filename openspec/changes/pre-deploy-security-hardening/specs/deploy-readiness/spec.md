## ADDED Requirements

### Requirement: Hosted config check (pre-deploy-security-hardening FR-14)
An npm script SHALL compare the linked hosted project with the expected setup and exit non-zero naming each mismatch: the hosted migration list equal to the repository's (nothing missing, nothing extra); the `reject_banned_signup` Before User Created hook registered; Redirect URLs exactly equal to those built from the given site address (any extra entry fails); captcha on; TOTP enrolment and verification on; the password protection the owner chose (leaked-password protection on, or a minimum length of 12) and `secure_password_change`; no `example.test` account. It SHALL refuse to run against a CLI link other than the named project. Anything it cannot read SHALL fail the run. It SHALL print no secret or token. It SHALL run only by hand, with the token from the developer's shell.

#### Scenario: Missing migration
- **GIVEN** a repository migration not applied to the hosted project
- **WHEN** the script runs
- **THEN** it exits non-zero naming the migration

#### Scenario: Unregistered hook
- **GIVEN** the hook is off
- **WHEN** the script runs
- **THEN** it exits non-zero naming the hook

#### Scenario: Correct project
- **GIVEN** every expected value matches
- **WHEN** the script runs
- **THEN** it exits zero

#### Scenario: Seeded account on the hosted project
- **GIVEN** the hosted project holds an `example.test` account
- **WHEN** the script runs
- **THEN** it exits non-zero

#### Scenario: Linked to another project
- **GIVEN** the CLI is linked to a project other than the named one
- **WHEN** the script runs
- **THEN** it exits non-zero without comparing anything

#### Scenario: No token
- **GIVEN** the token variable is unset, or the API answers an error
- **WHEN** the script runs
- **THEN** it exits non-zero without printing any response body

### Requirement: The seed refuses real accounts (pre-deploy-security-hardening FR-16)
`supabase/seed.sql` SHALL abort before any change when `auth.users` holds an account whose address is not under `example.test`.

#### Scenario: Real account present
- **GIVEN** a database with an account outside `example.test`
- **WHEN** the seed runs
- **THEN** it fails and inserts nothing

#### Scenario: Fresh local database
- **GIVEN** a database just migrated
- **WHEN** `supabase db reset` runs
- **THEN** the seed loads
