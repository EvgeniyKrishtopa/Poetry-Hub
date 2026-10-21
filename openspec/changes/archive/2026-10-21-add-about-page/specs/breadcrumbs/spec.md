## MODIFIED Requirements

### Requirement: Trail items per route (FR-2)
The trail SHALL list «Главная» first and then every level down to the current page: `/authors` → Главная › Наши авторы; `/authors/<id>` → Главная › Наши авторы › <author name>; `/account` → Главная › Мастерская поэта; `/account/author` → Главная › Мастерская поэта › Профиль автора; `/login` → Главная › Вход; `/signup` → Главная › Регистрация; `/about` → Главная › О проекте.

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
