# breadcrumbs Specification

## Purpose
Defines the breadcrumb trail shown under the site header: which pages show it, which items it lists and links, how the current page is marked, and its accessibility contract.
## Requirements
### Requirement: Trail on every page except home (FR-1)
Every page except home SHALL show a breadcrumb trail between the site header and the page content. Home (`/`) SHALL show no trail.

#### Scenario: Home shows no trail
- **GIVEN** any visitor
- **WHEN** they open `/`
- **THEN** the page contains no navigation landmark named «Навигационная цепочка»

#### Scenario: Another page shows the trail under the header
- **GIVEN** any visitor
- **WHEN** they open `/authors`
- **THEN** a navigation landmark named «Навигационная цепочка» is rendered after the site header and before the page's main content

### Requirement: Trail items per route (FR-2)
The trail SHALL list «Главная» first and then every level down to the current page: `/authors` → Главная › Наши авторы; `/authors/<id>` → Главная › Наши авторы › <author name>; `/authors/<id>/poems/<poemId>` → Главная › Наши авторы › <author name> › <poem title>; `/account` → Главная › Мастерская поэта; `/account/author` → Главная › Мастерская поэта › Профиль автора; `/login` → Главная › Вход; `/signup` → Главная › Регистрация; `/about` → Главная › О проекте; `/privacy` → Главная › Политика конфиденциальности. On the poem page, «<author name>» links to `/authors/<id>`, and the trail holds no «Произведения» item (refine-author-page-and-contact FR-7). `/authors/<id>/poems` is not in the table: it gets no trail (FR-6).

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

#### Scenario: Poem trail
- **GIVEN** a public author «Анна Ахматова» with id `<id>` and her poem «Осенний сад» with id `<poemId>`
- **WHEN** a visitor opens `/authors/<id>/poems/<poemId>`
- **THEN** the trail items read, in order, «Главная», «Наши авторы», «Анна Ахматова», «Осенний сад»
- **AND** «Анна Ахматова» links to `/authors/<id>`, and «Осенний сад» is not a link and has `aria-current="page"`

#### Scenario: Poem list trail
- **GIVEN** a public author with id `<id>`
- **WHEN** a visitor opens `/authors/<id>/poems`
- **THEN** no trail is shown

### Requirement: Links and current-item highlight (FR-3)
Every trail item except the last SHALL be a link to its page. The last item SHALL be plain text, not a link, carry `aria-current="page"`, and use the accent color; the other items SHALL use the regular text color.

#### Scenario: Parent items link up the tree
- **GIVEN** any visitor
- **WHEN** they open `/account/author` signed in
- **THEN** «Главная» links to `/` and «Мастерская поэта» links to `/account`

#### Scenario: Current item is highlighted and not a link
- **GIVEN** any visitor
- **WHEN** they open `/authors`
- **THEN** «Наши авторы» is not a link, has `aria-current="page"`, and is rendered in the accent color
- **AND** «Главная» is rendered in the regular text color

### Requirement: Author name on the author page (FR-4)
On `/authors/<id>` and `/authors/<id>/poems/<poemId>`, the author's item SHALL be the author's first and last name separated by a space. When the author can't be read because the service is unavailable, that item SHALL read «Автор» (still a link on the poem page). When the author doesn't exist or isn't public, no trail SHALL be shown. On the poem page, when the poem is not one of that author's poems, no trail SHALL be shown (add-author-poems FR-8), except when the author read is unavailable: then the trail SHALL read Главная › Наши авторы › Автор, with «Автор» as the current item, matching the error screen (add-author-poems FR-12).

#### Scenario: Public author
- **GIVEN** a public author with first name «Анна» and last name «Ахматова»
- **WHEN** a visitor opens her page
- **THEN** the trail items read «Главная», «Наши авторы», «Анна Ахматова», and «Наши авторы» links to `/authors`

#### Scenario: Author read unavailable
- **GIVEN** the author service can't be reached
- **WHEN** a visitor opens `/authors/<a valid id>`
- **THEN** the trail's last item reads «Автор»

#### Scenario: Author read unavailable on a poem route
- **GIVEN** the author service can't be reached, and `<poemId>` is one of the mock poem ids that author would get
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

### Requirement: Same trail for every visitor (FR-5)
The trail SHALL be identical for every visitor, signed in or not, and SHALL NOT depend on the session.

#### Scenario: Signed-in and signed-out visitors see the same trail
- **GIVEN** a signed-out visitor and a signed-in reader
- **WHEN** each opens `/authors`
- **THEN** both see the same trail items, links, and highlight

### Requirement: No trail on unknown URLs (FR-6)
A URL not listed in the trail table, opened directly or by reload, SHALL keep its HTTP 404 response and show the 404 page with no trail. An in-app link to such a URL MAY keep the previous page's trail.

#### Scenario: Unknown URL
- **GIVEN** any visitor
- **WHEN** they open `/no-such-page`
- **THEN** the response is HTTP 404 with the «Страница не найдена» page, and no trail is shown

#### Scenario: Extra segments under a known page
- **GIVEN** any visitor
- **WHEN** they open `/authors/a/b`
- **THEN** the response is HTTP 404 and no trail is shown

### Requirement: Trail follows client-side navigation (FR-7)
The trail SHALL update on in-app navigation without a full page reload: it appears when leaving home, changes between pages, and disappears when returning home by an in-app link or the browser's Back button.

#### Scenario: Leaving home shows the trail
- **GIVEN** a visitor on `/`
- **WHEN** they follow the header's «Наши авторы» link
- **THEN** the trail «Главная › Наши авторы» appears without a full page reload

#### Scenario: Returning home hides the trail
- **GIVEN** a visitor on `/authors`
- **WHEN** they follow the trail's «Главная» link, or press the browser's Back button after arriving from home
- **THEN** home renders with no trail

### Requirement: Server-rendered only (NFR-1)
The trail SHALL be rendered by Server Components only; no client module SHALL take part in rendering it.

#### Scenario: No client modules in the feature
- **GIVEN** the change is complete
- **WHEN** the breadcrumb feature and its route slot are searched for a `"use client"` directive
- **THEN** none is found

### Requirement: Design tokens only (NFR-2)
The trail's styles SHALL use design-token color utilities only, with no hard-coded color values.

#### Scenario: No hard-coded colors
- **GIVEN** the trail's components
- **WHEN** their class names and styles are inspected
- **THEN** no class or style holds a hard-coded color value (hex, `rgb()`/`hsl()`, an arbitrary-value class such as `text-[#…]`, an inline `style` color); any design-token color utility is allowed

### Requirement: Accessible markup (NFR-3)
The trail SHALL be a navigation landmark named «Навигационная цепочка» containing an ordered list; the current item SHALL carry `aria-current="page"`; separators SHALL be hidden from assistive technology.

#### Scenario: Screen reader structure
- **GIVEN** the trail on `/authors`
- **WHEN** it is read through the accessibility tree
- **THEN** it exposes a navigation landmark «Навигационная цепочка» with a list of two items, «Главная» and «Наши авторы», and no separator text

### Requirement: Stable row height while loading (NFR-4)
While the trail's data loads, its row SHALL keep the height of a one-line trail, so the content below doesn't move when a one-line trail appears. A trail that wraps to a second line on a narrow screen MAY shift the content below by that extra line.

#### Scenario: Placeholder holds the row
- **GIVEN** the trail's data has not arrived yet
- **WHEN** the page's shell renders
- **THEN** a placeholder with the trail row's height, hidden from assistive technology, stands in its place

### Requirement: Russian UI copy (NFR-6)
Every user-facing string of the trail SHALL be the Russian copy from the change's UI copy table, verbatim.

#### Scenario: Copy matches the table
- **GIVEN** the trail on each page in the trail table
- **WHEN** its landmark name and item labels are read
- **THEN** each matches the UI copy table exactly

### Requirement: Slot page for every page (NFR-5)
The production build SHALL succeed under Cache Components, and every page route under `app/(public)/` and `app/(authorized)/` SHALL have exactly one mirror page at the same path under `app/@breadcrumbs/`, with no slot page lacking a real page.

#### Scenario: Slot mirrors every page
- **GIVEN** the page files under `app/(public)/` and `app/(authorized)/`
- **WHEN** they are compared with the page files under `app/@breadcrumbs/`
- **THEN** both sets of paths are identical, including `authors/[id]/poems/[poemId]`, and neither holds `authors/[id]/poems` as a page

### Requirement: Trail agrees with its page (FR-12)
On `/authors/<id>` and `/authors/<id>/poems/<poemId>`, the page and its trail SHALL use one author read per request, and on the poem page one poem read, so they never disagree: the trail shows the author's name exactly when the page shows the author's content, «Автор» exactly when the page shows the error screen, and no trail exactly when the page shows the 404 page (add-author-poems FR-12).

#### Scenario: One read per request
- **GIVEN** a request for `/authors/<id>/poems/<poemId>`
- **WHEN** the page and the trail render
- **THEN** the author data source is queried at most once and the poem data source at most once for that request

#### Scenario: A failing read fails both
- **GIVEN** the author read for a request fails as unavailable
- **WHEN** `/authors/<id>` renders
- **THEN** the page shows the error screen and the trail's author item reads «Автор»; the trail never shows the author's name in that request

### Requirement: Trail follows the last of several quick navigations (FR-13)
When a visitor follows a link to an author page or a poem page, and then another such link before the first page has rendered, the page and the trail SHALL both end on the second link's target (add-author-poems FR-13). This holds both when the second click comes before the URL changes and when it comes after the first page's skeleton shows but before its content arrives; late content from the first navigation SHALL never appear.

#### Scenario: Two clicks before the URL changes
- **GIVEN** a visitor on `/authors` with authors «Анна Ахматова» and «Борис Пастернак», and author reads slowed down
- **WHEN** they click «Анна Ахматова» and, before the URL changes, click «Борис Пастернак»
- **THEN** the URL is Борис Пастернак's page, the page heading reads «Борис Пастернак», and the trail's last item reads «Борис Пастернак»

#### Scenario: Second click while the first page's content is in flight
- **GIVEN** a visitor on `/authors` with authors «Анна Ахматова» and «Борис Пастернак», and author reads slowed down
- **WHEN** they click «Анна Ахматова», see her page's skeleton, press Back before her content arrives, and click «Борис Пастернак»
- **THEN** the page heading reads «Борис Пастернак» and the trail's last item reads «Борис Пастернак», and «Анна Ахматова» never appears afterwards

#### Scenario: Two quick clicks between poems
- **GIVEN** a visitor on the page of an author with two poems
- **WHEN** they click the first poem title in the «Произведения» section and immediately press Back and click the second title
- **THEN** the page shows the second poem and the trail's last item is the second poem's title

