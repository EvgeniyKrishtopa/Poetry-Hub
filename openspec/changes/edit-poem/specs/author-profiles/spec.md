## ADDED Requirements

### Requirement: Profile editor offline or slow (edit-poem FR-11)
While the browser reports no network connection, the profile editor SHALL show «Нет подключения к интернету. Сохранение станет доступно, когда связь восстановится.» in a `role="status"` element above its fields, and every field's «Сохранить» and «Удалить» buttons SHALL be disabled (spec-clarify, 2026-11-03: both send a request); drafts SHALL stay editable and keep their values, and «Изменить» and «Отмена» SHALL behave as before. When the connection returns, the notice SHALL go away and «Сохранить» and «Удалить» SHALL be enabled again (unless the field's own rules keep it disabled). While the browser is online but reports a slow connection (poem-management, edit-poem FR-11), the editor SHALL show «Медленное подключение к интернету. Сохранение станет доступно, когда связь улучшится.» instead, with the same rules.

#### Scenario: Offline while editing a name
- **GIVEN** the first-name field in edit mode with a changed draft
- **WHEN** the browser goes offline
- **THEN** the offline notice is shown above the fields, «Сохранить» and every field's «Удалить» are disabled, and the draft is kept

#### Scenario: Slow connection
- **GIVEN** the about field in edit mode in a browser whose connection estimate reports «slow-2g»
- **WHEN** the editor renders
- **THEN** the slow connection notice is shown above the fields and «Сохранить» is disabled

#### Scenario: Back online
- **GIVEN** the offline notice is shown with a field in edit mode
- **WHEN** the connection returns
- **THEN** the notice is gone and that field's «Сохранить» is enabled

### Requirement: Edit limit scope (edit-poem FR-7)
The database's per-user write-limit operation SHALL also count a `poem_edit` scope: 10 attempts in one minute window per user, in a fixed window, separate from `profile_write` and `photo_upload`, whose limits SHALL stay unchanged. Its counters SHALL stay out of the database API's reach like the other scopes.

#### Scenario: Poem edit scope
- **GIVEN** a signed-in user
- **WHEN** the write-limit operation is called 11 times with `poem_edit` within a minute
- **THEN** the first 10 calls are allowed and the 11th is not

#### Scenario: Other scopes unchanged
- **GIVEN** a user who used up `poem_edit` in the current minute
- **WHEN** the write-limit operation is called with `profile_write`
- **THEN** it is allowed
