## ADDED Requirements

### Requirement: Edited poem on the public pages (edit-poem FR-14)
After its author saves an edit, the public poem page `/authors/<id>/poems/<poemId>` and the public author page's poem list SHALL show the new title, text, genre, and illustration on the next request that reads them; a visitor whose browser already shows the old page SHALL see the new content after reloading it. The poem's date SHALL stay its creation date.

#### Scenario: Guest reloads the poem page
- **GIVEN** a guest showing «Первый снег» on its public page, and its author then renames it «Первый снег.» and removes its illustration
- **WHEN** the guest reloads the page
- **THEN** the heading «Первый снег.» is shown, no image is shown, and the date is unchanged

#### Scenario: Author page list
- **GIVEN** the same edit
- **WHEN** a guest loads the author's public page
- **THEN** the poem list shows «Первый снег.»
