# route-groups Specification

## Purpose
Defines how the app's page routes are split into a `(public)` route group and an `(authorized)` route group, and what each group's layout may contain, so future routes land in the right group without changing URLs.
## Requirements
### Requirement: Home page in the public group (FR-7)
The home page SHALL be served from `src/app/(public)/page.tsx` at URL `/`. Its behavior SHALL be: the CMS greeting with its static fallback, the poems list, and a cached render that revalidates every 60 seconds. Since migrate-to-cache-components, the cached render is a `"use cache"` page body with `cacheLife("minutes")` and `cacheTag("contentful")`, replacing the former `revalidate = 60` segment export. No `src/app/page.tsx` SHALL remain.

#### Scenario: Build route list unchanged
- **GIVEN** the change is complete
- **WHEN** `npm run build` runs
- **THEN** its route list shows `/` with a revalidation interval of 1m
- **AND** the set of route paths is identical to the build on `main` before the change; render-mode markers and the Revalidate/Expire columns of other routes may differ under Cache Components

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

### Requirement: No route segment cache config (migrate-to-cache-components FR-1)
With `cacheComponents` enabled, no route segment SHALL export `revalidate`, `dynamic`, `fetchCache`, or `dynamicParams`. Route caching SHALL be expressed with `"use cache"` and `cacheLife`, and the production build SHALL succeed.

#### Scenario: Build succeeds without segment config
- **GIVEN** `next.config.ts` sets `cacheComponents: true` and `reactCompiler: true`
- **WHEN** `npm run build` runs
- **THEN** it exits 0
- **AND** no file under `src/app` exports `revalidate`, `dynamic`, `fetchCache`, or `dynamicParams`

