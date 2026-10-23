# site-footer Specification

## Purpose
Defines the site footer shown on every page: its placement, the copyright notice (founding year to current year),
and the links to the about and privacy pages, plus the button that opens the contact dialog.
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
The footer SHALL contain a navigation landmark named «Информация о проекте» holding, in this order: the link «О проекте» to `/about`, the link «Политика конфиденциальности» to `/privacy`, and the «Связаться с нами» button that opens the contact dialog (`contact-form` FR-1). The footer SHALL render that button itself, through the contact feature's public API, and it SHALL look exactly like the two links, using the same exported link class. «О проекте» SHALL open the `/about` page (`about-page` FR-1) and «Политика конфиденциальности» the `/privacy` page (`privacy-policy-page` FR-1), each with HTTP 200. No footer item SHALL link to `/contact`.

#### Scenario: Links, order, and targets
- **GIVEN** the footer renders
- **WHEN** the navigation landmark «Информация о проекте» is queried
- **THEN** it holds exactly two links, in order, «О проекте» with `href="/about"` and «Политика конфиденциальности» with `href="/privacy"`
- **AND** after them, the button «Связаться с нами» with `aria-haspopup="dialog"`, carrying the same link class as the two links
- **AND** no element in the footer has `href="/contact"`

#### Scenario: Following the about link
- **GIVEN** the app is running with valid Contentful settings
- **WHEN** the reader activates «О проекте» in the footer
- **THEN** the about page's title from Contentful is shown
- **AND** a direct document request for `/about` answers with status 200

#### Scenario: Following the privacy policy link
- **GIVEN** the app is running with valid Contentful settings
- **WHEN** the reader activates «Политика конфиденциальности» in the footer
- **THEN** the privacy policy's title from Contentful is shown
- **AND** a direct document request for `/privacy` answers with status 200

