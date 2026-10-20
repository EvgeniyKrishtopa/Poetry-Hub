## Purpose

Defines the breadcrumb trail shown under the site header: which pages show it, which items it lists and links, how the current page is marked, and its accessibility contract.

## ADDED Requirements

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
The trail SHALL list «Главная» first and then every level down to the current page: `/authors` → Главная › Наши авторы; `/authors/<id>` → Главная › Наши авторы › <author name>; `/account` → Главная › Мастерская поэта; `/account/author` → Главная › Мастерская поэта › Профиль автора; `/login` → Главная › Вход; `/signup` → Главная › Регистрация.

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
On `/authors/<id>` the last item SHALL be the author's first and last name separated by a space. When the author can't be read because the service is unavailable, the last item SHALL read «Автор». When the author doesn't exist or isn't public, no trail SHALL be shown.

#### Scenario: Public author
- **GIVEN** a public author with first name «Анна» and last name «Ахматова»
- **WHEN** a visitor opens her page
- **THEN** the trail items read «Главная», «Наши авторы», «Анна Ахматова», and «Наши авторы» links to `/authors`

#### Scenario: Author read unavailable
- **GIVEN** the author service can't be reached
- **WHEN** a visitor opens `/authors/<a valid id>`
- **THEN** the trail's last item reads «Автор»

#### Scenario: Unknown author
- **GIVEN** no public author has id `<id>`
- **WHEN** a visitor opens `/authors/<id>`
- **THEN** no trail is shown

### Requirement: Same trail for every visitor (FR-5)
The trail SHALL be identical for every visitor, signed in or not, and SHALL NOT depend on the session.

#### Scenario: Signed-in and signed-out visitors see the same trail
- **GIVEN** a signed-out visitor and a signed-in reader
- **WHEN** each opens `/authors`
- **THEN** both see the same trail items, links, and highlight

### Requirement: No trail on unknown URLs (FR-6)
A URL not listed in the trail table, including any URL that shows the 404 page, SHALL show no trail.

#### Scenario: Unknown URL
- **GIVEN** any visitor
- **WHEN** they open `/no-such-page`
- **THEN** the response is HTTP 404 with the «Страница не найдена» page, and no trail is shown

#### Scenario: Extra segments under a known page
- **GIVEN** any visitor
- **WHEN** they open `/account/author/extra`
- **THEN** no trail is shown

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

### Requirement: Route list unchanged (NFR-5)
The production build SHALL succeed under Cache Components, and its set of route paths SHALL be identical to `main` before the change.

#### Scenario: Build route list
- **GIVEN** the change is complete
- **WHEN** `npm run build` runs
- **THEN** it exits 0 and its route path list equals the one on `main` before the change

### Requirement: Russian UI copy (NFR-6)
Every user-facing string of the trail SHALL be the Russian copy from the change's UI copy table, verbatim.

#### Scenario: Copy matches the table
- **GIVEN** the trail on each page in the trail table
- **WHEN** its landmark name and item labels are read
- **THEN** each matches the UI copy table exactly
