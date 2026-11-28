# No test fails when the second factor wrappers swallow a redirect

- Change: `pre-deploy-security-hardening`
- Called from: `code-review`
- First seen: 2026-11-28
- Limit in force: `maxFixAttempts: 2`

## Failure

CR-07: the redirect-rethrow branch of `submit-totp-code.ts` and `start-enrolment.ts` is never executed by a
test, and neither is `start-enrolment.ts`'s fallback for a masked server error.

## Reproduce

Replace `throw error` in either wrapper with `return UNAVAILABLE` and run the component tests: they pass.

## Attempt 1 — 2026-11-28

- Isolated to: no direct test of either wrapper.
- Hypothesis: the component tests only reject with a `TypeError`.
- Expected effect: with `throw error` replaced, the new tests fail; restored, they pass.
- What actually happened: with `throw error` replaced in `submit-totp-code.ts` the new test failed; restored,
  `totp-wrappers.test.ts` passes.
- Verdict: matched

## Outcome

- Fixed on attempt 1 of 2
- Spec case: 1 regression guard (FR-7, FR-8 behaviour was right; a test now pins it)
