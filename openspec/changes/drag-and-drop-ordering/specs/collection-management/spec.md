## MODIFIED Requirements

### Requirement: Collection page (FR-6)
`/account/poems/collections/<collectionId>` SHALL show the collection's title as the level-1 heading, its description split into paragraphs on blank lines when it has one, a single line break inside a paragraph shown as a line break (spec-clarify, 2026-11-04); then, when the collection holds poems, the level-2 heading «Произведения» and a list of the collection's poems, in the author's order (drag-and-drop-ordering FR-9), each item only the title as a link to `/account/poems/<poemId>` (add-poems-to-collections FR-2); and below them, in one row, the link styled as a button «Редактировать сборник» (to `/account/poems/collections/<collectionId>/edit`), the button «Произведения сборника» (add-poems-to-collections FR-2, FR-3), and the danger button «Удалить сборник», in that order. «Произведения сборника» SHALL be shown exactly when the collection holds at least one poem or the author has at least one free poem (user decision, 2026-11-07); otherwise it SHALL not be rendered. With no poems in the collection, neither the «Произведения» heading nor the list SHALL be rendered. An id that isn't one of the signed-in author's collections — unknown, malformed, or another author's — or any collection while the own profile isn't public SHALL render the 404 page. A failed read of the collection or of its poems SHALL show the generic error screen. While loading, the page SHALL show a skeleton.

#### Scenario: Own collection
- **GIVEN** a signed-in author with the collection «Осенний цикл», description «Стихи октября», holding no poems, and no free poems
- **WHEN** they open its page
- **THEN** the heading «Осенний цикл», the paragraph «Стихи октября», «Редактировать сборник», and «Удалить сборник» are shown
- **AND** no «Произведения» heading and no «Произведения сборника» button exist

#### Scenario: Collection with poems
- **GIVEN** the collection «Осенний цикл» holds «Ночной вокзал» (created 2026-10-02) and «Осенний сад» (created 2026-10-01)
- **WHEN** its author opens its page
- **THEN** the heading «Произведения» and the links «Ночной вокзал», «Осенний сад», in the author's order for that collection, each to `/account/poems/<its id>`, are shown between the description and the button row
- **AND** the button row reads «Редактировать сборник», «Произведения сборника», «Удалить сборник»

#### Scenario: Empty collection, free poems exist
- **GIVEN** an empty collection and an author with one free poem
- **WHEN** they open the collection's page
- **THEN** «Произведения сборника» is shown and no «Произведения» heading exists

#### Scenario: Every poem in another collection
- **GIVEN** an empty collection «Весна» and an author whose every poem is in «Осенний цикл»
- **WHEN** they open «Весна»'s page
- **THEN** «Произведения сборника» is not rendered
- **AND** on «Осенний цикл»'s page it is shown

#### Scenario: Line breaks in the description
- **GIVEN** a description «Стихи октября\nи ноября\n\nБез посвящений»
- **WHEN** its author opens the collection page
- **THEN** two paragraphs are shown, the first on two lines «Стихи октября» / «и ноября», the second «Без посвящений»

#### Scenario: No description
- **GIVEN** a collection stored without a description, no poems in it, and no free poems
- **WHEN** its author opens its page
- **THEN** only the heading and the two buttons are shown, with no empty paragraph

#### Scenario: Another author's collection
- **GIVEN** a signed-in author and a collection id of another author
- **WHEN** they open `/account/poems/collections/<that id>`
- **THEN** the 404 page renders

#### Scenario: Read fails
- **GIVEN** the database can't be reached
- **WHEN** the author opens one of their collection pages
- **THEN** the generic error screen is shown

### Requirement: Collection poems page (add-poems-to-collections FR-4)
`/account/poems/collections/<collectionId>/poems` SHALL show the level-1 heading «Произведения сборника», then the hint «Отметьте произведения сборника «<title>». Произведение может входить только в один сборник.», then a group of checkboxes named «Произведения»: one checkbox per poem that is in this collection (checked) or free (unchecked), all in one list, newest first by the poem's creation time, each labelled by the poem's title. Poems in other collections SHALL NOT be listed. When the list would be empty, the page SHALL show «Нет свободных произведений для добавления в сборник.» and the link «Вернуться к сборнику» (to the collection page) instead of the group. An id that isn't one of the signed-in author's collections — unknown, malformed, or another author's — or any collection while the own profile isn't public SHALL render the 404 page. A failed read SHALL show the generic error screen. While loading, the page SHALL show the heading and a skeleton of the list.

The server SHALL place the poems of a save by position as well (drag-and-drop-ordering FR-10): the poems newly checked SHALL become the first poems of this collection, in the order of the checklist (newest created first, then id), and the poems newly unchecked SHALL become the first of the author's free poems, in the order they had in the collection; no other poem SHALL change its position. The checklist itself SHALL stay newest first by the poem's creation time, whatever the author's order (user decision, 2026-11-11: no dragging on this page).

#### Scenario: Collection and free poems
- **GIVEN** «Осенний цикл» holds «Ночной вокзал» (created 2026-10-02); the author's «Осенний сад» (2026-10-03) is free and «Весенний дождь» (2026-10-04) is in «Весна»
- **WHEN** they open «Осенний цикл»'s poems page
- **THEN** the heading «Произведения сборника», the hint naming «Осенний цикл», and two checkboxes in order «Осенний сад» (unchecked), «Ночной вокзал» (checked) are shown
- **AND** «Весенний дождь» is not listed, and no «Сохранить выбранное» button exists

#### Scenario: Nothing to manage
- **GIVEN** an empty collection and no free poems
- **WHEN** the author opens its poems page by address
- **THEN** «Нет свободных произведений для добавления в сборник.» and «Вернуться к сборнику» are shown, and no checkbox exists

#### Scenario: Another author's collection
- **GIVEN** a collection id of another author
- **WHEN** a signed-in author opens `/account/poems/collections/<that id>/poems`
- **THEN** the 404 page renders

#### Scenario: Read fails
- **GIVEN** the database can't be reached
- **WHEN** the author opens a collection poems page
- **THEN** the generic error screen is shown

#### Scenario: A poem added to a collection goes first
- **GIVEN** the collection «Осенний цикл» with «Осенний сад» then «Ночной вокзал», and the free poem «Первый снег»
- **WHEN** the author checks «Первый снег» and saves
- **THEN** the collection lists «Первый снег», «Осенний сад», «Ночной вокзал» on the collection page and on `/authors/<id>/collections/<its id>`

#### Scenario: A poem taken out goes first among the free poems
- **GIVEN** the collection «Осенний цикл» holding «Осенний сад», and the free poems «Первый снег» then «Ночные огни»
- **WHEN** the author unchecks «Осенний сад» and saves
- **THEN** the free poems are «Осенний сад», «Первый снег», «Ночные огни»
