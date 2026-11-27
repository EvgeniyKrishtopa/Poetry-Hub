## MODIFIED Requirements

### Requirement: Choose from the page (FR-8)
A signed-in admin whose session is `aal2` SHALL see a «Показать на главной» control on every public poem page and every public author page, including the admin's own poem and own author page (the moderation controls stay hidden there; this control checks only that the reader is an admin with the second factor). Pressing it SHALL add that poem or author at the end of its list. A guest, a non-admin or an admin below `aal2` SHALL NOT see the control and the page SHALL NOT make an admin check for them beyond the existing one-per-request answer. At most 4 poems and at most 4 authors can be chosen: pressing it when the list is full SHALL change nothing and show a message that the limit is reached; pressing it for an entry already chosen SHALL change nothing and say it is already shown.

#### Scenario: Admin adds a poem
- **GIVEN** an admin and 3 chosen poems
- **WHEN** the admin presses «Показать на главной» on a public poem page
- **THEN** the poem becomes the fourth chosen poem and a success message is shown
- **AND** the next request for `/` lists it as the fourth card

#### Scenario: Limit reached
- **GIVEN** an admin and 4 chosen poems
- **WHEN** the admin presses the control on a fifth poem
- **THEN** nothing is written and a message says the limit of 4 is reached

#### Scenario: Already chosen
- **GIVEN** a poem that is already chosen
- **WHEN** an admin presses the control on its page
- **THEN** nothing is written and a message says it is already on the home page

#### Scenario: Admin's own poem
- **GIVEN** an admin who has a public author profile and a poem of their own
- **WHEN** they open that poem's page
- **THEN** «Показать на главной» is shown and works
- **AND** the delete and add-to-review-list controls are not shown

#### Scenario: Author page
- **GIVEN** an admin and 2 chosen authors
- **WHEN** the admin presses the control on a public author page
- **THEN** the author becomes the third chosen author

#### Scenario: Guest sees no control
- **GIVEN** a signed-out visitor
- **WHEN** they open a poem page
- **THEN** no «Показать на главной» control is rendered

#### Scenario: Admin without the second factor
- **GIVEN** an admin with an `aal1` session
- **WHEN** they open a public poem page
- **THEN** no «Показать на главной» control is rendered
