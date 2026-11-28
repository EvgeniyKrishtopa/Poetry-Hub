# No boundary test keeps the Turnstile secret server-only

- Change: `pre-deploy-security-hardening`
- Called from: `code-review`
- First seen: 2026-11-28
- Limit in force: `maxFixAttempts: 2`

## Failure

CR-06: the test plan's NFR-3 row asks for a boundary test; none covered `shared/lib/turnstile/` or the secret's name.

## Reproduce

Search the tests for a scan of `src/shared/lib/turnstile`: none.

## Attempt 1 — 2026-11-28

- Isolated to: `shared/lib/turnstile/tests/` held only the client's behaviour tests
- Hypothesis: the email module's server-only test was not repeated for the new module
- Expected effect: a test that every module file starts with `server-only`, and that only the module names the secret
- What actually happened: `server-only.test.ts` added and passing
- Verdict: matched

## Outcome

- Fixed on attempt 1 of 2
- Spec case: 1 regression (NFR-3 already states it; the test now pins it)
