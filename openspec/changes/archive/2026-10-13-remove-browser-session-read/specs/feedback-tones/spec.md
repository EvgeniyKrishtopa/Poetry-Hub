## MODIFIED Requirements

### Requirement: Behaviour unchanged (NFR-3)
The feedback messages this capability covers (FR-2 to FR-6: field errors, form and list alerts,
the sign-out failure, and the check-email state) SHALL keep their texts, ARIA roles, tone
utilities, and `aria-invalid` / `aria-describedby` wiring, and their existing assertions SHALL
keep passing. When a later change moves one of these messages into a different component (the
header's sign-out failure, moved into the sign-out button by `remove-browser-session-read`), its
assertions SHALL move with it unchanged in text, role, and tone utility. Assertions on anything
else (for example, what the header shows besides these messages) are outside this requirement.

#### Scenario: Existing tests
- **GIVEN** the change is complete
- **WHEN** `npm run test:coverage` runs
- **THEN** every pre-existing assertion on the FR-2 to FR-6 messages' texts, roles, and ARIA
  wiring passes without being edited, except assertions that moved with their message (next
  scenario)

#### Scenario: Assertions moved with their message
- **GIVEN** `remove-browser-session-read` moved the sign-out failure into the sign-out button
- **WHEN** `npm run test:coverage` runs
- **THEN** a test still asserts a `role="alert"` paragraph with `text-danger` reading "Couldn't
  sign out. Try again.", and every other pre-existing assertion on the FR-2 to FR-6 messages
  passes without being edited

### Requirement: Rendering modes unchanged (NFR-4)
`npm run build` SHALL report the same route table as `main`. Since `remove-browser-session-read`,
the expected rendering modes are the ones the `auth` capability's "Rendering modes with a
session-aware header (NFR-2)" requirement states; this capability adds no rendering-mode rule of
its own.

#### Scenario: Build route table
- **GIVEN** the change is complete
- **WHEN** `npm run build` runs
- **THEN** every route has the mode `auth` NFR-2 states: `/`, `/login`, `/signup`, and
  `/_not-found` partially prerendered, `/api/revalidate` and `/auth/confirm` dynamic, and `/`
  with Revalidate 1m and Expire 1h
