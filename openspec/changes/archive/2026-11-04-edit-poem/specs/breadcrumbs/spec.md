## ADDED Requirements

### Requirement: Trail of the poem edit page (edit-poem FR-15)
`/account/poems/<poemId>/edit` SHALL show the trail «Главная» › «Мастерская поэта» › «Управление произведениями» › `<poem title>` › «Редактирование», where every item but the last is a link — the title to `/account/poems/<poemId>` — and «Редактирование» is the current item. The title SHALL come from the same read as the page itself; when the poem isn't the signed-in author's, or can't be read, no trail SHALL be shown.

#### Scenario: Own poem
- **GIVEN** a signed-in author with the poem «Первый снег»
- **WHEN** they open `/account/poems/<its id>/edit`
- **THEN** the trail reads «Главная» › «Мастерская поэта» › «Управление произведениями» › «Первый снег» › «Редактирование», and «Первый снег» links to `/account/poems/<its id>`

#### Scenario: Not the author's poem
- **GIVEN** a signed-in author and a poem id of another author
- **WHEN** they open `/account/poems/<that id>/edit`
- **THEN** no trail is shown
