## MODIFIED Requirements

### Requirement: Trail items per route (FR-2)
The trail SHALL list «Главная» first and then every level down to the current page: `/authors` → Главная › Наши авторы; `/authors/<id>` → Главная › Наши авторы › <author name>; `/authors/<id>/poems` → Главная › Наши авторы › <author name> › Произведения; `/authors/<id>/poems/<poemId>` → Главная › Наши авторы › <author name> › Произведения › <poem title>; `/account` → Главная › Мастерская поэта; `/account/author` → Главная › Мастерская поэта › Профиль автора; `/login` → Главная › Вход; `/signup` → Главная › Регистрация; `/about` → Главная › О проекте; `/privacy` → Главная › Политика конфиденциальности. On the two poem routes (add-author-poems FR-8), «<author name>» links to `/authors/<id>`, and on the poem page «Произведения» links to `/authors/<id>/poems`.

#### Scenario: Two-level trail
- **GIVEN** any visitor
- **WHEN** they open `/login`
- **THEN** the trail items read, in order, «Главная», «Вход»

#### Scenario: Three-level trail in the account area
- **GIVEN** a signed-in reader
- **WHEN** they open `/account/author`
- **THEN** the trail items read, in order, «Главная», «Мастерская поэта», «Профиль автора»

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

#### Scenario: Poem list trail
- **GIVEN** a public author «Анна Ахматова» with id `<id>`
- **WHEN** a visitor opens `/authors/<id>/poems`
- **THEN** the trail items read, in order, «Главная», «Наши авторы», «Анна Ахматова», «Произведения»
- **AND** «Анна Ахматова» links to `/authors/<id>`, and «Произведения» is not a link and has `aria-current="page"`

#### Scenario: Poem trail
- **GIVEN** a public author «Анна Ахматова» with id `<id>` and her poem «Осенний сад» with id `<poemId>`
- **WHEN** a visitor opens `/authors/<id>/poems/<poemId>`
- **THEN** the trail items read, in order, «Главная», «Наши авторы», «Анна Ахматова», «Произведения», «Осенний сад»
- **AND** «Произведения» links to `/authors/<id>/poems`, and «Осенний сад» is not a link and has `aria-current="page"`

### Requirement: Author name on the author page (FR-4)
On `/authors/<id>`, `/authors/<id>/poems`, and `/authors/<id>/poems/<poemId>`, the author's item SHALL be the author's first and last name separated by a space. When the author can't be read because the service is unavailable, that item SHALL read «Автор» (still a link on the two poem routes). When the author doesn't exist or isn't public, no trail SHALL be shown. On the poem page, when the poem is not one of that author's poems, no trail SHALL be shown (add-author-poems FR-8), except when the author read is unavailable: then the trail SHALL read Главная › Наши авторы › Автор, with «Автор» as the current item, matching the error screen (add-author-poems FR-12).

#### Scenario: Public author
- **GIVEN** a public author with first name «Анна» and last name «Ахматова»
- **WHEN** a visitor opens her page
- **THEN** the trail items read «Главная», «Наши авторы», «Анна Ахматова», and «Наши авторы» links to `/authors`

#### Scenario: Author read unavailable
- **GIVEN** the author service can't be reached
- **WHEN** a visitor opens `/authors/<a valid id>`
- **THEN** the trail's last item reads «Автор»

#### Scenario: Author read unavailable on a poem route
- **GIVEN** the author service can't be reached
- **WHEN** a visitor opens `/authors/<a valid id>/poems`
- **THEN** the trail's third item reads «Автор» and links to `/authors/<id>`

#### Scenario: Unknown author
- **GIVEN** no public author has id `<id>`
- **WHEN** a visitor opens `/authors/<id>`, `/authors/<id>/poems`, or `/authors/<id>/poems/<any poem id>`
- **THEN** no trail is shown

#### Scenario: Poem that isn't the author's
- **GIVEN** a public author `<id>` and a poem id that is not one of that author's poems
- **WHEN** a visitor opens `/authors/<id>/poems/<that id>`
- **THEN** no trail is shown

#### Scenario: Author unavailable and poem not the author's
- **GIVEN** the author service can't be reached for a valid id `<id>`, and `no-such-poem` is not one of that author's poems
- **WHEN** a visitor opens `/authors/<id>/poems/no-such-poem`
- **THEN** the page shows the error screen, and the trail items read «Главная», «Наши авторы», «Автор», with «Автор» not a link and carrying `aria-current="page"`

## REMOVED Requirements

### Requirement: Route list unchanged (NFR-5)
**Reason**: A one-time check for the add-breadcrumbs change (the trail must not add pages). As a lasting rule it fails every later change that adds a page on purpose (user decision, 2026-10-24, add-author-poems spec-clarify).
**Migration**: The lasting part, one slot page per real page, moves to "Slot page for every page (NFR-5)". A change that adds routes states its own expected route list (add-author-poems NFR-4).

## ADDED Requirements

### Requirement: Slot page for every page (NFR-5)
The production build SHALL succeed under Cache Components, and every page route under `app/(public)/` and `app/(authorized)/` SHALL have exactly one mirror page at the same path under `app/@breadcrumbs/`, with no slot page lacking a real page.

#### Scenario: Slot mirrors every page
- **GIVEN** the page files under `app/(public)/` and `app/(authorized)/`
- **WHEN** they are compared with the page files under `app/@breadcrumbs/`
- **THEN** both sets of paths are identical, including `authors/[id]/poems` and `authors/[id]/poems/[poemId]`

### Requirement: Trail agrees with its page (FR-12)
On `/authors/<id>`, `/authors/<id>/poems`, and `/authors/<id>/poems/<poemId>`, the page and its trail SHALL use one author read per request, and on the poem page one poem read, so they never disagree: the trail shows the author's name exactly when the page shows the author's content, «Автор» exactly when the page shows the error screen, and no trail exactly when the page shows the 404 page (add-author-poems FR-12).

#### Scenario: One read per request
- **GIVEN** a request for `/authors/<id>/poems/<poemId>`
- **WHEN** the page and the trail render
- **THEN** the author data source is queried at most once and the poem data source at most once for that request

#### Scenario: A failing read fails both
- **GIVEN** the author read for a request fails as unavailable
- **WHEN** `/authors/<id>` renders
- **THEN** the page shows the error screen and the trail's author item reads «Автор»; the trail never shows the author's name in that request

### Requirement: Trail follows the last of several quick navigations (FR-13)
When a visitor follows a link to an author page, a poem list, or a poem page, and then another such link before the first page has rendered, the page and the trail SHALL both end on the second link's target (add-author-poems FR-13). This holds both when the second click comes before the URL changes and when it comes after the first page's skeleton shows but before its content arrives; late content from the first navigation SHALL never appear.

#### Scenario: Two clicks before the URL changes
- **GIVEN** a visitor on `/authors` with authors «Анна Ахматова» and «Борис Пастернак», and author reads slowed down
- **WHEN** they click «Анна Ахматова» and, before the URL changes, click «Борис Пастернак»
- **THEN** the URL is Борис Пастернак's page, the page heading reads «Борис Пастернак», and the trail's last item reads «Борис Пастернак»

#### Scenario: Second click while the first page's content is in flight
- **GIVEN** a visitor on `/authors` with authors «Анна Ахматова» and «Борис Пастернак», and author reads slowed down
- **WHEN** they click «Анна Ахматова», see her page's skeleton, press Back before her content arrives, and click «Борис Пастернак»
- **THEN** the page heading reads «Борис Пастернак» and the trail's last item reads «Борис Пастернак», and «Анна Ахматова» never appears afterwards

#### Scenario: Two quick clicks between poems
- **GIVEN** a visitor on an author's poem list with two poems
- **WHEN** they click the first title and immediately press Back and click the second title
- **THEN** the page shows the second poem and the trail's last item is the second poem's title
