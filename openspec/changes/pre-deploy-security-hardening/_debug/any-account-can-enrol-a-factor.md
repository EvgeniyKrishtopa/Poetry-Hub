# Any account can enrol a second factor and block its own password recovery

- Change: `pre-deploy-security-hardening`
- Called from: `code-review` (deep review, DR-02)
- First seen: 2026-11-28
- Limit in force: `maxFixAttempts: 2`

## Failure

Auth lets any signed-in account enrol a factor; with a verified factor, a password change below `aal2` is
refused, and the app gives a regular user no way to reach `aal2`.

## Reproduce

`POST /auth/v1/factors` with a reader's access token and the publishable key.

## Attempt 1 — 2026-11-28

- Isolated to: nothing below the app limits who may hold a row in `auth.mfa_factors`.
- Hypothesis: the app only hides the screen; Auth itself has no per-account rule.
- Expected effect: the same request fails and stores no factor; an admin still enrols.
- What actually happened: on the local stack the request answers 500 and stores nothing (Auth logs «only an admin
  can have a second factor», 42501); pgTAP shows the admin's row is accepted.
- Verdict: matched

## Outcome

- Fixed on attempt 1 of 2 (owner chose a database rule over a hosted setting)
- Spec case: 3 no criterion covered
- Criterion touched: `FR-9`
