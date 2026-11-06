# No test pins the guard staying on after a «leave» answer

- Change: `add-poem-collections`
- Called from: `code-review`
- First seen: 2026-11-06
- Limit in force: `maxFixAttempts: 2`

## Failure

Gate 5 CONFIRMED CR-06: test-plan.md row 90 (FR-12, from auth's edit-poem FR-13: "Confirmed, sign-out
fails: dialog closed, failure shown, still signed in, changes kept") names the test "`EditCollectionForm`
test: guard stays active after `leave`". No test asserts it: the `leave` case in
`EditCollectionForm.leave-guard.test.tsx` only checks the answer and that the dialog closed.

## Reproduce

Twice, the same result: `grep -rn "stays active\|still blocks" src/features/collection-management/tests`
finds nothing, and the only `leave` test (`answers leave on «Выйти без сохранения» and closes the dialog`)
makes no assertion after the answer about link blocking or the registered sign-out question.

## Attempt 1 — 2026-11-06

- Isolated to: `src/features/collection-management/tests/components/EditCollectionForm.leave-guard.test.tsx`
  (test gap only; the guard's `active` depends on the form's change state and `saved`, never on a
  sign-out answer, so the behaviour itself should already hold).
- Hypothesis: the test-plan row was never turned into a test when the poem guard tests were repeated.
- Expected effect: a new test that answers the sign-out question `leave` while the form is changed, then
  clicks a disallowed link and asks the sign-out question again, passes: the link is blocked, the link
  form opens, and the question is answered by the dialog again (the guard is still registered). The
  rest of the file stays green.
- What actually happened: added `keeps guarding after a leave answer: links stay blocked and the next
  sign-out asks again`; the file runs 18/18 green, the new test included.
- Verdict: matched

## Outcome

- Fixed on attempt 1 of 2
- Spec case: 1 — the criterion exists (FR-12, by reference to auth's edit-poem FR-13) and the behaviour
  already held; the gap was the missing test, which now pins this scenario. The spec is not touched.
