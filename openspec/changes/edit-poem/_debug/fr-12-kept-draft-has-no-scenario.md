# FR-12's kept draft has no end-to-end scenario

- Change: `edit-poem`
- Called from: `code-review`
- First seen: 2026-11-04
- Limit in force: `maxFixAttempts: 2`

## Failure

Gate 5 CR-06 (CONFIRMED): `test-plan.md` rows 55-57 assign FR-12 (the draft kept between the poem
page and the edit page) to three end-to-end checks — a round trip by link, by Back and Forward,
and a reload starting fresh — and no file under `tests/web-qa-scenarios` covers them. Gate 3
checked FR-12 by hand only, and recording it was never put to the human.

## Reproduce

`grep -rl "FR-12" tests/web-qa-scenarios` finds nothing; the requirement-ID prefilter reports
FR-12 as uncovered.

## Attempt 1 — 2026-11-04

- Isolated to: `tests/web-qa-scenarios` (no app code: design D11 says FR-12 needs none, the route's
  `Activity` keeps the form's state).
- Hypothesis: the gap is a missing scenario, not a defect; a scenario walking the three rows will
  pass against the current code.
- Expected effect: a new `edit-poem-kept-draft.spec.ts` tagged `@edit-poem` with an
  `implements FR-12 of edit-poem` marker passes three runs in a row, and the prefilter no longer
  lists FR-12.
- What actually happened: the scenario passed 3 of 3 runs (link round trip, Back/Forward, confirmed
  reload showing the stored title); the prefilter's grep finds the marker in it.
- Verdict: matched

## Outcome

- Fixed on attempt 1 of 2 (commit `604eb02`)
- Spec case: 1 — FR-12's criteria already state the behaviour; the gap was the missing test, which
  now pins all three rows. The spec is not touched.
- Criterion touched: `FR-12` (test only)
