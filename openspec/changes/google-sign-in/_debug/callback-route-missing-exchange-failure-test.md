# The callback route has no test for a failed code exchange

- Change: `google-sign-in`
- Called from: `code-review`
- First seen: 2026-11-24
- Limit in force: `maxFixAttempts: 2`

## Failure

Gate 5 CONFIRMED CR-06: test-plan row "FR-G4 · exchange fails" asks for a route test answering 303 to
`/login?error=google-failed` when the exchange returns an error that is not a block. The route tests in
`src/app/auth/callback/tests/route.test.ts` cover only a `user_banned` exchange error. Folded in: PLAUSIBLE CR-08
(the `user_banned` exchange test does not assert the 303 status) and CR-07 (no exchange-failure row in the
cache-header table).

## Reproduce

`grep -n "exchangeFails\|mockRejected" src/app/auth/callback/tests/route.test.ts`: the only call is
`exchangeFails("user_banned")`, and no test makes the exchange throw. Reproduced twice (the file is static).

## Attempt 1 — 2026-11-24

- Isolated to: `src/app/auth/callback/tests/route.test.ts`; the route code is not at fault (Gate 4 and the deep review were clean).
- Hypothesis: the tests for task 3.1 covered the callback's own refusal parameters but skipped the exchange's non-block error and its thrown path.
- Expected effect: new route tests, one where the exchange returns a non-block error code and one where it throws, each answer 303 to `/login?error=google-failed` with `private, no-store` and pass against the current route without any change to `route.ts`; the `user_banned` exchange test also asserts 303.
- What actually happened: two new route tests (a non-block exchange error, a thrown exchange), a 303 assertion on the `user_banned` exchange test and one new cache-header row; the file runs 20 tests, all pass, `route.ts` unchanged.
- Verdict: matched

## Outcome

- Fixed on attempt 1 of 2
- Spec case: 1 regression. FR-G4's scenario already states that a failed exchange gives the failed notice; the behaviour was correct and only the route-level test was missing, now pinned. The spec is not touched.
