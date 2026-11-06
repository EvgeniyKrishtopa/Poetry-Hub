## ADDED Requirements

### Requirement: Trails of the collection pages (add-poem-collections FR-17)
`/account/poems/collections/new` SHALL show the trail «Главная» › «Мастерская поэта» › «Управление произведениями» › «Создание сборника». `/account/poems/collections/<collectionId>` SHALL show «Главная» › «Мастерская поэта» › «Управление произведениями» › `<collection title>`, and its edit page «Главная» › «Мастерская поэта» › «Управление произведениями» › `<collection title>` › «Редактирование», where the title links to the collection page. Every item but the last SHALL be a link, and the last the current item. The title SHALL come from the same read as the page itself; when the collection isn't the signed-in author's, or can't be read, no trail SHALL be shown.

#### Scenario: Create page
- **GIVEN** a signed-in author
- **WHEN** they open `/account/poems/collections/new`
- **THEN** the trail reads «Главная» › «Мастерская поэта» › «Управление произведениями» › «Создание сборника», and «Управление произведениями» links to `/account/poems`

#### Scenario: Own collection and its edit page
- **GIVEN** a signed-in author with the collection «Осенний цикл»
- **WHEN** they open its page, then its edit page
- **THEN** the trails read «… › «Управление произведениями» › «Осенний цикл»» and «… › «Осенний цикл» › «Редактирование»», and on the edit page «Осенний цикл» links to `/account/poems/collections/<its id>`

#### Scenario: Not the author's collection
- **GIVEN** a collection id of another author
- **WHEN** a signed-in author opens its page or edit page
- **THEN** no trail is shown
