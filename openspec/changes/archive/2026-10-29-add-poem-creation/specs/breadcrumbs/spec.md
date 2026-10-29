## MODIFIED Requirements

### Requirement: Trail items per route (FR-2)
The trail SHALL list «Главная» first and then every level down to the current page: `/authors` → Главная › Наши авторы; `/authors/<id>` → Главная › Наши авторы › <author name>; `/authors/<id>/poems/<poemId>` → Главная › Наши авторы › <author name> › <poem title>; `/account` → Главная › Мастерская поэта; `/account/author` → Главная › Мастерская поэта › Профиль автора; `/account/poems` → Главная › Мастерская поэта › Управление произведениями; `/account/poems/new` → Главная › Мастерская поэта › Управление произведениями › Добавление нового произведения; `/account/poems/<poemId>` → Главная › Мастерская поэта › Управление произведениями › <poem title> (add-poem-creation FR-8); `/login` → Главная › Вход; `/signup` → Главная › Регистрация; `/about` → Главная › О проекте; `/privacy` → Главная › Политика конфиденциальности. On the poem page, «<author name>» links to `/authors/<id>`, and the trail holds no «Произведения» item (refine-author-page-and-contact FR-7). `/authors/<id>/poems` is not in the table: it gets no trail (FR-6).

#### Scenario: Two-level trail
- **GIVEN** any visitor
- **WHEN** they open `/login`
- **THEN** the trail items read, in order, «Главная», «Вход»

#### Scenario: Three-level trail in the account area
- **GIVEN** a signed-in reader
- **WHEN** they open `/account/author`
- **THEN** the trail items read, in order, «Главная», «Мастерская поэта», «Профиль автора»

#### Scenario: Poem management trails
- **GIVEN** a signed-in author with a public profile and their poem «Первый снег» with id `<poemId>`
- **WHEN** they open `/account/poems`, then `/account/poems/new`, then `/account/poems/<poemId>`
- **THEN** the trails read «Главная», «Мастерская поэта», «Управление произведениями»; then the same plus «Добавление нового произведения»; then the first three plus «Первый снег»
- **AND** «Мастерская поэта» links to `/account` and «Управление произведениями» links to `/account/poems` wherever it isn't the last item, and the last item is not a link and has `aria-current="page"`

#### Scenario: Owner's poem that isn't theirs
- **GIVEN** a signed-in author and another author's poem id `<otherId>`
- **WHEN** they open `/account/poems/<otherId>`
- **THEN** the 404 page renders and no trail is shown

#### Scenario: Owner's poem read unavailable
- **GIVEN** a signed-in author and a poem read that fails because the database is unreachable
- **WHEN** they open `/account/poems/<poemId>`
- **THEN** the trail reads «Главная», «Мастерская поэта», «Управление произведениями», with «Управление произведениями» as the current item

#### Scenario: Signup trail
- **GIVEN** any visitor
- **WHEN** they open `/signup`
- **THEN** the trail items read, in order, «Главная», «Регистрация»

#### Scenario: About trail
- **GIVEN** any visitor
- **WHEN** they open `/about`
- **THEN** the trail items read, in order, «Главная», «О проекте»
- **AND** «Главная» links to `/`, and «О проекте» is not a link and has `aria-current="page"`
- **AND** the same trail is shown when the about content fails and the error screen replaces it

#### Scenario: Privacy policy trail
- **GIVEN** any visitor
- **WHEN** they open `/privacy`
- **THEN** the trail items read, in order, «Главная», «Политика конфиденциальности»
- **AND** «Главная» links to `/`, and «Политика конфиденциальности» is not a link and has `aria-current="page"`
- **AND** the same trail is shown when the privacy policy content fails and the error screen replaces it

#### Scenario: Poem trail
- **GIVEN** a public author «Анна Ахматова» with id `<id>` and her poem «Осенний сад» with id `<poemId>`
- **WHEN** a visitor opens `/authors/<id>/poems/<poemId>`
- **THEN** the trail items read, in order, «Главная», «Наши авторы», «Анна Ахматова», «Осенний сад»
- **AND** «Анна Ахматова» links to `/authors/<id>`, and «Осенний сад» is not a link and has `aria-current="page"`

#### Scenario: Poem list trail
- **GIVEN** a public author with id `<id>`
- **WHEN** a visitor opens `/authors/<id>/poems`
- **THEN** no trail is shown

### Requirement: Author name on the author page (FR-4)
On `/authors/<id>` and `/authors/<id>/poems/<poemId>`, the author's item SHALL be the author's first and last name separated by a space. When the author can't be read because the service is unavailable, that item SHALL read «Автор» (still a link on the poem page). When the author doesn't exist or isn't public, no trail SHALL be shown. On the poem page, when the poem is not one of that author's poems, no trail SHALL be shown (add-author-poems FR-8), except when the author read is unavailable: then the trail SHALL read Главная › Наши авторы › Автор, with «Автор» as the current item, matching the error screen (add-author-poems FR-12). When the poem can't be read because the service is unavailable, the page shows the error screen and the trail SHALL end at the author's item (the name, or «Автор» when the author read is unavailable too) as the current item (add-poem-creation, user decision 2026-10-28).

#### Scenario: Public author
- **GIVEN** a public author with first name «Анна» and last name «Ахматова»
- **WHEN** a visitor opens her page
- **THEN** the trail items read «Главная», «Наши авторы», «Анна Ахматова», and «Наши авторы» links to `/authors`

#### Scenario: Author read unavailable
- **GIVEN** the author service can't be reached
- **WHEN** a visitor opens `/authors/<a valid id>`
- **THEN** the trail's last item reads «Автор»

#### Scenario: Author read unavailable on a poem route
- **GIVEN** the author service can't be reached, and `<poemId>` is one of that author's poems
- **WHEN** a visitor opens `/authors/<a valid id>/poems/<poemId>`
- **THEN** the trail's third item reads «Автор» and links to `/authors/<id>`

#### Scenario: Unknown author
- **GIVEN** no public author has id `<id>`
- **WHEN** a visitor opens `/authors/<id>` or `/authors/<id>/poems/<any poem id>`
- **THEN** no trail is shown

#### Scenario: Poem that isn't the author's
- **GIVEN** a public author `<id>` and a poem id that is not one of that author's poems
- **WHEN** a visitor opens `/authors/<id>/poems/<that id>`
- **THEN** no trail is shown

#### Scenario: Author unavailable and poem not the author's
- **GIVEN** the author service can't be reached for a valid id `<id>`, and `no-such-poem` is not one of that author's poems
- **WHEN** a visitor opens `/authors/<id>/poems/no-such-poem`
- **THEN** the page shows the error screen, and the trail items read «Главная», «Наши авторы», «Автор», with «Автор» not a link and carrying `aria-current="page"`

#### Scenario: Poem read unavailable
- **GIVEN** a public author «Анна Ахматова» with id `<id>`, and a poem read that fails because the database is unreachable
- **WHEN** a visitor opens `/authors/<id>/poems/<poemId>`
- **THEN** the page shows the error screen, and the trail items read «Главная», «Наши авторы», «Анна Ахматова», with «Анна Ахматова» not a link and carrying `aria-current="page"`

### Requirement: Same trail for every visitor (FR-5)
The trail SHALL be identical for every visitor, signed in or not, and SHALL NOT depend on the session, with one exception: the last item of `/account/poems/<poemId>` is the title of the signed-in owner's poem, which only that owner can open (add-poem-creation FR-8).

#### Scenario: Signed-in and signed-out visitors see the same trail
- **GIVEN** a signed-out visitor and a signed-in reader
- **WHEN** each opens `/authors`
- **THEN** both see the same trail items, links, and highlight

