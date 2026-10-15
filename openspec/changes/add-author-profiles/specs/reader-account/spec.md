# Spec Delta

## Purpose

The signed-in reader's personal account page and the server-side session gate that every page in the `(authorized)` route group relies on.

## ADDED Requirements

### Requirement: Account pages require a session (FR-1, FR-2, NFR-2)
`/account` and `/account/author` SHALL check the session on the server before rendering any account data. A request without a valid session SHALL be redirected to `/login`, and no profile data SHALL be read or rendered for it.

#### Scenario: Signed-out visitor opens the account page
- **GIVEN** a request with no session cookies
- **WHEN** it requests `/account`
- **THEN** the browser ends up on `/login`
- **AND** no profile read was made

#### Scenario: Signed-out visitor opens the editor
- **GIVEN** a request with an expired or invalid session
- **WHEN** it requests `/account/author`
- **THEN** the browser ends up on `/login`

### Requirement: Account page author section (FR-1)
`/account` SHALL show an author-profile section for the signed-in reader: a "Создать кабинет автора" link to `/account/author` when the reader has no profile (no row, or a row with every field empty), otherwise an "Редактировать профиль автора" link to `/account/author`, plus a "Открыть публичную страницу" link to `/authors/<id>` when the profile is public.

#### Scenario: No profile yet
- **GIVEN** a signed-in reader with no profile row
- **WHEN** they open `/account`
- **THEN** a link "Создать кабинет автора" with `href` `/account/author` is shown
- **AND** no "Открыть публичную страницу" link is shown

#### Scenario: Every field deleted
- **GIVEN** a signed-in reader whose profile row has had every field deleted
- **WHEN** they open `/account`
- **THEN** a link "Создать кабинет автора" with `href` `/account/author` is shown

#### Scenario: Profile exists but is not public
- **GIVEN** a signed-in reader whose profile has a first name and no last name
- **WHEN** they open `/account`
- **THEN** a link "Редактировать профиль автора" with `href` `/account/author` is shown
- **AND** no "Открыть публичную страницу" link is shown

#### Scenario: Public profile
- **GIVEN** a signed-in reader whose profile with id `<id>` has a first and a last name
- **WHEN** they open `/account`
- **THEN** "Редактировать профиль автора" (`/account/author`) and "Открыть публичную страницу" (`/authors/<id>`) are shown

#### Scenario: Profile can't be loaded
- **GIVEN** a signed-in reader and a failing profile read
- **WHEN** they open `/account`
- **THEN** "Не удалось загрузить профиль. Попробуйте позже." is shown in a `role="alert"` element instead of the author links (add-author-profiles FR-18)
