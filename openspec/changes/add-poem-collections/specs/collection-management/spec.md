## ADDED Requirements

### Requirement: Create page and form (FR-3)
`/account/poems/collections/new` SHALL show the level-1 heading «Создание сборника» and a form with a text input «Название сборника», a multi-line text area «Описание (необязательно)», and the submit button «Создать сборник». Both values SHALL be trimmed before they are checked and stored. The title SHALL be required and at most 80 characters (code points) after trimming; the description SHALL be at most 1000 characters after trimming, and a blank description SHALL be stored as no description. The browser SHALL check the fields before sending and show each field's error under it («Обязательное поле.», «Не более 80 символов.», «Не более 1000 символов.»), with focus on the first invalid field; the server SHALL apply the same rules again. While the request is sending, the button SHALL read «Создание…», the whole form SHALL be disabled and dimmed, and a second press SHALL send nothing. A signed-in reader whose own profile is missing or not public SHALL see «Чтобы создавать сборники, укажите имя и фамилию в профиле автора.» and the link «Перейти к профилю автора» (`/account/author`) instead of the form. While loading, the page SHALL show the heading and a form skeleton.

#### Scenario: Empty title
- **GIVEN** a signed-in author with a public profile on the create page
- **WHEN** they leave «Название сборника» blank (or only spaces) and press «Создать сборник»
- **THEN** no request is sent, «Обязательное поле.» shows under the title, and focus is on the title input

#### Scenario: Over-long fields
- **GIVEN** the create page
- **WHEN** the author enters an 81-character title and a 1001-character description and presses «Создать сборник»
- **THEN** no request is sent, «Не более 80 символов.» and «Не более 1000 символов.» show under their fields, and focus is on the title input

#### Scenario: Server repeats the checks
- **GIVEN** a request to the create action that bypasses the browser check with a blank title
- **WHEN** the server receives it
- **THEN** nothing is stored and the answer is `invalid` with the title's error

#### Scenario: Sending
- **GIVEN** a valid form
- **WHEN** the author double-clicks «Создать сборник»
- **THEN** the button reads «Создание…», the form is disabled, and exactly one collection is created

#### Scenario: Profile not public
- **GIVEN** a signed-in reader whose profile has no last name
- **WHEN** they open `/account/poems/collections/new`
- **THEN** the not-public text and «Перейти к профилю автора» are shown and no form is shown

### Requirement: Creating a collection (FR-4)
The browser SHALL send only the title and the description; the server SHALL take the author from the session and store the collection for the caller's own public profile. On success the author SHALL be taken to `/account/poems`, replacing the create page in the history, where «Сборник «<title>» создан.» SHALL be shown once (a reload or a later visit shows nothing) and the new collection SHALL be listed in «Сборники произведений». A failure SHALL show its message in a `role="alert"` element above the submit button, keep both values, and move focus to the alert: «Чтобы создавать сборники, укажите имя и фамилию в профиле автора.» when the profile stopped being public, «Сохранение сейчас недоступно. Попробуйте позже.» when the service is unavailable, «Что-то пошло не так. Попробуйте ещё раз.» otherwise. When the session can't be refreshed, nothing SHALL be stored and the author SHALL be taken to `/login`, which shows «Сессия истекла. Войдите снова.» once.

#### Scenario: Created
- **GIVEN** a signed-in author with a public profile and no collections
- **WHEN** they create «Осенний цикл» with the description «Стихи октября»
- **THEN** they are on `/account/poems`, «Сборник «Осенний цикл» создан.» is shown, and the section «Сборники произведений» lists «Осенний цикл»
- **AND** pressing the browser's Back button does not return to the filled create form

#### Scenario: Notice shows once
- **GIVEN** the author just saw «Сборник «Осенний цикл» создан.»
- **WHEN** they reload `/account/poems`
- **THEN** the notice is not shown and the collection is still listed

#### Scenario: Service unavailable
- **GIVEN** the database can't be reached
- **WHEN** the author submits a valid form
- **THEN** «Сохранение сейчас недоступно. Попробуйте позже.» is shown above the button, focus is on it, and both fields keep their values

#### Scenario: Session expired
- **GIVEN** an author whose session can't be refreshed
- **WHEN** they submit a valid form
- **THEN** nothing is stored, they land on `/login`, and «Сессия истекла. Войдите снова.» is shown once

### Requirement: Collection create limit (FR-5)
An author SHALL be able to create at most 50 collections in any 30 days, counted over creations — a deleted collection still counts until it is 30 days old. The database function that inserts SHALL enforce the limit, so a direct API call can't skip it. Over the limit, nothing SHALL be stored and the form SHALL show «Слишком много новых сборников. Попробуйте позже.» in its alert, values kept.

#### Scenario: Fifty-first collection
- **GIVEN** an author who created 50 collections in the last 30 days and deleted 10 of them
- **WHEN** they submit the create form
- **THEN** nothing is stored and «Слишком много новых сборников. Попробуйте позже.» is shown

### Requirement: Collection page (FR-6)
`/account/poems/collections/<collectionId>` SHALL show the collection's title as the level-1 heading, its description split into paragraphs on blank lines when it has one, a single line break inside a paragraph shown as a line break (spec-clarify, 2026-11-04), and below them the link styled as a button «Редактировать сборник» (to `/account/poems/collections/<collectionId>/edit`) and the danger button «Удалить сборник», in one row, edit first. An id that isn't one of the signed-in author's collections — unknown, malformed, or another author's — or any collection while the own profile isn't public SHALL render the 404 page. A failed read SHALL show the generic error screen. While loading, the page SHALL show a skeleton.

#### Scenario: Own collection
- **GIVEN** a signed-in author with the collection «Осенний цикл», description «Стихи октября»
- **WHEN** they open its page
- **THEN** the heading «Осенний цикл», the paragraph «Стихи октября», «Редактировать сборник», and «Удалить сборник» are shown

#### Scenario: Line breaks in the description
- **GIVEN** a description «Стихи октября\nи ноября\n\nБез посвящений»
- **WHEN** its author opens the collection page
- **THEN** two paragraphs are shown, the first on two lines «Стихи октября» / «и ноября», the second «Без посвящений»

#### Scenario: No description
- **GIVEN** a collection stored without a description
- **WHEN** its author opens its page
- **THEN** only the heading and the two buttons are shown, with no empty paragraph

#### Scenario: Another author's collection
- **GIVEN** a signed-in author and a collection id of another author
- **WHEN** they open `/account/poems/collections/<that id>`
- **THEN** the 404 page renders

#### Scenario: Read fails
- **GIVEN** the database can't be reached
- **WHEN** the author opens one of their collection pages
- **THEN** the generic error screen is shown

### Requirement: Collection edit page (FR-7)
`/account/poems/collections/<collectionId>/edit` SHALL show the level-1 heading «Редактирование сборника» and the create form's fields, rules, and messages, filled with the stored title and description (an empty text area when there is none). The 404, error, and loading rules SHALL be the collection page's.

#### Scenario: Filled form
- **GIVEN** the collection «Осенний цикл» with the description «Стихи октября»
- **WHEN** its author opens its edit page
- **THEN** «Редактирование сборника» is shown, the title input holds «Осенний цикл», and the text area holds «Стихи октября»

#### Scenario: Another author's collection
- **GIVEN** a collection id of another author
- **WHEN** a signed-in author opens its edit page
- **THEN** the 404 page renders

### Requirement: Collection change detection (FR-8)
The edit form SHALL count as changed exactly when saving would store something different: the trimmed title or the trimmed description (blank read as none) differs from the stored one. While unchanged, it SHALL show the link «Вернуться к сборнику» to the collection page and no save or discard button; while changed, «Сохранить изменения» and «Отменить изменения» and not that link. «Отменить изменения» SHALL put both fields back to the values the page opened with, clear field errors and the failure alert, send nothing, ask no confirmation, and move focus to «Вернуться к сборнику». While a save is sending, «Отменить изменения» SHALL be disabled.

#### Scenario: Only spaces added
- **GIVEN** the edit page of «Осенний цикл»
- **WHEN** the author adds a space at the end of the title
- **THEN** «Вернуться к сборнику» is still shown and no «Сохранить изменения» exists

#### Scenario: Real change, then discard
- **GIVEN** the author changed the description
- **WHEN** they press «Отменить изменения»
- **THEN** both fields hold the stored values, «Вернуться к сборнику» is shown and focused, and no request was sent

### Requirement: Saving a collection edit (FR-9)
The browser SHALL send the collection id and both fields; the server SHALL take the author from the session, and the database SHALL change only the title and the description, and only of a collection belonging to the caller's own public profile. While sending, the button SHALL read «Сохранение…», the form SHALL be disabled and dimmed, and a double click SHALL save once. On success the author SHALL be taken to the collection page (a history push), which SHALL show «Изменения сохранены.» once and the new values.

#### Scenario: Saved
- **GIVEN** the edit page of «Осенний цикл»
- **WHEN** the author changes the title to «Осенний цикл 2026» and presses «Сохранить изменения»
- **THEN** they are on the collection page, «Изменения сохранены.» is shown, and the heading reads «Осенний цикл 2026»

#### Scenario: Back after a save
- **GIVEN** the author just saved and is on the collection page
- **WHEN** they press the browser's Back button
- **THEN** the edit page shows the saved values and the link «Вернуться к сборнику»

### Requirement: Collection edit limit (FR-10)
An author SHALL be able to make at most 10 save attempts per minute on collection edits, counted per signed-in account after the session check and before the update. Over the limit, nothing SHALL be changed and the alert SHALL read «Слишком много сохранений. Попробуйте через минуту.», values kept.

#### Scenario: Eleventh save in a minute
- **GIVEN** an author who made 10 collection save attempts in the last minute
- **WHEN** they press «Сохранить изменения»
- **THEN** nothing is changed and «Слишком много сохранений. Попробуйте через минуту.» is shown above the form

### Requirement: Collection edit failures (FR-11)
A failure that keeps the author on the edit page SHALL show its message in a `role="alert"` element above the form, keep every value, move focus to the alert, and leave «Сохранить изменения» enabled; nothing SHALL retry on its own. The messages SHALL be the poem edit form's: «Сохранение сейчас недоступно. Попробуйте позже.», «Что-то пошло не так. Попробуйте ещё раз.», and «Чтобы сохранять изменения, укажите имя и фамилию в профиле автора.» when the own profile stopped being public. When the session can't be refreshed, nothing SHALL be saved and the author SHALL be taken to `/login` with «Сессия истекла. Войдите снова.» once. When the collection no longer exists (deleted in another tab), nothing SHALL be saved and the author SHALL be taken to `/account/poems`, which shows «Сборник уже удалён.» once.

#### Scenario: Service unavailable
- **GIVEN** a changed edit form and an unreachable database
- **WHEN** the author presses «Сохранить изменения»
- **THEN** «Сохранение сейчас недоступно. Попробуйте позже.» is shown above the form, focused, and the changed values stay

#### Scenario: Deleted in another tab
- **GIVEN** a changed edit form whose collection was deleted in another tab
- **WHEN** the author presses «Сохранить изменения»
- **THEN** they are on `/account/poems` and «Сборник уже удалён.» is shown once

#### Scenario: Profile no longer public
- **GIVEN** a changed edit form and the author cleared their last name in another tab
- **WHEN** they press «Сохранить изменения»
- **THEN** nothing is saved, the alert reads «Чтобы сохранять изменения, укажите имя и фамилию в профиле автора.», and the values stay

#### Scenario: Session expired
- **GIVEN** a changed edit form and a session that can't be refreshed
- **WHEN** the author presses «Сохранить изменения»
- **THEN** nothing is saved and they land on `/login` with «Сессия истекла. Войдите снова.»

### Requirement: Leaving the collection edit page with unsaved changes (FR-12)
While the edit form is changed, and while a save is sending, a click on any link to a page other than this collection's page or its edit page SHALL NOT navigate; the dialog «Есть несохранённые изменения» SHALL say «Сначала сохраните изменения.» with «Продолжить редактирование». Closing the tab, reloading, or typing an address SHALL show the browser's own leave confirmation. «Выйти» SHALL ask first, as on the poem edit page (auth). Back/Forward SHALL NOT be blocked; going to the collection page and back (by link or Back/Forward) SHALL show the unsaved values while Next keeps the hidden page, unless the collection was deleted meanwhile: then returning to the edit page SHALL show the 404 page and the unsaved values are dropped (spec-clarify, 2026-11-04).

#### Scenario: Header link blocked
- **GIVEN** a changed edit form
- **WHEN** the author clicks «Наши авторы» in the header
- **THEN** the page stays, and the dialog «Есть несохранённые изменения» with «Сначала сохраните изменения.» opens

#### Scenario: The collection page is allowed
- **GIVEN** a changed edit form
- **WHEN** the author follows a link to this collection's page and then returns with Back
- **THEN** the collection page opened, and the edit form shows the unsaved values again

#### Scenario: Deleted while the draft was hidden
- **GIVEN** a changed edit form, and the author followed the link to this collection's page and deleted the collection there
- **WHEN** they return to the edit page with the browser's Back button
- **THEN** the 404 page renders and no unsaved values are shown

#### Scenario: Unchanged form
- **GIVEN** an unchanged edit form
- **WHEN** the author clicks any header link
- **THEN** the page navigates with no dialog

### Requirement: Deleting a collection (FR-13)
«Удалить сборник» SHALL open a dialog titled «Удалить сборник?» with «Сборник «<title>» будет удалён без возможности восстановления.», «Отмена» (focused on open) and the danger button «Удалить». Closing the dialog in any way SHALL delete nothing and return focus to «Удалить сборник». The browser SHALL send only the collection id; the server SHALL take the author from the session, and the database SHALL delete only a collection belonging to the caller's own profile. While deleting, «Удалить» SHALL read «Удаление…», both buttons SHALL be disabled, the dialog SHALL not close, and a double click SHALL delete once. On success the author SHALL be taken to `/account/poems` (replacing the collection page in the history), which SHALL show «Сборник «<title>» удалён.» once and list the remaining collections; with none left, the section «Сборники произведений» SHALL not be rendered. When the collection no longer exists, the author SHALL be taken to `/account/poems` with «Сборник уже удалён.» once. A failure SHALL show «Не удалось удалить сборник. Попробуйте позже.» in a `role="alert"` element in the open dialog and change nothing. When the session can't be refreshed, nothing SHALL be deleted and the author SHALL be taken to `/login` with «Сессия истекла. Войдите снова.» once.

#### Scenario: Cancel
- **GIVEN** the dialog is open
- **WHEN** the author presses «Отмена», ×, or Escape
- **THEN** the dialog closes, the collection still exists, and focus is on «Удалить сборник»

#### Scenario: Deleted, others remain
- **GIVEN** an author with the collections «Осенний цикл» and «Весна»
- **WHEN** they delete «Осенний цикл»
- **THEN** they are on `/account/poems`, «Сборник «Осенний цикл» удалён.» is shown, and the section lists only «Весна»

#### Scenario: Last one deleted
- **GIVEN** an author with only «Осенний цикл»
- **WHEN** they delete it
- **THEN** they are on `/account/poems`, the deleted notice is shown, and no «Сборники произведений» heading or list exists

#### Scenario: Already deleted
- **GIVEN** the collection was deleted in another tab
- **WHEN** the author confirms the delete
- **THEN** they are on `/account/poems` and «Сборник уже удалён.» is shown once

#### Scenario: Failure
- **GIVEN** an unreachable database
- **WHEN** the author confirms the delete
- **THEN** «Не удалось удалить сборник. Попробуйте позже.» is shown in the open dialog and the collection still exists

### Requirement: Offline or slow connection on collection pages (FR-14)
While the browser reports no connection, or its own estimate reports a slow one, the create form, the edit form, the collection page, and the open delete dialog SHALL show the existing offline or slow notice (the add form's texts) — above the form, above the button row, or above the dialog's buttons — and «Создать сборник», «Сохранить изменения», «Удалить сборник», and the dialog's «Удалить» SHALL be disabled; they SHALL be enabled again when the connection is back. «Удалить сборник» SHALL be disabled with `aria-disabled="true"` (announced as disabled, presses ignored, still focusable), so focus can return to it when the dialog closes; the other three use the native `disabled` attribute (spec-clarify, 2026-11-04). Fields, links, «Отменить изменения», and «Отмена» SHALL stay enabled. A request that fails because the connection dropped SHALL keep every value and show the offline notice, not a failure alert.

#### Scenario: Offline on the edit form
- **GIVEN** a changed edit form
- **WHEN** the browser goes offline
- **THEN** «Нет подключения к интернету. Сохранение станет доступно, когда связь восстановится.» is shown above the form, «Сохранить изменения» is disabled, and the fields stay editable
- **AND** when the browser is online again, the notice goes and «Сохранить изменения» is enabled

#### Scenario: Offline on the collection page
- **GIVEN** a collection page
- **WHEN** the browser goes offline
- **THEN** the offline notice is shown above the buttons, «Удалить сборник» is disabled, and «Редактировать сборник» stays a working link

#### Scenario: Offline while the delete dialog is open
- **GIVEN** the delete dialog is open
- **WHEN** the browser goes offline
- **THEN** the offline notice is shown inside the dialog above its buttons and the dialog's «Удалить» is disabled, while «Отмена» stays enabled

### Requirement: Collections fresh after every write (FR-15)
After a create, a save, or a delete, the author's next screen and every page they reach afterwards in that tab, by link or by Back/Forward, SHALL show the current collections: the list on `/account/poems`, whether its section is shown, and each collection's title and description.

#### Scenario: Back after a delete
- **GIVEN** an author who opened «Осенний цикл» from `/account/poems` and deleted it, so the delete replaced the collection page in the history with `/account/poems`
- **WHEN** they press Back, then Forward
- **THEN** every page reached is `/account/poems` or an earlier page, none of them lists «Осенний цикл», and the collection page is never reached through history
- **AND** opening the collection's old address directly shows the 404 page

### Requirement: Guests can't reach collection pages (FR-16)
A signed-out page request for `/account/poems/collections/new`, `/account/poems/collections/<id>`, or `/account/poems/collections/<id>/edit` SHALL be redirected to `/login` before the page renders, and each page SHALL also check the session itself.

#### Scenario: Guest
- **GIVEN** a signed-out visitor
- **WHEN** they request any of the three paths
- **THEN** the response is a redirect to `/login`, and no collection content is rendered

### Requirement: Collection database integrity (NFR-1)
Collections SHALL be readable only by their author: `anon` SHALL have no access, and a signed-in reader SHALL see only rows of their own profile. No client role SHALL insert, update, or delete a row directly; the only writes SHALL be the three `security definer` functions, each resolving the owner from the session and taking no author argument. Updates SHALL change only the title and the description; create and update SHALL require a public own profile; delete SHALL not. The table's checks SHALL reject a blank or over-long title, an over-long description, and an empty-string description.

#### Scenario: Direct calls
- **GIVEN** pgTAP tests as `anon`, as another author, and as the owner
- **WHEN** they select, insert, update, and delete collections directly and call the three functions
- **THEN** `anon` can do nothing, another author sees no rows and gets `not-found` from update and delete, direct writes fail for every role, and only the owner's function calls change the owner's rows

### Requirement: Server-rendered collection pages (NFR-2)
The three collection pages and the section on `/account/poems` SHALL be Server Components; the only client modules in `collection-management` SHALL be the create form, the edit form (with their shared fields, form hook, and the edit form's leave guard), the leave dialog, the collection page's connection-aware button row, the delete button with its dialog, the one-time list notice, and the saved notice. No collection data SHALL be kept in a client cache or store, except that the list notice's store SHALL hold the outcome and one title until the notice shows, and the saved notice's store only the id of the collection just saved.

#### Scenario: Static check
- **GIVEN** the change is complete
- **WHEN** `src/features/collection-management/` and `src/app/(authorized)/account/poems/collections/` are searched for `"use client"`
- **THEN** the only matches are the modules listed above

### Requirement: Collection module boundaries (NFR-3)
Collections SHALL live in their own feature, imported only through its public API by `breadcrumbs` and the route files; `poem-management` and `collection-management` SHALL NOT import each other, and `/account/poems`'s route file SHALL compose them through slot props. The feature SHALL import `auth` and `authors` only through their public APIs and nothing from `poems` or `poem-management`. It SHALL repeat the poem flows' logic in its own files — its form hook, leave guard, leave dialog, and write-log helpers — and SHALL reuse from `shared/` only domain-free code that is already there (the connection status and its notice, the leave-block store and its answers, the one-time notice hook, the session-expired store, the Supabase clients and error classifier, the UI primitives) plus the new `TextAreaField` primitive (user decision, 2026-11-04).

#### Scenario: Static check
- **GIVEN** the change is complete
- **WHEN** `src/features/collection-management/` is searched for `@/features/poems`, `@/features/poem-management`, and `navigator.onLine`, and `src/features/poem-management/` for `@/features/collection-management`
- **THEN** there are no matches
- **AND** `beforeunload` appears in `collection-management` only in its edit form's leave guard

### Requirement: Accessible collection flows (NFR-4)
Every field SHALL have a visible label tied to it, its error announced through `aria-describedby` and `aria-invalid`; failure alerts SHALL use `role="alert"`, the one-time notices and the connection notice `role="status"`; the section SHALL be a `<section>` labelled by its level-2 heading; the dialog SHALL be the shared `Dialog` with its title as its accessible name; every action SHALL be reachable and usable by keyboard alone.

#### Scenario: Keyboard only
- **GIVEN** a keyboard-only author
- **WHEN** they create, open, edit, and delete a collection
- **THEN** every step works with Tab, Enter, Space, and Escape, and focus lands where the requirements above say

### Requirement: No collection content in logs (NFR-5)
Server log lines from collection writes and reads SHALL carry the operation and the failure kind only — never a title, a description, a collection id, or an author id.

#### Scenario: Failed save logged
- **GIVEN** an update that fails in the database
- **WHEN** the log line is written
- **THEN** it reads `[collection-management] <operation> failed: <error class or code>` and holds none of the values

### Requirement: Design tokens for collections (NFR-6)
The new components SHALL style with the project's design tokens and shared primitives only — no color literals or arbitrary values — and the delete buttons SHALL use the danger tone.

#### Scenario: Static check
- **GIVEN** the change is complete
- **WHEN** `src/features/collection-management/` and the new `shared/ui` component are searched for hex, `rgb(`, and `hsl(` literals
- **THEN** there are no matches

### Requirement: Russian UI copy for collections (NFR-7)
Every user-facing string SHALL match the proposal's UI copy table verbatim and live in the feature's messages module (or the shared component that owns it).

#### Scenario: Copy check
- **GIVEN** the change is complete
- **WHEN** the messages module is compared with the proposal's table
- **THEN** every entry matches character for character

### Requirement: Rendering modes of collection routes (NFR-8)
The three collection routes SHALL build as partially prerendered routes: the static shell (heading where static, skeleton) prerendered, the session and data reads inside a Suspense boundary at request time, with no route segment config.

#### Scenario: Build output
- **GIVEN** `npm run build`
- **WHEN** the route list is printed
- **THEN** the three collection routes are marked partially prerendered, like `/account/poems/[poemId]/edit`
