# Spec Delta

## Purpose

The signed-in reader's personal account page and the server-side session gate that every page in the `(authorized)` route group relies on.

## ADDED Requirements

### Requirement: Account pages require a session (FR-1, FR-2, NFR-2)
`/account` and `/account/author` SHALL check the session on the server before rendering any account data. A request whose session check finds no valid session (signed out) SHALL be redirected to `/login`, and no profile data SHALL be read or rendered for it. When the check can't tell because Supabase is unreachable or failing, see "Session check unavailable (FR-20)" below.

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

### Requirement: Proxy redirect for account routes (FR-19, NFR-2)
The proxy SHALL redirect a signed-out page request for `/account` or any path under `/account/` to `/login` with HTTP 307, before any page renders. A page request is a GET or HEAD without a `Next-Action` header. Other methods (Server Action calls included), signed-in requests, and requests whose session state is unknown SHALL pass through, and the page's own session check (above) stays. The redirect SHALL carry the session refresh's cookies, the four security headers, and `Cache-Control: private, no-store`, and SHALL NOT add a return-to parameter.

#### Scenario: Signed-out page request
- **GIVEN** a GET request for `/account/author` with no session cookies
- **WHEN** the proxy handles it
- **THEN** the response is a 307 whose `Location`, parsed as a URL, has the request's origin, the path `/login`, and no query string (an absolute URL, as `NextResponse.redirect` writes it)
- **AND** it carries all four security headers and `Cache-Control: private, no-store`

#### Scenario: Any path under /account
- **GIVEN** a signed-out GET request for `/account`, `/account/`, or `/account/author/x`
- **WHEN** the proxy handles it
- **THEN** each is redirected to `/login`
- **AND** a request for `/accounts` or `/authors` is not

#### Scenario: Dead session is cleared on the redirect
- **GIVEN** a request whose refresh token was revoked, so the refresh clears the session cookies
- **WHEN** the proxy redirects it to `/login`
- **THEN** the redirect response carries the cookie-clearing `Set-Cookie` headers

#### Scenario: Server Action call with an expired session
- **GIVEN** a reader whose session expired while `/account/author` was open
- **WHEN** they save a field (a POST to `/account/author` with a `Next-Action` header)
- **THEN** the proxy does not redirect it
- **AND** "Сессия истекла. Войдите снова." is shown under that field (add-author-profiles FR-9)

#### Scenario: Signed-in request
- **GIVEN** a request for `/account` with a valid session
- **WHEN** the proxy handles it
- **THEN** it passes through to the page

#### Scenario: Session state unknown
- **GIVEN** the Supabase config is missing, or `getClaims` returns a retryable error (Supabase Auth unreachable or answering 500 or above) or throws
- **WHEN** the proxy handles a request for `/account`
- **THEN** it passes through, and the page's own check decides

### Requirement: Session check unavailable (FR-20)
When the session can't be checked (Supabase unreachable or failing, or its config missing), `/account` and `/account/author` SHALL NOT redirect to `/login` and SHALL NOT read profile data. On `/account` the author section keeps its «Профиль автора» heading and shows the alert in place of the links, as FR-18 does (spec-clarify 2026-10-16); on `/account/author` the alert replaces the editor. The alert reads «Сервис временно недоступен. Попробуйте позже.» in a `role="alert"` element, with a «Повторить» button that re-requests the page's server data.

#### Scenario: Account page during an outage
- **GIVEN** a signed-in reader and Supabase Auth unreachable
- **WHEN** they open `/account`
- **THEN** the heading «Мастерская поэта», the section heading «Профиль автора», and under it the alert «Сервис временно недоступен. Попробуйте позже.» are shown, with a «Повторить» button and no author links
- **AND** the browser stays on `/account` and no profile read was made

#### Scenario: Editor during an outage
- **GIVEN** a signed-in reader and Supabase Auth answering with status 503
- **WHEN** they open `/account/author`
- **THEN** the alert and «Повторить» are shown in place of the editor, and no field editor is rendered

#### Scenario: Retry after recovery
- **GIVEN** the outage alert is shown and Supabase has recovered
- **WHEN** the reader clicks «Повторить»
- **THEN** the page's server data is requested again and the author section or editor renders
