# Tasks

## 1. Tokens and the `Alert` primitive (`src/app/globals.css`, `src/shared/ui/`) <!-- isolated -->

- [x] 1.1 (FR-1, NFR-1, NFR-2) Add `--danger` and `--success` to `:root` and to the
  `prefers-color-scheme: dark` block in `src/app/globals.css` with the design D1 values, and map
  them in `@theme inline` as `--color-danger` and `--color-success`.
  - Verify `npm run build` compiles and the generated CSS contains the `text-danger` and
    `border-success` utilities once used.
- [x] 1.2 (FR-3, NFR-2) Implement `src/shared/ui/Alert/Alert.tsx` per design D2/D3 and export
  it from `src/shared/ui/index.ts`.
  - The tone-to-border map is a named constant. There are no hooks and no `"use client"`.
  - Verify with `src/shared/ui/tests/Alert.test.tsx`: the danger, success, and extra-class
    scenarios of FR-3 (role, text, and utilities).
- [x] 1.3 (NFR-1) Record the contrast check.
  - In `src/shared/ui/tests/feedback-contrast.test.ts`, add a test-local `contrastRatio(hexA,
    hexB)` with the WCAG formula. No production module: nothing in the app computes contrast.
  - Read the token values by parsing `src/app/globals.css` (`--name: #hex;` in `:root` and in
    the dark block), so the test fails if the CSS drifts.
    The test reads a file under `app/` from disk, not by import, so it doesn't break the
    "`shared/` never imports `app/`" rule. Say so in a comment at the top of the test
    (Gate 1 P1).
  - Assert every NFR-1 pair meets its threshold.
  - Verify `npm run test:coverage` passes.

## 2. Apply the tones (`src/features/auth`, `src/features/poems`) <!-- isolated -->

- [x] 2.1 (FR-2, NFR-3) `AuthField`: error text `text-accent` → `text-danger`, input
  `aria-invalid:border-accent` → `aria-invalid:border-danger`, plus
  `aria-invalid:focus:border-danger`; a valid field keeps `focus:border-accent`.
  - Verify with `AuthField`/form tests: the FR-2 scenario, with the existing ARIA assertions
    unchanged.
- [x] 2.2 (FR-4, FR-6, NFR-3) `SignInForm` and `SignUpForm`: the form error renders through
  `<Alert tone="danger">`, and the check-email state through
  `<Alert tone="success" className="flex flex-col gap-2">`, with texts unchanged.
  - Verify with `SignInForm.test.tsx` / `SignUpForm.test.tsx`: the FR-4 wrong-credentials and
    sign-up-failure scenarios, and the FR-6 scenario.
- [x] 2.3 (FR-5, NFR-3) `AuthStatus`: the sign-out failure paragraph `text-accent` →
  `text-danger`, still inline with `role="alert"`.
  - Verify with `AuthStatus.test.tsx`: the FR-5 scenario.
- [x] 2.4 (FR-4, NFR-3) `PoemList`: the load error renders through `<Alert tone="danger">` with
  "Could not load poems.".
  - Verify with `PoemList.test.tsx`: the FR-4 poems scenario, mocking the query into its
    error state.
- [x] 2.5 (NFR-2, NFR-3, NFR-4) Verify statically and run the chain.
  - The NFR-2 literal search prints nothing.
  - `npm run typecheck && npm run lint && npm run test:coverage && npm run build && npm run knip`
    all pass.
  - The build route table equals `main`'s.

## 3. Design-system record and browser check <!-- judgement-heavy -->

- [x] 3.1 (FR-7) Re-run the `design-system` skill (extract from code) and commit the refreshed
  `docs/design-system.md`.
  - Verify the FR-7 scenario: the danger and success rows, `Alert` in the primitives table, and
    the `Commit` line set to the last implementation commit (HEAD when the skill ran).
- [x] 3.2 (FR-1, FR-2, FR-4, FR-6, NFR-1) Gate 3 (`web-qa`) in both colour schemes
  (switched with Playwright's colour-scheme emulation):
  - FR-1: read `getComputedStyle` on a field error (`color`) and an alert's left border
    (`border-left-color`); they equal the FR-1 hex values in each scheme;
  - sign-in with a wrong password → danger alert;
  - sign-up with invalid input → danger field errors;
  - a sign-up success → success alert;
  - the sign-out failure (FR-5) and the poems load error (FR-4) are not reproducible through
    normal use, so they are covered by the component tests in 2.3 and 2.4 only. No test seams
    are added to production code. The browser checks the same `text-danger` and `Alert` classes
    on the reachable states above.
  - Confirm a valid focused field shows the accent border and an invalid focused field stays
    danger, and replay the recorded scenarios.
