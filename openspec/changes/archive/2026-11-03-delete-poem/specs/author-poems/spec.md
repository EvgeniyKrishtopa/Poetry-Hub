## MODIFIED Requirements

### Requirement: One cached read per author (add-poem-creation NFR-4)
An author's poems SHALL be read through one cached entry per author, tagged with that author's poems tag, shared by the public author page, the public poem page, and the author's management pages. A successful read SHALL be kept for hours, a failed one for seconds only. Creating a poem and deleting a poem SHALL each expire that author's tag and no other (delete-poem FR-8).

#### Scenario: One entry serves both areas
- **GIVEN** an author's public page was just rendered from a fresh read
- **WHEN** the author opens `/account/poems` within the cache lifetime
- **THEN** no second database read of that author's poems happens

#### Scenario: Failure is short-lived
- **GIVEN** a poem read that failed because the database was unreachable, and the database is back
- **WHEN** the page is requested again after a few seconds
- **THEN** the poems are shown

#### Scenario: Public pages after a delete
- **GIVEN** a cached public author page listing «Первый снег» and its cached public poem page
- **WHEN** its author deletes «Первый снег» and a guest then opens `/authors/<id>` and the poem's URL
- **THEN** the «Произведения» list doesn't show «Первый снег», and the poem URL renders the 404 page
- **AND** another author's cached pages are not re-read
