# No test notices the recovery offer enabled without a captcha token

- Change: `pre-deploy-security-hardening`
- Called from: `code-review`
- First seen: 2026-11-28
- Limit in force: `maxFixAttempts: 2`

## Failure

CR-07: removing `!captchaReady` from `RecoveryOffer`'s button condition passes every test.

## Reproduce

Set the condition to `busy || !isOnline` and run `npx vitest run src/features/auth/tests/components`: all 181 pass.

## Attempt 1 — 2026-11-28

- Isolated to: every disabled assertion in `SignInForm.recovery.test.tsx` is explained by pending or offline
- Hypothesis: no case holds an online, idle offer with no token
- Expected effect: a new test (token expired, online, idle) fails on the broken condition
- What actually happened: it failed on the broken condition and passed once restored
- Verdict: matched

## Outcome

- Fixed on attempt 1 of 2
- Spec case: 1 regression (FR-5 already states it; the test now pins it)
