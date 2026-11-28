# No test covers a signed-out request for /admin/verify

- Change: `pre-deploy-security-hardening`
- Called from: `code-review`
- First seen: 2026-11-28
- Limit in force: `maxFixAttempts: 2`

## Failure

CR-06: FR-8 says a signed-out request goes to `/login`; only the actions are tested for it.

## Reproduce

Search `AdminVerifyPage.test.tsx` for a rejected `requireSession`: there is none.

## Attempt 1 — 2026-11-28

- Isolated to: `src/features/admin/tests/pages/AdminVerifyPage.test.tsx`.
- Hypothesis: the page's tests always resolve `requireSession`.
- Expected effect: a new case proves the redirect propagates and nothing else is read.
- What actually happened: the new case passes; the redirect propagates and neither read is made.
- Verdict: matched

## Outcome

- Fixed on attempt 1 of 2
- Spec case: 1 regression guard (FR-8)
