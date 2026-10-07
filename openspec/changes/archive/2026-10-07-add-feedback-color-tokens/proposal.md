# Proposal

## Why

`docs/design-system.md` (extracted 2026-10-07) records that the app has no `danger` or
`success` colour. Errors reuse `accent`, the same violet as links and the primary button,
and they appear in three different styles:
- `AuthField` errors in `text-accent`;
- form alerts on a neutral `bg-surface`;
- `PoemList` with an unstyled `role="alert"`.

Success ("Check your email") has no visual tone at all. A reader can't tell an error from a
link, and every new screen has to guess how to show feedback. This change adds the two roles
and gives errors and success one consistent look before the next UI work (poems, Claude Design
mockups) builds on top.

## What Changes

- Two new design tokens, `danger` and `success`, with light and dark values, exposed as
  Tailwind colours.
- A shared `Alert` primitive in `src/shared/ui` with a `danger` and a `success` tone.
- Every error and success message in the app moves to the new tokens:
  - field errors and invalid borders in `AuthField`;
  - form-level alerts in the sign-in and sign-up forms;
  - the poems load error;
  - the header's sign-out failure;
  - the sign-up "Check your email" state.
- `docs/design-system.md` is refreshed from the code once the change is in.

Message texts, roles, and behaviour stay exactly as they are.

**Mockups.** None. The user chose the Tailwind palette values directly (2026-10-07), so the
Claude Design brief step in `CLAUDE.md` is skipped for this change on purpose.

## Requirements

- **FR-1** — Tokens: `--danger` and `--success` are defined in `src/app/globals.css` for the
  light and dark themes, and mapped in `@theme` to `--color-danger` and `--color-success`, so
  `text-danger`, `border-danger`, `text-success`, and `border-success` work.
  - Light: danger `#dc2626`, success `#15803d`.
  - Dark: danger `#f87171`, success `#4ade80`.
- **FR-2** — `AuthField` shows its error text in `danger` and, when invalid, a `danger`
  border that stays `danger` while focused. A valid field keeps the `accent` focus border.
- **FR-3** — `Alert` in `src/shared/ui`, exported from `@/shared/ui`.
  - It takes `tone: "danger" | "success"` and `children`.
  - A `danger` alert renders `role="alert"`; a `success` alert renders `role="status"`.
  - Both have a 4px left border in the tone colour, the `surface` background, and body text
    in `foreground`.
  - It is a Server-Component-safe primitive: no `"use client"`, no hooks.
- **FR-4** — The form-level alerts of `SignInForm` and `SignUpForm`, and the load-error message
  of `PoemList`, render through `<Alert tone="danger">` with their current texts.
- **FR-5** — The header's sign-out failure ("Couldn't sign out. Try again.") stays an inline
  `role="alert"` text, coloured `danger`.
- **FR-6** — The sign-up check-email state renders through `<Alert tone="success">`, with its
  current heading ("Check your email") and text naming the address.
- **FR-7** — After implementation, re-run the `design-system` skill (extract from code) so
  `docs/design-system.md`:
  - fills the `danger` and `success` rows with their values and names;
  - lists `Alert` as a primitive;
  - sets its `Commit` line to the short hash of HEAD when the skill runs, i.e. the last commit
    with the implementation, made before the docs commit. The `Source` line stays
    `non-machine — skipped connecting a tool`.
- **NFR-1** — Contrast (WCAG 2.1 AA).
  - Every text coloured `danger` or `success` sits on `background` and reaches at least 4.5:1
    in both themes: danger 4.83 light / 7.16 dark; success 5.02 / 11.36.
  - Alert body text (`foreground` on `surface`) reaches at least 4.5:1: 16.31 / 15.13.
  - The alert's left border reaches at least 3:1 against `surface` (non-text): danger 4.39 /
    6.40; success 4.56 / 10.17.
  - No `danger` text is placed on `surface`; at 4.39:1 in the light theme it fails.
- **NFR-2** — No colour literals in production source outside `src/app/globals.css`.
  Components use token utilities only. Tests (`tests/` folders) may assert the FR-1 hex values.
- **NFR-3** — No behaviour change:
  - message texts, ARIA roles, and `aria-invalid`/`aria-describedby` wiring are unchanged;
  - existing tests keep passing, changed only where they assert a class that this change
    replaces.
- **NFR-4** — `npm run build` reports the same rendering mode for every route as on `main`
  (`/` static, 1m/1h).

## Acceptance Criteria

- **FR-1:** GIVEN the change is built, WHEN a component uses `text-danger` or `text-success`,
  THEN the computed colour is the token's value in the active theme (light `#dc2626` /
  `#15803d`, dark `#f87171` / `#4ade80`).
- **FR-2:** GIVEN `AuthField` with an `error`, WHEN it renders, THEN the error paragraph has
  `text-danger`, the input has `aria-invalid="true"` and the `aria-invalid:border-danger`
  utility, and the error text is unchanged.
- **FR-3:** GIVEN `<Alert tone="danger">Boom</Alert>`, WHEN it renders, THEN there is one
  `role="alert"` element with text "Boom" and the danger border utility. GIVEN
  `<Alert tone="success">Done</Alert>`, WHEN it renders, THEN there is one `role="status"`
  element with text "Done" and the success border utility.
- **FR-4:** GIVEN `signInAction` returns `invalid-credentials`, WHEN the form is submitted,
  THEN "Incorrect email or password." appears inside the `danger` `Alert`. GIVEN `signUpAction`
  returns a failure, WHEN the sign-up form is submitted, THEN its message appears inside the
  `danger` `Alert`. GIVEN the poems query errors, WHEN `PoemList` renders, THEN "Could not load
  poems." appears inside the `danger` `Alert`.
- **FR-5:** GIVEN `signOutAction` returns `{ ok: false }`, WHEN the reader clicks "Sign out",
  THEN "Couldn't sign out. Try again." appears in a `role="alert"` element with `text-danger`.
- **FR-6:** GIVEN `signUpAction` returns `check-email`, WHEN the form is submitted, THEN a
  `success` `Alert` (`role="status"`) shows "Check your email" and the address.
- **FR-7:** GIVEN the implementation is merged, WHEN `docs/design-system.md` is read, THEN its
  `danger` and `success` rows hold the FR-1 values and names, `Alert` appears in the primitives
  table, and its `Commit` line is the hash of the last implementation commit (HEAD when
  `design-system` ran).
- **NFR-1:** GIVEN the FR-1 values, WHEN contrast is computed with the WCAG formula, THEN every
  pair listed in NFR-1 meets its threshold.
- **NFR-2:** GIVEN the change is complete, WHEN production source in `src/` (excluding
  `globals.css` and every `tests/` folder) is searched for hex, `rgb(`, or `hsl(` literals and
  Tailwind arbitrary colour values, THEN there are no matches.
- **NFR-3:** GIVEN the change is complete, WHEN `npm run test:coverage` runs, THEN every
  pre-existing behavioural assertion (texts, roles, ARIA wiring) passes unchanged.
- **NFR-4:** GIVEN the change is complete, WHEN `npm run build` runs, THEN the route table
  equals `main`'s.

## Capabilities

### New Capabilities

- `feedback-tones`: the `danger` and `success` tokens and the `Alert` primitive, and where
  feedback must use them.

### Modified Capabilities

- None. `auth` behaviour (texts, roles, flows) is unchanged; only presentation moves to the
  new tokens.

## Out of Scope

- The other design-system discrepancies:
  - two input styles;
  - four link styles;
  - two page-heading scales;
  - no radius token;
  - three loading patterns;
  - offline handling.
- `RootError` and `NotFound` route screens (neutral by design).
- Icons in alerts.
- Toasts, dismissible alerts, or animation.
- A `warning` or `info` tone.

## Impact

- `src/app/globals.css` (tokens).
- `src/shared/ui/Alert/` (new) and `src/shared/ui/index.ts`.
- `src/features/auth/components/{AuthField,SignInForm,SignUpForm,AuthStatus}`.
- `src/features/poems/components/PoemList`.
- Their tests.
- `docs/design-system.md`.
- No dependencies, data, routes, or contracts change.

## Open Questions

None.
