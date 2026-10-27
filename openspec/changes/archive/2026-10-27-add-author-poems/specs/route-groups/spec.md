## MODIFIED Requirements

### Requirement: Home page in the public group (FR-7)
The home page SHALL be served from `src/app/(public)/page.tsx` at URL `/`. Its behavior SHALL be: the CMS greeting with its static fallback, drawn as a welcome banner (add-author-poems FR-9), and a cached render that revalidates every 60 seconds. Since migrate-to-cache-components, the cached render is a `"use cache"` page body with `cacheLife("minutes")` and `cacheTag("contentful")`, replacing the former `revalidate = 60` segment export. No `src/app/page.tsx` SHALL remain.

#### Scenario: Build route list unchanged
- **GIVEN** the change is complete
- **WHEN** `npm run build` runs
- **THEN** its route list shows `/` with a revalidation interval of 1m

#### Scenario: Home page renders as before
- **GIVEN** the app is running
- **WHEN** a browser requests `/`
- **THEN** the home greeting heading renders, now inside the welcome banner (add-author-poems FR-9)
- **AND** no poem list renders
