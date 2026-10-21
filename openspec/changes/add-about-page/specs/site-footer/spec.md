## MODIFIED Requirements

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
