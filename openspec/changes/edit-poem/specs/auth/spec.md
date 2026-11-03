## ADDED Requirements

### Requirement: Sign-out waits for unsaved poem edits (edit-poem FR-13)
While a poem's edit form holds unsaved changes or a save is sending (poem-management, edit-poem FR-13), pressing the header's «Выйти» SHALL NOT call the sign-out and SHALL open that form's dialog «Есть несохранённые изменения». At any other time «Выйти» SHALL behave as before.

#### Scenario: Unsaved changes
- **GIVEN** a signed-in author on a changed poem edit form
- **WHEN** they press «Выйти»
- **THEN** no sign-out request is sent, the dialog «Есть несохранённые изменения» opens, and the header still shows «Выйти»

#### Scenario: No unsaved changes
- **GIVEN** a signed-in reader on any page, the edit page with an unchanged form included
- **WHEN** they press «Выйти»
- **THEN** they are signed out as before
