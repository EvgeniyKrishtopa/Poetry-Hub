## ADDED Requirements

### Requirement: Delete button on the owner's poem page (delete-poem FR-1)
`/account/poems/<poemId>` SHALL show, below the poem, a button «Удалить произведение» in the danger style whenever the poem itself is shown. No other page SHALL offer deleting a poem: not the public poem page, not `/account/poems`.

#### Scenario: Owner's poem page
- **GIVEN** a signed-in author with the poem «Первый снег»
- **WHEN** they open `/account/poems/<its id>`
- **THEN** a button «Удалить произведение» is shown below the poem

#### Scenario: Not on the public pages or the list
- **GIVEN** the same author signed in
- **WHEN** they open `/authors/<own id>/poems/<its id>` and `/account/poems`
- **THEN** neither page shows a button «Удалить произведение»

#### Scenario: No button without the poem
- **GIVEN** a signed-in author and a poem id of another author
- **WHEN** they open `/account/poems/<that id>`
- **THEN** the 404 page renders, with no button «Удалить произведение»

### Requirement: Delete confirmation (delete-poem FR-2)
Pressing «Удалить произведение» SHALL open a modal dialog titled «Удалить произведение?» with the text ««<title>» будет удалено без возможности восстановления.», where `<title>` is the poem's title, and the buttons «Отмена» and «Удалить»; focus SHALL be on «Отмена» when it opens. Nothing SHALL be sent before «Удалить» is pressed. Closing the dialog by «Отмена», the corner close button, Escape, or a click on the backdrop SHALL delete nothing and SHALL return focus to «Удалить произведение».

#### Scenario: Dialog opens
- **GIVEN** the owner on `/account/poems/<id>` of «Первый снег»
- **WHEN** they press «Удалить произведение»
- **THEN** a modal dialog titled «Удалить произведение?» shows «Первый снег» in its text, with «Отмена» and «Удалить», and «Отмена» has focus
- **AND** no delete request has been sent

#### Scenario: Cancel in any way
- **GIVEN** the dialog is open
- **WHEN** the owner presses «Отмена», the corner close button, or Escape, or clicks the backdrop
- **THEN** the dialog closes, the poem still exists, and focus is on «Удалить произведение»

### Requirement: Deleting a poem (delete-poem FR-3)
Pressing «Удалить» SHALL send only the poem's id; the server SHALL resolve the author from the session and SHALL delete the poem only if it belongs to the signed-in author's own profile. A deleted poem's illustration file SHALL be removed after the poem, best-effort: if the file can't be removed, the failure is logged and the delete still succeeds. While sending, «Удалить» SHALL read «Удаление…», both buttons and the corner close button SHALL be disabled, and Escape and the backdrop SHALL NOT close the dialog. On success the author SHALL be taken to `/account/poems`, replacing the deleted poem's page in the browser history, and that page SHALL show «Произведение «<title>» удалено.» once, above the add link.

#### Scenario: Successful delete
- **GIVEN** the owner of «Первый снег», which has an illustration, with the dialog open
- **WHEN** they press «Удалить»
- **THEN** they land on `/account/poems`, which shows «Произведение «Первый снег» удалено.» and a list without «Первый снег»
- **AND** the poem no longer exists and its illustration file is gone from storage

#### Scenario: Sending state
- **GIVEN** a slow delete request
- **WHEN** the owner presses «Удалить»
- **THEN** the button reads «Удаление…», «Отмена», «Удалить» and the corner close button are disabled, and Escape leaves the dialog open

#### Scenario: Double click
- **GIVEN** the dialog is open
- **WHEN** the owner clicks «Удалить» twice quickly
- **THEN** one delete request is sent

#### Scenario: Illustration can't be removed
- **GIVEN** a poem with an illustration and storage that fails to remove the file
- **WHEN** the owner confirms the delete
- **THEN** the poem is deleted, the author lands on `/account/poems` with the deleted notice, and the failure is logged

#### Scenario: Notice only once
- **GIVEN** the owner has just landed on `/account/poems` with the deleted notice shown
- **WHEN** they reload the page, follow a link away and back, or leave and return with the browser's Back or Forward button
- **THEN** the notice is not shown again

#### Scenario: Back after a delete
- **GIVEN** the owner went from `/account/poems` to the poem's page and deleted it
- **WHEN** they press the browser's Back button on `/account/poems`
- **THEN** they leave `/account/poems` for the page before it, not the deleted poem's page

### Requirement: Nothing to delete (delete-poem FR-4)
When the poem no longer exists or isn't the signed-in author's, confirming SHALL change nothing, SHALL take the author to `/account/poems` as on success, and that page SHALL show «Произведение уже удалено.» once instead of the deleted notice. The response SHALL NOT tell an existing poem of another author apart from a missing one.

#### Scenario: Deleted in another tab
- **GIVEN** the owner has «Первый снег» open in two tabs and deleted it in the first
- **WHEN** they confirm the delete in the second
- **THEN** they land on `/account/poems` with «Произведение уже удалено.»

#### Scenario: Another author's poem by a crafted request
- **GIVEN** a signed-in author and a poem id of another author
- **WHEN** the delete is requested with that id
- **THEN** the other author's poem still exists and the answer is the same as for a missing poem

### Requirement: Delete failure (delete-poem FR-5)
When the poem can't be deleted — the database can't be reached, the session can't be checked, or anything unexpected — the dialog SHALL stay open and show «Не удалось удалить произведение. Попробуйте позже.» in a `role="alert"` element, the author SHALL stay on the poem page, and the poem SHALL be unchanged. The alert SHALL stay until the next «Удалить» press, which hides it and replaces it with that attempt's outcome, or until the dialog closes in any way: a dialog opened again starts with no alert.

#### Scenario: Database unreachable
- **GIVEN** the dialog is open and the database can't be reached
- **WHEN** the owner presses «Удалить»
- **THEN** the dialog shows «Не удалось удалить произведение. Попробуйте позже.» in a `role="alert"` element, the page is still `/account/poems/<id>`, and the poem exists

#### Scenario: Reopened after a failure
- **GIVEN** the dialog shows the failure alert
- **WHEN** the owner presses «Отмена» and then «Удалить произведение» again
- **THEN** the dialog opens with no alert

#### Scenario: Retry
- **GIVEN** the dialog shows the failure alert and the database is back
- **WHEN** the owner presses «Удалить» again
- **THEN** the alert is hidden while sending and the delete succeeds as in FR-3

### Requirement: Session expired while deleting (delete-poem FR-6)
When the session has ended and can't be refreshed, confirming SHALL delete nothing and SHALL take the author to `/login`, which shows «Сессия истекла. Войдите снова.» once (auth delete-poem FR-6). After signing in, the author SHALL land where a sign-in normally leads.

#### Scenario: Expired session
- **GIVEN** the owner's dialog is open and their session has ended (the refresh token is no longer valid)
- **WHEN** they press «Удалить»
- **THEN** the poem still exists and they land on `/login` with «Сессия истекла. Войдите снова.»

### Requirement: Expired access token (delete-poem FR-7)
When only the access token has expired and the session can still be refreshed, confirming SHALL delete the poem exactly as in FR-3, with no extra step for the author.

#### Scenario: Refreshable session
- **GIVEN** the owner's access token has expired and their refresh token is still valid
- **WHEN** they confirm the delete
- **THEN** the poem is deleted and they land on `/account/poems` with the deleted notice

### Requirement: Deleted poem gone everywhere (delete-poem FR-8)
After a successful delete, the next server request for `/account/poems` and the author's public page SHALL list the poem no more, and the poem's public page and `/account/poems/<poemId>` SHALL render the 404 page, with no wait for a server cache lifetime; the browser tab that ran the delete SHALL show this on every one of those pages, client-side navigation included. A page that another tab of the same browser, or another browser, already holds in its client-side router cache MAY show the old content until it reloads or that client cache expires. A failed attempt, a session-expired attempt, and a nothing-to-delete attempt SHALL NOT expire any cache.

#### Scenario: Fresh pages after a delete
- **GIVEN** an author whose public page, `/account/poems`, and the public page of «Первый снег» were just loaded and cached
- **WHEN** they delete «Первый снег» and then open `/authors/<own id>` and the poem's former public URL
- **THEN** the author page doesn't list «Первый снег», and the poem URL renders the 404 page

### Requirement: Module boundaries for deleting (delete-poem NFR-3)
Deleting SHALL live in the poem-management feature and add no new import between features: `poems` and `authors` SHALL still import nothing from poem-management, and `auth` SHALL import nothing from poem-management. The session-expired notice's store, written by poem-management and read by auth, SHALL live in `shared/`.

#### Scenario: Static check
- **GIVEN** the change is complete
- **WHEN** `src/features/poems/`, `src/features/authors/`, and `src/features/auth/` are searched for imports of `@/features/poem-management`
- **THEN** there are no matches

### Requirement: Accessible delete flow (delete-poem NFR-4)
The dialog SHALL be a modal dialog labelled by its title, with focus kept inside it while open; the failure SHALL be a `role="alert"` element; after a failure, focus SHALL be on «Удалить»; the deleted and already-deleted notices and the session-expired notice SHALL be `role="status"` elements.

#### Scenario: Dialog semantics
- **GIVEN** the dialog is open
- **WHEN** its accessibility tree is read
- **THEN** it is a modal dialog named «Удалить произведение?», and Tab cycles only through its controls

#### Scenario: Focus after a failure
- **GIVEN** a delete that fails
- **WHEN** the alert shows
- **THEN** «Удалить» has focus

#### Scenario: Notice role
- **GIVEN** a poem was just deleted
- **WHEN** `/account/poems` shows the notice
- **THEN** the notice is a `role="status"` element

### Requirement: Design tokens for deleting (delete-poem NFR-6)
The delete button and the dialog's «Удалить» SHALL use the danger tone's named design tokens; new and changed styles SHALL use named design-token utilities only: no colour literals and no Tailwind arbitrary-value colour classes.

#### Scenario: Literal search
- **GIVEN** the change is complete
- **WHEN** the new and changed component files are searched for hex, `rgb(`, `hsl(` literals and `text-[`, `bg-[`, `border-[` classes
- **THEN** there are no matches

### Requirement: Russian UI copy for deleting (delete-poem NFR-7)
Every user-facing string of the delete button, the dialog, the failure, and the notices SHALL be the delete-poem proposal's UI copy table text, verbatim.

#### Scenario: Copy matches the table
- **GIVEN** the button, the dialog in each state, and the three notices
- **WHEN** their texts are read
- **THEN** each matches the UI copy table exactly

## MODIFIED Requirements

### Requirement: Poem creation write limit (FR-6)
Each author SHALL be able to create at most 100 poems within any 30 days, counted from the poems the author created in a sliding window (the last 30 days up to the moment of the request, not a calendar month), whether or not those poems still exist: deleting a poem SHALL NOT free a place in the limit (delete-poem FR-9). There SHALL be no shorter window: within the 100, poems MAY be created in any rhythm. The limit SHALL be enforced in the database by the only operation that can store a poem, so no direct API call can bypass it, and the app SHALL check it before any upload or Contentful call. Over the limit, nothing SHALL be stored, no cache SHALL be expired, nothing SHALL be uploaded when the app's pre-check catches it, and a file already uploaded when only the database's final check catches it (two concurrent creates) SHALL be removed best-effort, and «Слишком много новых произведений. Попробуйте позже.» SHALL be shown above the submit button.

#### Scenario: Hundred-and-first poem in 30 days
- **GIVEN** an author who created 100 poems in the last 30 days
- **WHEN** they submit a valid form
- **THEN** «Слишком много новых произведений. Попробуйте позже.» is shown, every field keeps its value, no new poem exists, and no file was uploaded

#### Scenario: Quick creates within the limit
- **GIVEN** an author who created 2 poems in the last minute and fewer than 100 in the last 30 days
- **WHEN** they submit a valid form
- **THEN** the poem is created

#### Scenario: Window slides
- **GIVEN** an author with 100 poems in the last 30 days
- **WHEN** the oldest of them becomes older than 30 days and they submit again
- **THEN** the poem is created

#### Scenario: Failed attempts don't count
- **GIVEN** an author with 99 poems in the last 30 days who submits three times with an invalid illustration
- **WHEN** they then submit a valid form
- **THEN** the poem is created

#### Scenario: Direct calls can't bypass it
- **GIVEN** an author who created 100 poems in the last 30 days
- **WHEN** they try to store another poem directly through the database API
- **THEN** nothing is stored

#### Scenario: Deleting doesn't free the limit
- **GIVEN** an author who created 100 poems in the last 30 days and then deleted 10 of them
- **WHEN** they submit a valid form, or call the database's create operation directly
- **THEN** «Слишком много новых произведений. Попробуйте позже.» is shown (or the call answers over-limit), and nothing is stored

### Requirement: Database integrity under direct calls (NFR-1)
With the app bypassed and the database or Storage API called directly with the publishable key: no role SHALL insert into the poems table directly; a poem SHALL be stored only through the database's own create operation, for the caller's own public profile and within FR-6's limit; a guest SHALL NOT store a poem; nobody SHALL set a poem's id or creation time or update a poem; no role SHALL delete from the poems table directly; a poem SHALL be deleted only through the database's own delete operation, and only when it belongs to the caller's own profile, whatever else the request holds; a guest SHALL NOT delete a poem (delete-poem NFR-1); the database SHALL reject a blank or over-long title or text, a malformed genre id, and an illustration path outside the author's own folder; poems of a non-public profile SHALL NOT be readable; and illustration uploads SHALL be limited to the own folder, 5 MB, PNG and JPEG, and illustration removals to the own folder.

#### Scenario: Direct table insert
- **GIVEN** a signed-in user with a public profile
- **WHEN** they insert a row into the poems table through the database API, with their own or another profile's `author_id`
- **THEN** the insert is rejected

#### Scenario: Create operation stores only for the caller
- **GIVEN** a signed-in user with a public profile
- **WHEN** they call the database's create operation
- **THEN** the stored poem belongs to their own profile, whatever else the request holds

#### Scenario: Insert with a non-public own profile
- **GIVEN** a signed-in user whose own profile has no last name
- **WHEN** they call the database's create operation
- **THEN** nothing is stored

#### Scenario: Update and delete
- **GIVEN** a signed-in author with a poem
- **WHEN** they try to update or delete it through the poems table directly
- **THEN** nothing changes

#### Scenario: Delete operation for the owner
- **GIVEN** a signed-in author with a poem
- **WHEN** they call the database's delete operation with that poem's id
- **THEN** the poem is deleted and the answer names its illustration path, if it had one

#### Scenario: Delete operation for anyone else
- **GIVEN** a poem of author A
- **WHEN** a signed-in author B calls the delete operation with its id, and a guest calls it with its id
- **THEN** the poem still exists; B gets the same answer as for an unknown id, and the guest's call is rejected

#### Scenario: Removing another author's illustration
- **GIVEN** an illustration file in author A's folder
- **WHEN** a signed-in author B removes it through the Storage API
- **THEN** the file still exists

#### Scenario: Hidden author
- **GIVEN** a poem whose author's profile has lost its last name
- **WHEN** a guest selects poems through the database API
- **THEN** that poem is not returned

### Requirement: Server-rendered pages (NFR-2)
The three management pages SHALL be Server Components; the only client modules in poem-management SHALL be the add form (with its shared editor and picker), the created notification, the delete button with its dialog, and the deleted notice. No poem data SHALL be kept in a client cache or store, except that the created notification's store SHALL hold only the id of the poem just created, and the deleted notice's store SHALL hold only the outcome and the deleted poem's title until the notice shows (delete-poem NFR-2).

#### Scenario: Static check
- **GIVEN** the change is complete
- **WHEN** `src/features/poem-management/` and `src/app/(authorized)/account/poems/` are searched for `"use client"`
- **THEN** the only matches are the form, its components, the created notification, the delete button and its dialog, and the deleted notice

### Requirement: No poem content in logs (NFR-10)
Server logs written by poem creation, poem deletion, and poem reads SHALL carry the operation and the failure kind only, plus, for a Contentful genre entry dropped by validation, that entry's id (editorial data, not a reader's): never a poem's title, text, genre, file name, file path, or file bytes, and never a user id, email, author profile id, or poem id (delete-poem NFR-5).

#### Scenario: Failed insert log
- **GIVEN** a create whose insert fails with the title «Секрет» and the text «тайна»
- **WHEN** the failure is logged
- **THEN** the log line contains neither «Секрет» nor «тайна» nor the user's id, the author's profile id, or the poem id

#### Scenario: Failed delete and cleanup logs
- **GIVEN** a delete of the poem «Секрет» whose database call fails, and another whose illustration removal fails
- **WHEN** each failure is logged
- **THEN** neither log line contains «Секрет», the poem id, the illustration path, the user's id, or the author's profile id
