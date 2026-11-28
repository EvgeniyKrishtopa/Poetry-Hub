# Two captcha rows of the test plan have no automated test

- Change: `pre-deploy-security-hardening`
- Called from: `code-review`
- First seen: 2026-11-28
- Limit in force: `maxFixAttempts: 2`

## Failure

CR-06: «FR-5 direct API call» and «FR-5 Google sign-in» promised tests; both were checked by hand only. These are two
findings with one cause and one fix, so they share this record.

## Reproduce

Search the tests for a password grant without a token, or a Google sign-in with captcha on: none.

## Attempt 1 — 2026-11-28

- Isolated to: `test-plan.md`; the project has no integration-test command, and Google sign-in cannot be automated
- Hypothesis: the plan named levels this project cannot run
- Expected effect: the rows say «manual», and the unchecked Google session refresh is in `docs/deferred.md`
- What actually happened: both rows reworded, the deferred entry added (owner's choice, 2026-11-28)
- Verdict: matched

## Outcome

- Fixed on attempt 1 of 2
- Spec case: skipped, because the requirements are unchanged; only how they are verified is recorded
