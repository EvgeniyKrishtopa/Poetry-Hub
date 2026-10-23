## MODIFIED Requirements

### Requirement: Footer links (FR-3)
The footer SHALL contain a navigation landmark named «Информация о проекте» holding, in this order: the link «О проекте» to `/about`, the link «Политика конфиденциальности» to `/privacy`, and the «Связаться с нами» button that opens the contact dialog (`contact-form` FR-1). The footer SHALL render that button from a slot filled by the root layout, and it SHALL look exactly like the two links, using the same exported link class. «О проекте» SHALL open the `/about` page (`about-page` FR-1) and «Политика конфиденциальности» the `/privacy` page (`privacy-policy-page` FR-1), each with HTTP 200. No footer item SHALL link to `/contact`.

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

## REMOVED Requirements

### Requirement: Placeholder targets until the pages exist (FR-4)
**Reason**: Every footer item now has its target: `/about` and `/privacy` are pages, and «Связаться с нами» opens a dialog. `/contact` is not planned (user decision, 2026-10-23), so nothing is left to stand in for.
**Migration**: The about and privacy link scenarios move to FR-3. The `/contact` placeholders (path constant, footer test row, the 404 checks in the recorded browser scenarios) are deleted by `add-contact-form` task 3.3.
