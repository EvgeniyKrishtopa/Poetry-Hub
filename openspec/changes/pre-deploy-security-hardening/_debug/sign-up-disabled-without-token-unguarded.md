# No test notices the sign-up button enabled without a captcha token

- Change: `pre-deploy-security-hardening`
- Called from: `code-review`
- First seen: 2026-11-28
- Limit in force: `maxFixAttempts: 2`

## Failure

CR-07: removing `captchaToken === null` from `SignUpForm`'s button condition passes every test.

## Reproduce

Set the condition to `disabled={pending}` and run `npx vitest run src/features/auth/tests/components`: all 181 pass.

## Attempt 1 — 2026-11-28

- Isolated to: `SignUpForm.test.tsx` never asserts the disabled state without a token
- Hypothesis: the tests wait for the button to be enabled, never look before that
- Expected effect: a new test fails on the broken condition and passes on the real one
- What actually happened: it failed on the broken condition and passed once restored
- Verdict: matched

## Outcome

- Fixed on attempt 1 of 2
- Spec case: 1 regression (FR-5 already states the disabled control; the test now pins it)
