# Spec Delta

## MODIFIED Requirements

### Requirement: Pass-through group layouts (FR-8)
`src/app/(public)/layout.tsx` and `src/app/(authorized)/layout.tsx` SHALL render their `children` unchanged, with no wrapper element, data fetching, or auth logic. Pages in `(authorized)/` SHALL enforce a valid session themselves on the server (add-author-profiles NFR-2); the group layout SHALL NOT be the session check.

#### Scenario: Layout adds no markup
- **GIVEN** either group layout
- **WHEN** it renders a child element
- **THEN** the output is exactly that child, with no added wrapper element

#### Scenario: Authorized pages check the session themselves
- **GIVEN** a request with no valid session
- **WHEN** it requests any page under `(authorized)/` (`/account`, `/account/author`)
- **THEN** the browser ends up on `/login` and no page content of the requested page is rendered
- **AND** `src/app/(authorized)/layout.tsx` contains no session read
