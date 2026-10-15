# Spec Delta

## MODIFIED Requirements

### Requirement: Session-aware header (FR-7)
The root layout SHALL render a `<header>` with a link to `/` showing the site name, an "Наши авторы" link to `/authors` for every visitor, and a session part rendered on the server, inside a `<Suspense>` boundary, from the request's session cookies. The session part SHALL show a "Sign in" link to `/login` when the request has no valid session, and a "Личный кабинет" link to `/account` plus a "Sign out" button when it has one. The header SHALL NOT show the reader's email. No code in the browser SHALL read the session. The two navigation links come from add-author-profiles FR-3.

#### Scenario: Signed out
- **GIVEN** a request with no session cookies
- **WHEN** any page renders
- **THEN** the header shows the site-name link to `/`, a link "Наши авторы" with `href` `/authors`, and a link "Sign in" with `href` `/login`
- **AND** there is no "Sign out" button and no "Личный кабинет" link

#### Scenario: Signed in
- **GIVEN** a request whose session cookies hold a valid session for "reader@example.com"
- **WHEN** any page renders
- **THEN** the header shows "Наши авторы" (`/authors`), "Личный кабинет" (`/account`), and a "Sign out" button, and no "Sign in" link
- **AND** "reader@example.com" does not appear in the header

#### Scenario: Session check fails
- **GIVEN** the server's session check gets no claims, a Supabase error, or a thrown error
- **WHEN** the header renders
- **THEN** it shows the "Sign in" link and "Наши авторы", and the page still renders

#### Scenario: Pending session check
- **GIVEN** the session check has not resolved yet
- **WHEN** the header's Suspense fallback renders
- **THEN** neither "Sign in", "Sign out", nor "Личный кабинет" is present
- **AND** "Наши авторы" is present
