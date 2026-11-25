## MODIFIED Requirements

### Requirement: Auth pages are not indexed (FR-7)
`/login`, `/signup` and `/reset-password` SHALL declare `robots` `noindex, follow`, a plain title and their canonical URL (FR-3), and SHALL NOT carry a description, an Open Graph tag or a Twitter card; they are the three exceptions to FR-2, FR-4 and FR-5.

#### Scenario: Login page head
- **GIVEN** the application is running
- **WHEN** a crawler requests `/login`
- **THEN** the HTML has `<meta name="robots" content="noindex, follow">`, a canonical link `<SITE_URL>/login`, and no `description`, `og:` or `twitter:` tag

#### Scenario: Reset-password page head
- **GIVEN** the application is running
- **WHEN** a crawler requests `/reset-password`
- **THEN** the HTML has `<meta name="robots" content="noindex, follow">`, the title «Новый пароль», a canonical link `<SITE_URL>/reset-password`, and no `description`, `og:` or `twitter:` tag
