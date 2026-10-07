# Test plan

One row per acceptance criterion in `proposal.md`. Levels: **unit** (a pure function or a
component rendered with Testing Library, collaborators mocked), **end-to-end** (a real browser
against the running app, Gate 3). Rows marked **static check** are verified by a command in
the task list, not by a test; see the note at the end.

| Requirement | Tests | Level |
| --- | --- | --- |
| FR-1 — `text-danger` / `text-success` compute to the token value in the active theme (light `#dc2626` / `#15803d`, dark `#f87171` / `#4ade80`) | Gate 3: `getComputedStyle` on a field error's `color` and an alert's `border-left-color`, under light and dark colour-scheme emulation (task 3.2) | end-to-end |
| FR-2 — invalid `AuthField`: error paragraph `text-danger` with unchanged text; input `aria-invalid="true"`, `aria-invalid:border-danger` and `aria-invalid:focus:border-danger`, `aria-describedby` to the error | Sign-in/sign-up form tests: after a validation failure, the field's error paragraph has `text-danger` and the expected text, and the input carries the ARIA wiring and the two danger border utilities (task 2.1) | unit |
| FR-3 (danger) — `<Alert tone="danger">Boom</Alert>` renders one `role="alert"` with "Boom" and the danger border utility | `Alert.test.tsx`: render the danger tone; exactly one `role="alert"`, text "Boom", and `border-l-4`, `border-danger`, `bg-surface`, `text-foreground` (task 1.2) | unit |
| FR-3 (success) — `<Alert tone="success">Done</Alert>` renders one `role="status"` with "Done" and the success border utility | `Alert.test.tsx`: render the success tone; exactly one `role="status"`, text "Done", and `border-l-4`, `border-success`; plus `className="flex flex-col gap-2"` is appended (task 1.2) | unit |
| FR-4 (sign-in) — `invalid-credentials` shows "Incorrect email or password." inside the danger `Alert` | `SignInForm.test.tsx`: mocked `signInAction` returns `invalid-credentials`; the `role="alert"` element reads the text and has `border-danger` (task 2.2) | unit |
| FR-4 (sign-up) — a sign-up failure shows its message inside the danger `Alert` | `SignUpForm.test.tsx`: mocked `signUpAction` returns `rate-limited`; the `role="alert"` element reads "Too many attempts. Try again in a few minutes." and has `border-danger` (task 2.2) | unit |
| FR-4 (poems) — a poems query error shows "Could not load poems." inside the danger `Alert` | `PoemList.test.tsx`: the poems query in its error state; the `role="alert"` element reads the text and has `border-danger` (task 2.4) | unit |
| FR-5 — a sign-out failure shows "Couldn't sign out. Try again." in an inline `role="alert"` with `text-danger` | `AuthStatus.test.tsx`: mocked `signOutAction` returns `{ ok: false }`; the alert reads the text and has `text-danger`, and the existing "stays signed in" assertions still pass (task 2.3) | unit |
| FR-6 — `check-email` shows a success `Alert` (`role="status"`) with "Check your email" and the address | `SignUpForm.test.tsx`: mocked `signUpAction` returns `check-email`; the `role="status"` element has `border-success` and contains the heading and the address (task 2.2) | unit |
| FR-7 — `docs/design-system.md` holds the danger/success values and names, lists `Alert`, and its `Commit` line is the last implementation commit | Static check after re-running `design-system` (task 3.1) | static check |
| NFR-1 — every listed contrast pair meets its threshold | `feedback-contrast.test.ts`: parse the token values from `globals.css`, compute WCAG ratios, assert ≥ 4.5 for text pairs and ≥ 3 for borders (task 1.3) | unit |
| NFR-2 — no colour literals in production source outside `globals.css` | Literal search over `src/` excluding `globals.css` and `tests/` (task 2.5) | static check |
| NFR-3 — pre-existing behavioural assertions (texts, roles, ARIA) pass | The full existing suite in `npm run test:coverage` (task 2.5) | unit |
| NFR-4 — the build route table equals `main`'s | `npm run build` route table compared with `main` (task 2.5) | static check |

**Coverage:** 14 rows for all 14 acceptance criteria (FR-1 to FR-7, NFR-1 to NFR-4; FR-3 has
two and FR-4 has three).

**Static-check rows (FR-7, NFR-2, NFR-4)** don't fit the unit / integration / end-to-end levels:
- FR-7 checks a generated document;
- NFR-2 checks the source text;
- NFR-4 checks the build output.

Each is closed by an explicit verification command in its task, the same way the earlier
changes closed their build and grep checks. No automated test is planned for them on purpose.
