## ADDED Requirements

### Requirement: The new-password page is not in the sitemap (password-recovery FR-13)
`/sitemap.xml` SHALL NOT list `/reset-password`, in addition to the pages FR-9 already excludes.

#### Scenario: Reset-password is not listed
- **GIVEN** any state of the database
- **WHEN** a crawler requests `/sitemap.xml`
- **THEN** no listed URL is `/reset-password`
