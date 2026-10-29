## MODIFIED Requirements

### Requirement: Account page author section (FR-1)
`/account` SHALL show an author-profile section for the signed-in reader: a "Создать кабинет автора" link to `/account/author` when the reader has no profile (no row, or a row with every field empty), otherwise an "Редактировать профиль автора" link to `/account/author`, plus, when the profile is public, a "Открыть публичную страницу" link to `/authors/<id>` and a «Управление произведениями» link to `/account/poems` (add-poem-creation FR-1).

#### Scenario: No profile yet
- **GIVEN** a signed-in reader with no profile row
- **WHEN** they open `/account`
- **THEN** a link "Создать кабинет автора" with `href` `/account/author` is shown
- **AND** neither a "Открыть публичную страницу" nor a «Управление произведениями» link is shown

#### Scenario: Every field deleted
- **GIVEN** a signed-in reader whose profile row has had every field deleted
- **WHEN** they open `/account`
- **THEN** a link "Создать кабинет автора" with `href` `/account/author` is shown

#### Scenario: Profile exists but is not public
- **GIVEN** a signed-in reader whose profile has a first name and no last name
- **WHEN** they open `/account`
- **THEN** a link "Редактировать профиль автора" with `href` `/account/author` is shown
- **AND** neither a "Открыть публичную страницу" nor a «Управление произведениями» link is shown

#### Scenario: Public profile
- **GIVEN** a signed-in reader whose profile with id `<id>` has a first and a last name
- **WHEN** they open `/account`
- **THEN** "Редактировать профиль автора" (`/account/author`), "Открыть публичную страницу" (`/authors/<id>`), and «Управление произведениями» (`/account/poems`) are shown

#### Scenario: Profile can't be loaded
- **GIVEN** a signed-in reader and a failing profile read
- **WHEN** they open `/account`
- **THEN** "Не удалось загрузить профиль. Попробуйте позже." is shown in a `role="alert"` element instead of the author links (add-author-profiles FR-18)

