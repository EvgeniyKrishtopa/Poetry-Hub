# Auth scenarios count the footer's contact form as a second form

- Change: `add-contact-form`
- Called from: `web-qa`
- First seen: 2026-10-23
- Limit in force: `maxFixAttempts: 2`

## Failure

Gate 3's replay of the recorded scenarios: `login-wrong-password.spec.ts:13` and
`signup-server-validation.spec.ts:8` fail on `expect(page.locator("form")).toHaveCount(1)` —
expected 1, received 2. The other 13 scenarios pass.

## Reproduce

Dev server running (`npm run dev`), then
`npx playwright test tests/web-qa-scenarios/login-wrong-password.spec.ts tests/web-qa-scenarios/signup-server-validation.spec.ts --repeat-each=2`:
4 of 4 runs fail the same way.

## Attempt 1 — 2026-10-23

- Isolated to: the two scenarios' page-wide `form` locator. In the served HTML of `/signup` and
  `/login`, `<main>` holds exactly one form and `<footer>` holds one more: the contact form
  inside the closed `<dialog>` that `ContactDialog` (task 3.2/3.3) renders on every page. Not an
  environment condition and not a doubled Suspense form: the auth form is still single.
- Hypothesis: the hydration guard (`toHaveCount(1)`) was written when the auth form was the only
  form on the page; the footer's contact form, added on purpose by this change (FR-1), now makes
  the page-wide count 2. The scenarios' selector is stale, the app is correct.
- Expected effect: scoping the guard to `page.getByRole("main").locator("form")` makes both
  scenarios pass, and the guard still fails if the auth form is ever doubled inside `main` (the
  Suspense case it exists to catch).
- What actually happened: the guard passes, but both scenarios now fail one line later:
  `getByLabel("Электронная почта")` resolves to two inputs in strict mode — the auth form's and
  the contact form's email field (inside the footer nav's closed dialog). 4 of 4 runs fail.
- Verdict: still failing

## Attempt 2 — 2026-10-23

- Reproduce changed to: same command; the failure moved from the form count to a strict-mode
  violation on the email label, which the contact form shares with the auth forms.
- Isolated to: every page-wide locator in the two scenarios that the contact form can also match
  (the email label; the guard from attempt 1).
- Hypothesis: same root cause as attempt 1, wider than the guard alone: the scenarios address the
  auth form through page-wide locators, and the footer's contact form now repeats one of its
  labels. The scenarios must address the auth form through `main`, the same scoping the recording
  rules already require for alerts.
- Expected effect: with every field, button and alert locator scoped to
  `page.getByRole("main")`, both scenarios pass 3 of 3 runs, and nothing in them can match the
  footer's dialog.
- What actually happened: both scenarios pass 3 of 3 runs each (6 passed, `--repeat-each=3`).
- Verdict: matched

## Outcome

- Fixed on attempt 2 of 2
- Spec case: 1 — the app behaves as FR-1 requires (the contact button and its dialog on every
  page); the regression was in two recorded scenarios this change broke without updating (task
  3.3 listed only the footer scenarios). The fixed scenarios themselves pin it; no spec edit.
- Lesson: a scenario that targets a form addresses it through `page.getByRole("main")`, never
  page-wide — the footer now carries a form on every page.
