# No test fails when the proxy refresh drops the cookie attributes

- Change: `pre-deploy-security-hardening`
- Called from: `code-review`
- First seen: 2026-11-27
- Limit in force: `maxFixAttempts: 2`

## Failure

CR-06: FR-1 "refresh by the proxy" is not verified. The session tests check only what is passed to `createServerClient`, not the attributes of the rewritten response cookies.

## Reproduce

Change `response.cookies.set(name, value, options)` to `response.cookies.set(name, value)` in `src/shared/lib/supabase/session.ts`, then run `npx vitest run src/shared/lib/supabase src/tests/proxy.test.ts`. All 112 tests pass, twice in a row.

## Attempt 1 — 2026-11-27

- Isolated to: `src/shared/lib/supabase/tests/session.test.ts`
- Hypothesis: no test reads the `Set-Cookie` header of a refreshed cookie.
- Expected effect: a test that refreshes with production options fails with the line above broken, and passes with it restored.
- What actually happened: with the line broken, exactly the new test failed (1 failed); restored, the session tests pass.
- Verdict: matched

## Outcome

- Fixed on attempt 1 of 2
- Spec case: 1 regression guard (the criterion existed; the code was correct, the test was missing)
