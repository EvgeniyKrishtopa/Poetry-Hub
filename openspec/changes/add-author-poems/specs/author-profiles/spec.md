## REMOVED Requirements

### Requirement: Brief caching of failed public reads (NFR-7)
**Reason**: Caching an unavailable result, even for seconds, lets a failed refresh replace a good cached entry, so a short outage shows visitors an error instead of the last good profile (user request, 2026-10-24, add-author-poems).
**Migration**: Replaced by "Failed public reads are never cached (NFR-7)": not-found and success keep their lifetimes, unavailable is no longer stored, and a failed refresh keeps the stale entry. The "Unavailable heals" scenario moves there.

## ADDED Requirements

### Requirement: Failed public reads are never cached (NFR-7)
A public author read (the directory list, or one author) SHALL cache a successful result for hours and a not-found result for minutes, and SHALL never store an unavailable result (add-author-poems FR-14, FR-15). With no cache entry, a failure SHALL reach the page as unavailable at request time only, never frozen into a prerendered page, and the next request SHALL read again. When a cached entry is stale and its refresh fails, the stale entry SHALL be kept and served until a refresh succeeds or the entry's lifetime expires; this applies to any stored entry, a not-found one included.

#### Scenario: Unavailable heals
- **GIVEN** `/authors` rendered "Список авторов сейчас недоступен." because the database was down and nothing was cached
- **WHEN** the database is back and the page is requested again
- **THEN** it lists the public authors without any edit or deploy, and without waiting for a cache lifetime

#### Scenario: Failed refresh keeps the last good data
- **GIVEN** `/authors/<id>` was cached showing «Анна Ахматова», and the entry has gone stale
- **WHEN** the page is requested while the database is down
- **THEN** the page still shows «Анна Ахматова» (and its trail her name), not the error screen
- **AND** a later request after the database is back refreshes the entry

#### Scenario: Stale not-found is kept
- **GIVEN** `/authors/<id>` was cached as not-found, and the entry has gone stale
- **WHEN** the page is requested while the database is down
- **THEN** the 404 page renders, not the error screen

#### Scenario: Failure is not stored
- **GIVEN** no cache entry for an author, and the database is down
- **WHEN** two requests for `/authors/<id>` arrive one after the other
- **THEN** each request reads the database again, and each shows the error screen while it is down

#### Scenario: Build without a database
- **GIVEN** no Supabase environment variables are set
- **WHEN** `npm run build` runs
- **THEN** it exits 0, and `/authors` is not prerendered with the unavailable message: the list renders at request time
