## MODIFIED Requirements

### Requirement: Collections section on the author page (FR-2)
On `/authors/<id>` for a public author with at least one visible collection, below the profile (after the about section, or after the photo when there is no about) and before the «Произведения» section, the page SHALL show a section with the level-2 heading «Сборники произведений» and a list with one item per visible collection, in the author's order (drag-and-drop-ordering FR-5; a collection never ordered by its author keeps the order it was created in, newest first). Each item SHALL show the collection's title as a link to `/authors/<id>/collections/<collectionId>`, and under it a nested list of the collection's poems in the author's order (drag-and-drop-ordering FR-2, FR-3), each only its title as a link to `/authors/<id>/poems/<poemId>`. No description, date, or count SHALL be shown in the section. With no visible collection, the section SHALL NOT be rendered. The section SHALL keep the look of the author's own board on `/account/poems` (the same list, spacing, and link style), without drag handles.

#### Scenario: Collections with their poems
- **GIVEN** a public author whose collections are ordered «Весна» then «Осенний цикл», «Весна» holding «Первый снег», and «Осенний цикл» holding «Осенний сад» then «Ночной вокзал» in the author's order
- **WHEN** a guest opens `/authors/<id>`
- **THEN** a level-2 heading «Сборники произведений» is followed by «Весна» with «Первый снег» under it, then «Осенний цикл» with «Осенний сад», «Ночной вокзал» under it, in that order
- **AND** «Весна» links to `/authors/<id>/collections/<its id>`, and «Ночной вокзал» links to `/authors/<id>/poems/<its id>`

#### Scenario: No visible collection
- **GIVEN** a public author with free poems and only empty collections
- **WHEN** a guest opens `/authors/<id>`
- **THEN** no «Сборники произведений» heading or list exists, and the «Произведения» section lists the free poems

#### Scenario: Following a collection title
- **GIVEN** a guest on `/authors/<id>` with a visible collection
- **WHEN** they activate the collection's title
- **THEN** the collection's public page opens

#### Scenario: The author's order beats the creation date
- **GIVEN** a public author who dragged the older collection «Осенний цикл» above the newer «Весна»
- **WHEN** a guest opens `/authors/<id>`
- **THEN** «Осенний цикл» is listed before «Весна»

### Requirement: Public collection page (FR-5)
`/authors/<id>/collections/<collectionId>` for a visible collection of that author SHALL show the collection's title as the level-1 heading; its description, when it has one, split into paragraphs on blank lines with a single line break inside a paragraph shown as a line break; then the level-2 heading «Произведения» and a list of the collection's poems in the author's order (drag-and-drop-ordering FR-2, FR-3), each only its title as a link to `/authors/<id>/poems/<poemId>`. The page SHALL show no button and no link to the account pages. An author id that is unknown, malformed, or not public, and a collection id that is unknown, malformed, not lowercase, another author's, or of an empty collection, SHALL render the 404 page. A failed read of the author or the collection SHALL show the generic error screen. While loading, the page SHALL show a skeleton. `/authors/<id>/collections` SHALL render the 404 page.

#### Scenario: Visible collection
- **GIVEN** a public author's collection «Осенний цикл» with the description «Стихи октября\nи ноября\n\nБез посвящений», whose poems the author ordered «Осенний сад», «Ночной вокзал»
- **WHEN** a guest opens its public page
- **THEN** the level-1 heading «Осенний цикл» is followed by two paragraphs, the first on two lines «Стихи октября» / «и ноября», the second «Без посвящений»
- **AND** then the level-2 heading «Произведения» and the links «Осенний сад», «Ночной вокзал», in that order, each to `/authors/<id>/poems/<its id>`
- **AND** no «Редактировать сборник», «Произведения сборника», or «Удалить сборник» control exists

#### Scenario: No description
- **GIVEN** a visible collection stored without a description
- **WHEN** a guest opens its public page
- **THEN** the heading is followed directly by «Произведения» and the list, with no empty paragraph

#### Scenario: Another author's collection
- **GIVEN** public authors A and B, and a visible collection of B
- **WHEN** a guest opens `/authors/<A's id>/collections/<B's collection id>`
- **THEN** the 404 page renders

#### Scenario: Read fails
- **GIVEN** the database can't be reached
- **WHEN** a guest opens a collection's public page
- **THEN** the generic error screen is shown

#### Scenario: Following a poem
- **GIVEN** a guest on a visible collection's public page
- **WHEN** they activate a poem title
- **THEN** that poem's public page opens, unchanged by this change
