# Spec Delta

## Purpose

Defines how the app's page routes are split into a `(public)` route group and an `(authorized)` route group, and what each group's layout may contain, so future routes land in the right group without changing URLs.

## ADDED Requirements

### Requirement: Home page in the public group (FR-7)
The home page SHALL be served from `src/app/(public)/page.tsx` at URL `/` with unchanged behavior (CMS greeting with static fallback, poems list, ISR with `revalidate = 60`), and no `src/app/page.tsx` SHALL remain.

#### Scenario: Build route list unchanged
- **GIVEN** the change is complete
- **WHEN** `npm run build` runs
- **THEN** its route list shows `/` as revalidated every 1m (ISR)
- **AND** the set of routes is identical to the build on `main` before the change

#### Scenario: Home page renders as before
- **GIVEN** the app is running
- **WHEN** a browser requests `/`
- **THEN** the home greeting heading and the poem list render as before the change

### Requirement: Pass-through group layouts (FR-8)
`src/app/(public)/layout.tsx` and `src/app/(authorized)/layout.tsx` SHALL render their `children` unchanged, with no wrapper element, data fetching, or auth logic, and `(authorized)/` SHALL contain no page.

#### Scenario: Layout adds no markup
- **GIVEN** either group layout
- **WHEN** it renders a child element
- **THEN** the output is exactly that child, with no added wrapper element
