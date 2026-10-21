# site-footer Specification

## Purpose
Defines the site footer shown on every page: its placement, the copyright notice (founding year to current year),
and the links to the about, privacy, and contact pages.
## Requirements
### Requirement: Footer on every page (FR-1)
The root layout SHALL render exactly one site footer after the page content on every page it
wraps, including the not-found, error, and loading screens. The error and loading screens are covered
by structure (they render inside the same root layout) and have no browser scenario, since
neither can be triggered reliably on demand.

#### Scenario: Footer on a content page
- **GIVEN** the app is running
- **WHEN** a browser opens `/`, `/login`, `/signup`, `/authors`, `/authors/<id>` (an existing
  public profile), `/account` (signed in), or `/account/author` (signed in)
- **THEN** the page has exactly one `contentinfo` landmark
- **AND** it comes after the page's `main` element in document order

#### Scenario: Footer on the not-found screen
- **GIVEN** the app is running
- **WHEN** a browser opens `/does-not-exist`
- **THEN** the not-found screen is shown with exactly one `contentinfo` landmark after its `main`

### Requirement: Copyright notice from the founding year to the current year (FR-2)
The footer SHALL show `© <years> Поэтический Хаб`, where the name is the site name from the site
config and `<years>` runs from the founding year, 2026, to the current calendar year in UTC, both
as four digits. When the current year equals the founding year, `<years>` SHALL be that one
year; when it is later, `<years>` SHALL be `<founding>–<current>`, joined by an en dash (U+2013)
with no spaces. The current year is taken when the footer renders; on the deployed site the
rendered footer MAY be served from cache for up to one day, so the new range MAY appear up to
one day after 1 January (UTC).

#### Scenario: Founding year
- **GIVEN** the system clock reads 2026-10-20 (UTC)
- **WHEN** the footer renders
- **THEN** it contains the text `© 2026 Поэтический Хаб`

#### Scenario: First year after founding
- **GIVEN** the system clock reads 2027-01-01T00:00:00Z
- **WHEN** the footer renders
- **THEN** it contains the text `© 2026–2027 Поэтический Хаб`

#### Scenario: Later year
- **GIVEN** the system clock reads 2030-06-15 (UTC)
- **WHEN** the footer renders
- **THEN** it contains the text `© 2026–2030 Поэтический Хаб`

### Requirement: Footer links (FR-3)
The footer SHALL contain a navigation landmark named «Информация о проекте» holding exactly three
links, in this order: «О проекте» to `/about`, «Политика конфиденциальности» to `/privacy`,
«Связаться с нами» to `/contact`.

#### Scenario: Links, order, and targets
- **GIVEN** the footer renders
- **WHEN** the navigation landmark «Информация о проекте» is queried for links
- **THEN** it holds exactly three links
- **AND** they are, in order, «О проекте» with `href="/about"`, «Политика конфиденциальности»
  with `href="/privacy"`, and «Связаться с нами» with `href="/contact"`

### Requirement: Placeholder targets until the pages exist (FR-4)
While no page answers a footer link's path, following that link SHALL show the app's existing not-found screen with HTTP status 404, inside the root layout with the header and the footer. «О проекте» SHALL open the `/about` page (`about-page` FR-1) with HTTP 200; «Политика конфиденциальности» and «Связаться с нами» still have no page.

#### Scenario: Following a link to a page that does not exist yet
- **GIVEN** the app is running and no `/privacy` page exists
- **WHEN** the reader activates «Политика конфиденциальности» in the footer
- **THEN** the heading «Страница не найдена» is shown
- **AND** a direct document request for `/privacy` answers with status 404
- **AND** the footer is still present

#### Scenario: Following the about link
- **GIVEN** the app is running with valid Contentful settings
- **WHEN** the reader activates «О проекте» in the footer
- **THEN** the about page's title from Contentful is shown
- **AND** a direct document request for `/about` answers with status 200

