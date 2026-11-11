## ADDED Requirements

### Requirement: Trail of the public collection page (public-collections FR-6)
`/authors/<id>/collections/<collectionId>` SHALL show the trail «Главная» › «Наши авторы» › `<author name>` › `<collection title>`, with «Главная» linking to `/`, «Наши авторы» to `/authors`, the author's name to `/authors/<id>`, and the collection's title as the current item (not a link, `aria-current="page"`). The author's item SHALL follow FR-4's rules for the author name: «Автор» when the author read is unavailable, and no trail when the author doesn't exist or isn't public. When the collection isn't a visible collection of that author (unknown, malformed, another author's, or empty), no trail SHALL be shown. When the collection can't be read because the service is unavailable, the trail SHALL end at the author's item as the current item, matching the error screen. `/authors/<id>/collections` SHALL get no trail.

#### Scenario: Collection trail
- **GIVEN** a public author «Анна Ахматова» with id `<id>` and her non-empty collection «Осенний цикл» with id `<collectionId>`
- **WHEN** a visitor opens `/authors/<id>/collections/<collectionId>`
- **THEN** the trail items read, in order, «Главная», «Наши авторы», «Анна Ахматова», «Осенний цикл»
- **AND** «Анна Ахматова» links to `/authors/<id>`, and «Осенний цикл» is not a link and has `aria-current="page"`

#### Scenario: Hidden or unknown collection
- **GIVEN** a public author `<id>` and a collection id that is unknown, another author's, or an empty collection of hers
- **WHEN** a visitor opens `/authors/<id>/collections/<that id>`
- **THEN** the 404 page renders and no trail is shown

#### Scenario: Author read unavailable
- **GIVEN** the author service can't be reached, and `<collectionId>` is a non-empty collection of that author
- **WHEN** a visitor opens `/authors/<id>/collections/<collectionId>`
- **THEN** the page shows the error screen, and the trail items read «Главная», «Наши авторы», «Автор», with «Автор» not a link and carrying `aria-current="page"`

#### Scenario: Collection read unavailable
- **GIVEN** a public author «Анна Ахматова» with id `<id>`, and a collection read that fails because the database is unreachable
- **WHEN** a visitor opens `/authors/<id>/collections/<collectionId>`
- **THEN** the page shows the error screen, and the trail items read «Главная», «Наши авторы», «Анна Ахматова», with «Анна Ахматова» not a link and carrying `aria-current="page"`

#### Scenario: Collections segment alone
- **GIVEN** a public author with id `<id>`
- **WHEN** a visitor opens `/authors/<id>/collections`
- **THEN** the 404 page renders and no trail is shown
