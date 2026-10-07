# UI plan

Component and state names come from `docs/design-system.md` (commit `7176572`). There are no
mockups for this change: the user chose the Tailwind palette values directly, so every row's
value source is "described" (proposal FR-1, design D1–D5).

| Screen | States | Components | Value source |
| --- | --- | --- | --- |
| `/login`: sign-in form | error (field error under an input; form-level error); empty (initial form) | `AuthField` (error → `text-danger`, invalid border `danger`, also while focused); `Button`; **new: `Alert`** (danger tone for the form-level error; shared feedback box, replaces the ad-hoc alert paragraph) | described |
| `/signup`: sign-up form | error (field error; form-level error); empty (initial form); success: check-email | `AuthField`; `Button`; **new: `Alert`** (danger for the form error, success for check-email, whose paragraph drops `text-muted` for `foreground`) | described |
| Header (root layout): `AuthStatus` | loading (empty placeholder while the session is pending); error (inline sign-out failure) | `Button` (ghost, "Sign out"); inline `role="alert"` text in `text-danger`, not an `Alert` (a box would break the header row, D4) | described |
| `/` home: poem list | loading ("Loading poems…"); error (load failure); empty ("No poems match your search.") | `PoemCard`; **new: `Alert`** (danger tone for the load error, replacing the unstyled alert paragraph) | described |

`Alert` is the single new component (`src/shared/ui/Alert/Alert.tsx`, design D2). It is new on
three screens because it is one shared primitive, not three components.

## Coverage of acceptance criteria with a visible outcome

| Criterion | Screen row(s) |
| --- | --- |
| FR-1 (token colours in each theme) | `/login`, `/signup`, header, `/` |
| FR-2 (danger field error and border, kept while focused) | `/login`, `/signup` |
| FR-3 (`Alert` danger / success) | `/login`, `/signup`, `/` |
| FR-4 (form and list errors in the danger `Alert`) | `/login`, `/signup`, `/` |
| FR-5 (inline sign-out failure in danger) | header |
| FR-6 (check-email in the success `Alert`) | `/signup` |
| NFR-1 (contrast) | all four rows |

FR-7, NFR-2, NFR-3, and NFR-4 have no human-visible outcome (a document, source text, existing
tests, the build table), so they map to no screen. No gaps.
