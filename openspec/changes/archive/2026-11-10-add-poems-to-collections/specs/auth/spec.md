## MODIFIED Requirements

### Requirement: Sign-out asks to confirm while poem edits are unsaved (edit-poem FR-13)
While a poem's edit form or a collection's edit form holds unsaved changes or a save is sending (poem-management, edit-poem FR-13; collection-management, add-poem-collections FR-12), pressing the header's «Выйти» SHALL NOT call the sign-out at once; it SHALL open that form's dialog «Есть несохранённые изменения» in its sign-out form (text «Если выйти сейчас, изменения пропадут.», buttons «Продолжить редактирование» and «Выйти без сохранения»). The sign-out SHALL be called only after «Выйти без сохранения»; «Продолжить редактирование», the close button, and Escape SHALL close the dialog with no sign-out request. While the collection poems page holds an unsaved selection or a save is sending (collection-management, add-poems-to-collections FR-10), pressing «Выйти» SHALL open that page's dialog in its sign-out form instead (text «Сохранить выбранные произведения перед выходом?», buttons «Сохранить изменения», «Выйти без сохранения», and «Остаться»): the sign-out SHALL be called after «Выйти без сохранения», or after «Сохранить изменения» once the save succeeds; «Остаться», the close button, Escape, and a failed save SHALL close the dialog with no sign-out request. Pressed while a save is already sending, «Выйти» SHALL open the dialog waiting for that save, every button disabled, and sign out only once it succeeds (spec-clarify, 2026-11-07). At any other time «Выйти» SHALL behave as before (PR #168 review, 2026-11-03: confirm instead of refuse).

#### Scenario: Unsaved changes, author stays
- **GIVEN** a signed-in author on a changed poem or collection edit form
- **WHEN** they press «Выйти» and then «Продолжить редактирование»
- **THEN** no sign-out request is sent, the header still shows «Выйти», and the form still holds the changes

#### Scenario: Unsaved changes, author confirms
- **GIVEN** a signed-in author on a changed poem or collection edit form
- **WHEN** they press «Выйти» and then «Выйти без сохранения»
- **THEN** exactly one sign-out request is sent and they are signed out as before; the unsaved changes are lost

#### Scenario: Confirmed, but the sign-out fails
- **GIVEN** a signed-in author on a changed poem or collection edit form, and the sign-out fails
- **WHEN** they press «Выйти» and then «Выйти без сохранения»
- **THEN** the dialog closes, the sign-out failure shows as on any other page, they are still signed in, and the form still holds the changes

#### Scenario: No unsaved changes
- **GIVEN** a signed-in reader on any page, an edit page with an unchanged form included
- **WHEN** they press «Выйти»
- **THEN** they are signed out as before, with no dialog

#### Scenario: Collection poems page, save then sign out
- **GIVEN** a signed-in author on the collection poems page with a changed selection
- **WHEN** they press «Выйти» and then «Сохранить изменения», and the save succeeds
- **THEN** the selection is stored and exactly one sign-out request is sent

#### Scenario: Collection poems page, save fails
- **GIVEN** a signed-in author on the collection poems page with a changed selection and an unreachable database
- **WHEN** they press «Выйти» and then «Сохранить изменения»
- **THEN** no sign-out request is sent, the dialog closes, the page shows the save failure alert, and the selection is kept
