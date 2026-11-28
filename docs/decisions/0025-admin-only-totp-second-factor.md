# 0025. A TOTP second factor for the admin only, enforced in the database

## Status

Accepted (2026-11-28)

## Context

The admin can block, ban and delete (ADR 0015). Until `pre-deploy-security-hardening`, a stolen admin
password was enough for all of it, from the app or straight against the database API. Supabase Auth has
app authenticator (TOTP) factors on every plan, and marks a session that verified one with `aal2`.

## Decision

1. **Only the admin is offered a second factor.** The screens live in `features/admin`, on `/admin/verify`.
   Regular users have no factor and no screen for one.
2. **The database requires `aal2`.** `assert_admin()` (the first statement of every `admin_*` function),
   `may_moderate_author()` and the two admin Storage policies check the token's `aal`
   (`20261128120000_admin_second_factor.sql`). A token without the claim is refused. So a stolen password
   gives no admin power even outside the app.
3. **`is_admin()` does not depend on `aal`.** The app needs it to tell an admin who still has to enter the
   code (`needs-second-factor`) from a reader who is not an admin.
4. **The app limits code attempts per account**: `totp_verify`, 5 per minute (ADR 0007), counted before
   Supabase is asked and failing closed.
5. **A lost device is handled in the dashboard**, by deleting the factor. There are no recovery codes.

## Alternatives considered

- **A second factor in `features/auth`, offered to everyone.** More screens and support cases for accounts
  that can only harm their own content. Rejected.
- **Checking `aal` in the app only.** The `admin_*` functions are reachable with the publishable key and a
  token, so the check would be skipped by calling them directly. Rejected.
- **Putting the `aal` test into `is_admin()`.** The app could no longer tell who should be asked for a code.
  Rejected.

## Consequences

- **Residual: code guessing against Supabase directly.** Someone who already has the admin's password holds
  an `aal1` token and can call Auth's verify endpoint without the app, skipping the `totp_verify` limit.
  Supabase's own limit there is per IP. The MFA Verification Attempt hook, which could count per account, is
  available on the Teams and Enterprise plans only; this project is on Free. Accepted.
- **Enrolment is first come.** Until the admin's factor is verified, whoever has the password can enrol their
  own. The owner enrols right after being added to `public.admins` (`docs/environment.md`).
- **The admin cannot use password recovery** while a factor is verified: Auth refuses a password change at
  `aal1`. The path is to delete the factor, recover, and enrol again.
- The migration and the app ship together: without the app no admin can reach `aal2`.
- The local seed carries a verified factor with a public secret, so the recorded scenarios can run. The seed
  already refuses a database with real accounts.
