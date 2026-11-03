## ADDED Requirements

### Requirement: Edit button on the owner's poem page (edit-poem FR-1)
`/account/poems/<poemId>` SHALL show, below the poem and next to «Удалить произведение», a link styled as a button «Редактировать произведение» leading to `/account/poems/<poemId>/edit`, whenever the poem itself is shown. No other page SHALL offer editing a poem: not the public poem page, not `/account/poems`.

#### Scenario: Owner's poem page
- **GIVEN** a signed-in author with the poem «Первый снег»
- **WHEN** they open `/account/poems/<its id>`
- **THEN** «Редактировать произведение» and «Удалить произведение» are shown in one row below the poem, «Редактировать произведение» first
- **AND** activating «Редактировать произведение» opens `/account/poems/<its id>/edit`

#### Scenario: Not on the public pages or the list
- **GIVEN** the same author signed in
- **WHEN** they open `/authors/<own id>/poems/<its id>` and `/account/poems`
- **THEN** neither page shows «Редактировать произведение»

### Requirement: Edit page (edit-poem FR-2)
`/account/poems/<poemId>/edit` SHALL show the level-1 heading «Редактирование произведения» and the add form's fields, toolbar, counter, and genre options (poem-management FR-3), filled with the poem's stored title, text, genre, and illustration. The genre dropdown SHALL select the stored genre when it is still offered, «Без жанра» when the poem has none, and «—» when the stored genre is no longer offered. A `poemId` that isn't one of the signed-in author's poems — unknown, malformed, or another author's — or any poem while the own profile isn't public SHALL render the 404 page. A failed poem read SHALL show the generic error screen; a failed genre read SHALL show «Список жанров сейчас недоступен. Попробуйте позже.» in a `role="alert"` element and no form. A signed-out visitor SHALL be taken to `/login`. While loading, the page SHALL show the heading and the add page's form skeleton.

#### Scenario: Filled form
- **GIVEN** a signed-in author with the poem «Первый снег», genre «Лирика», and an illustration
- **WHEN** they open `/account/poems/<its id>/edit`
- **THEN** the heading «Редактирование произведения» is shown, the title input holds «Первый снег», the editor holds the stored text, «Лирика» is selected, and the stored illustration is shown as a preview

#### Scenario: Stored genre no longer offered
- **GIVEN** a poem whose stored genre was removed from Contentful
- **WHEN** its author opens the edit page
- **THEN** «—» is selected in the genre dropdown and every other field holds its stored value

#### Scenario: Another author's poem
- **GIVEN** a signed-in author and a poem id of a different author
- **WHEN** they open `/account/poems/<that id>/edit`
- **THEN** the 404 page renders

#### Scenario: Read fails
- **GIVEN** a signed-in author and a database that can't be reached
- **WHEN** they open the edit page of their poem
- **THEN** the generic error screen «Что-то пошло не так» is shown

#### Scenario: Genres can't be read
- **GIVEN** Contentful can't be reached
- **WHEN** the author opens the edit page of their poem
- **THEN** the heading and «Список жанров сейчас недоступен. Попробуйте позже.» in a `role="alert"` element are shown, and no form is shown

### Requirement: Change detection (edit-poem FR-3)
The edit form SHALL count as changed exactly when saving it would store something different: the title or the text after poem-management FR-4's normalization differs from the stored one, the selected genre differs from the one selected when the page opened, the stored illustration was removed, or a new valid illustration was picked. While the form is unchanged, it SHALL show the link «Вернуться на страницу произведения» to `/account/poems/<poemId>` and no save or discard button; while it is changed, it SHALL show «Сохранить изменения» and «Отменить изменения» and not that link. «Отменить изменения» SHALL put every field back to the values the page opened with — the stored illustration's preview included — clear the field errors and the failure alert, send nothing, ask no confirmation, and move focus to «Вернуться на страницу произведения». While a save is sending, «Отменить изменения» SHALL be disabled.

#### Scenario: Nothing changed
- **GIVEN** the edit page just opened
- **WHEN** it renders
- **THEN** «Вернуться на страницу произведения» is shown and no «Сохранить изменения» button exists

#### Scenario: A real change
- **GIVEN** the edit page of «Первый снег»
- **WHEN** the author changes the title to «Первый снег.»
- **THEN** «Сохранить изменения» is shown and «Вернуться на страницу произведения» is not

#### Scenario: Change undone
- **GIVEN** the author typed a letter into the text
- **WHEN** they delete that letter again
- **THEN** «Вернуться на страницу произведения» is shown again and no save button exists

#### Scenario: Discarding changes
- **GIVEN** the edit page of «Первый снег», which has an illustration, with the title changed to «Черновик», a text error shown, and the illustration removed
- **WHEN** the author activates «Отменить изменения»
- **THEN** the title input holds «Первый снег», the stored text and genre are back, the stored illustration's preview with «Заменить иллюстрацию» and «Удалить иллюстрацию» is shown, no field error is shown, no request was sent, and «Вернуться на страницу произведения» is shown with focus on it

#### Scenario: Only trimmed whitespace
- **GIVEN** the edit page of «Первый снег»
- **WHEN** the author adds two spaces after the title and an empty line after the text
- **THEN** the form still shows «Вернуться на страницу произведения»

#### Scenario: Illustration removed or picked
- **GIVEN** the edit page of a poem with an illustration, and another of a poem without one
- **WHEN** the author activates «Удалить иллюстрацию» on the first, and picks a valid PNG on the second
- **THEN** each form shows «Сохранить изменения»

### Requirement: Replacing or removing the illustration (edit-poem FR-4)
On the edit page, a stored illustration SHALL be shown as a preview with the picker button «Заменить иллюстрацию» and a button «Удалить иллюстрацию». A newly picked valid file SHALL replace the preview, with the same two buttons. «Удалить иллюстрацию» SHALL hide the preview and leave no illustration chosen, with the picker button «Выбрать иллюстрацию». On save, a removed illustration SHALL be removed from the poem, and a picked one SHALL become the poem's illustration; in both cases the previous file SHALL be removed from storage after the poem no longer refers to it, best-effort: a file that can't be removed is logged and the save still succeeds. A save that fails SHALL leave the poem's illustration and its file as they were, and SHALL remove a file it uploaded, best-effort.

#### Scenario: Stored illustration
- **GIVEN** a poem with an illustration
- **WHEN** its author opens the edit page
- **THEN** the illustration's preview, «Заменить иллюстрацию», and «Удалить иллюстрацию» are shown

#### Scenario: Removing the illustration
- **GIVEN** the edit page of a poem with an illustration
- **WHEN** the author activates «Удалить иллюстрацию» and saves
- **THEN** the poem's pages show no image, and the old file is gone from storage

#### Scenario: Replacing the illustration
- **GIVEN** the edit page of a poem with an illustration
- **WHEN** the author picks a valid JPEG through «Заменить иллюстрацию» and saves
- **THEN** the poem's pages show the new image, and the old file is gone from storage

#### Scenario: Removing a newly picked file
- **GIVEN** the edit page of a poem with an illustration, after the author picked a new file
- **WHEN** they activate «Удалить иллюстрацию»
- **THEN** no preview is shown and «Выбрать иллюстрацию» is shown; the stored illustration is not shown again

#### Scenario: Old file can't be removed
- **GIVEN** a replace whose removal of the old file fails in storage
- **WHEN** the author saves
- **THEN** the save succeeds, the poem shows the new image, and the failure is logged

#### Scenario: Failed save keeps the illustration
- **GIVEN** a replace whose database update fails after the new file was uploaded
- **WHEN** the author saves
- **THEN** the poem still shows the old image, the old file still exists, and the uploaded file is removed

### Requirement: Field checks when editing (edit-poem FR-5)
The edit form SHALL apply poem-management FR-4's rules, messages, and timing unchanged: required title, text, and genre; the length limits; the illustration's rules checked on pick, with the form not sending while its error is shown; the browser check before sending and the server check again; focus on the first invalid field (poem-management NFR-7). A genre that is no longer offered SHALL be reported under the genre as in the add form. An invalid submission SHALL change nothing.

#### Scenario: Empty title
- **GIVEN** the edit page
- **WHEN** the author clears the title and saves
- **THEN** «Обязательное поле.» is shown under the title, focus moves to the title input, nothing is sent, and the poem is unchanged

#### Scenario: Server checks a bypassed form
- **GIVEN** a request to the edit action with a text of 10001 characters, sent without the browser check
- **WHEN** the server handles it
- **THEN** nothing is stored or uploaded, the edit limit is not counted, and the response names the text as too long

### Requirement: Saving an edit (edit-poem FR-6)
Saving SHALL send the poem's id and the fields; the server SHALL resolve the author from the session and SHALL change the poem only if it belongs to the signed-in author's own public profile. Only the title, the text, the genre, and the illustration SHALL change; the poem's id, author, and creation date SHALL NOT. While sending, the button SHALL read «Сохранение…» and the whole form SHALL be disabled and dimmed as in the add form; a double click SHALL save once. On success the author SHALL be taken to `/account/poems/<poemId>`, which SHALL show the saved content and «Изменения сохранены.» once.

#### Scenario: Successful save
- **GIVEN** the edit page of «Первый снег», with the title changed to «Первый снег.» and the genre to «Без жанра»
- **WHEN** the author presses «Сохранить изменения»
- **THEN** they land on `/account/poems/<id>`, which shows «Изменения сохранены.», the heading «Первый снег.», no genre line, and the poem's original date

#### Scenario: Notice only once
- **GIVEN** the author has just landed on the poem page with «Изменения сохранены.» shown
- **WHEN** they reload, follow a link away and back, or use Back and Forward
- **THEN** the notice is not shown again

#### Scenario: Back after saving
- **GIVEN** the author has just saved and landed on the poem page
- **WHEN** they press the browser's Back button
- **THEN** the edit page shows the saved values and «Вернуться на страницу произведения»

#### Scenario: Sending state and double click
- **GIVEN** a changed form and a slow request
- **WHEN** the author clicks «Сохранить изменения» twice quickly
- **THEN** the button reads «Сохранение…», the form is disabled and dimmed, and exactly one save request is sent

### Requirement: Edit write limit (edit-poem FR-7)
Each signed-in user SHALL be able to make at most 10 save attempts on poems in one minute window (fixed, starting at the first counted attempt), counted per account and enforced by the database's write-limit operation. Every attempt that passes the field rules (required fields and lengths, poem-management FR-4) and the session check SHALL count, whether it succeeds or fails — including one then rejected because its genre is no longer offered or its illustration fails the content check, since those checks run after the limit (as a profile photo's content check does). Attempts rejected by the field rules or the session check SHALL NOT count. The limit SHALL be checked before any upload, Contentful call, or poem write. Over the limit, nothing SHALL be uploaded, stored, or expired, every field SHALL keep its value, and «Слишком много сохранений. Попробуйте через минуту.» SHALL be shown in the failure alert. The profile editor's and the poem create limits SHALL be unaffected.

#### Scenario: Eleventh save in a minute
- **GIVEN** an author who made 10 save attempts on poems in the current minute window
- **WHEN** they save a changed form with a new illustration
- **THEN** «Слишком много сохранений. Попробуйте через минуту.» is shown, nothing was uploaded, and the poem is unchanged

#### Scenario: Window resets
- **GIVEN** an author whose 10 attempts fall in a window that started more than a minute ago
- **WHEN** they save
- **THEN** the save succeeds

#### Scenario: Field-rule failures don't count
- **GIVEN** an author who sent 10 edits with an empty title in the last minute, bypassing the browser check
- **WHEN** they save a valid form
- **THEN** the save succeeds

#### Scenario: Genre and file rejections count
- **GIVEN** an author who sent 10 edits in the last minute that the server rejected for a removed genre or a file that isn't a PNG or JPEG
- **WHEN** they save a valid form
- **THEN** «Слишком много сохранений. Попробуйте через минуту.» is shown and the poem is unchanged

#### Scenario: Separate from the profile limit
- **GIVEN** a user who made 10 profile writes in the current minute window
- **WHEN** they save a poem edit
- **THEN** the save succeeds

### Requirement: Edit failures (edit-poem FR-8)
A failure that names no field SHALL show its message in a `role="alert"` element above the form, move focus to it, and keep every field's value: «Сохранение сейчас недоступно. Попробуйте позже.» when a service can't be reached, «Слишком много сохранений. Попробуйте через минуту.» over the limit, and «Что-то пошло не так. Попробуйте ещё раз.» otherwise. The alert SHALL stay while the author edits and SHALL be hidden when the next save starts. No save SHALL be retried automatically; «Сохранить изменения» SHALL stay available for the author to try again.

#### Scenario: Server unavailable
- **GIVEN** a changed form and a database that can't be reached
- **WHEN** the author saves
- **THEN** «Сохранение сейчас недоступно. Попробуйте позже.» is shown above the form with focus on it, every field keeps its value, the poem is unchanged, and «Сохранить изменения» is enabled

#### Scenario: No automatic retry
- **GIVEN** a save that failed
- **WHEN** the author waits without acting
- **THEN** no further save request is sent

### Requirement: Session expired while editing (edit-poem FR-9)
When the session has expired and can't be refreshed, a save SHALL store nothing, and the author SHALL be taken to `/login`, which shows «Сессия истекла. Войдите снова.» once (delete-poem FR-6). After signing in, the author SHALL land on the home page `/`. An expired access token with a live session SHALL be refreshed before the save runs, and the save SHALL succeed.

#### Scenario: Session expired
- **GIVEN** a changed form whose session expired after the page opened (cookies cleared)
- **WHEN** the author saves
- **THEN** they land on `/login` with «Сессия истекла. Войдите снова.», and the poem is unchanged
- **AND** after signing in they land on `/`

### Requirement: Poem gone while editing (edit-poem FR-10)
When the poem no longer exists or no longer belongs to the caller's own profile at save time, nothing SHALL be stored, no file SHALL stay uploaded, and the author SHALL be taken to `/account/poems`, which shows «Произведение уже удалено.» once. When the poem still exists but the caller's own profile is no longer public (a name was cleared meanwhile, e.g. in another tab), nothing SHALL be stored or uploaded, the author SHALL stay on the edit page with every value kept, and «Чтобы сохранять изменения, укажите имя и фамилию в профиле автора.» SHALL be shown in the failure alert above the form, with focus on it.

#### Scenario: Deleted in another tab
- **GIVEN** the edit page of «Первый снег» in one tab, and the poem deleted in another tab
- **WHEN** the author saves in the first tab
- **THEN** they land on `/account/poems` with «Произведение уже удалено.», and no poem was created or changed

#### Scenario: Profile no longer public
- **GIVEN** the edit page of «Первый снег» in one tab, and the author's last name cleared in another tab
- **WHEN** the author saves in the first tab
- **THEN** «Чтобы сохранять изменения, укажите имя и фамилию в профиле автора.» is shown above the form with focus on it, every field keeps its value, the URL is unchanged, and «Первый снег» is unchanged

### Requirement: Offline or slow connection (edit-poem FR-11)
While the browser reports no network connection, the edit form, the add form, and the profile editor SHALL show «Нет подключения к интернету. Сохранение станет доступно, когда связь восстановится.» in a `role="status"` element above the form, and «Сохранить изменения», «Добавить произведение», and the profile editor's «Сохранить» and «Удалить» buttons SHALL be disabled; the fields SHALL stay editable and keep their values. When the connection returns, the notice SHALL go away and the buttons SHALL be enabled again. A save or create whose request fails while the browser reports no connection SHALL show no failure message and keep every value; the notice SHALL follow the live connection state only, so it goes away when the connection returns and nothing records the failed attempt beyond the author still being on the form. A request that fails while the browser reports a connection SHALL show «Что-то пошло не так. Попробуйте ещё раз.».

While the browser is online but its own connection estimate (where the browser offers one) reports a slow connection — effective type «slow-2g» or «2g», or a round-trip estimate above 1000 ms — the same three forms SHALL show «Медленное подключение к интернету. Сохранение станет доступно, когда связь улучшится.» in the same place and role instead, and the same buttons SHALL be disabled, with the same rules for fields and for the return of a normal connection. A browser that offers no estimate SHALL never be treated as slow. A save already sending SHALL NOT be cancelled when the connection turns slow or drops. The connection state SHALL come from one hook in `shared/` that each of the three forms reads.

#### Scenario: Slow connection on the edit page
- **GIVEN** a changed edit form in a browser whose connection estimate reports «2g»
- **WHEN** the page renders
- **THEN** «Медленное подключение к интернету. Сохранение станет доступно, когда связь улучшится.» is shown above the form, «Сохранить изменения» is disabled, and the fields accept typing
- **AND** when the estimate changes to «4g», the notice goes away and «Сохранить изменения» is enabled

#### Scenario: No estimate available
- **GIVEN** a browser that offers no connection estimate, online
- **WHEN** the edit form, the add form, or the profile editor renders
- **THEN** no connection notice is shown and the save buttons follow their usual rules

#### Scenario: Going offline on the edit page
- **GIVEN** a changed edit form
- **WHEN** the browser goes offline
- **THEN** the offline notice is shown above the form, «Сохранить изменения» is disabled, and the title input still accepts typing

#### Scenario: Coming back online
- **GIVEN** the offline notice is shown
- **WHEN** the connection returns
- **THEN** the notice is gone and «Сохранить изменения» is enabled

#### Scenario: Add form offline
- **GIVEN** the add form with a valid draft
- **WHEN** the browser goes offline
- **THEN** the offline notice is shown above the form and «Добавить произведение» is disabled

#### Scenario: Connection lost during a save
- **GIVEN** a changed edit form
- **WHEN** the author saves and the request fails because the connection dropped
- **THEN** the offline notice is shown, no failure alert is shown, and every field keeps its value
- **AND** when the connection returns, the notice goes away and «Сохранить изменения» is enabled, with no alert shown

### Requirement: Draft kept between the poem page and the edit page (edit-poem FR-12)
Unsaved values on the edit page SHALL still be there when the author goes from the edit page to the same poem's page and back, by a link or by the browser's Back and Forward buttons, without a reload in between. A reload of the edit page SHALL show the stored values.

#### Scenario: Round trip by link
- **GIVEN** the edit page with the title changed to «Черновик»
- **WHEN** the author follows the breadcrumb to the poem page and then «Редактировать произведение»
- **THEN** the title input holds «Черновик» and «Сохранить изменения» is shown

#### Scenario: Round trip by Back and Forward
- **GIVEN** the edit page with the text changed
- **WHEN** the author presses Back to the poem page and then Forward
- **THEN** the changed text is still in the editor

#### Scenario: Reload starts fresh
- **GIVEN** the edit page with unsaved changes
- **WHEN** the author reloads it and confirms leaving in the browser's dialog
- **THEN** the form holds the stored values

### Requirement: Leaving with unsaved changes (edit-poem FR-13)
While the edit form is changed, and also while its save is sending until the save's result arrives, activating a link to any page other than this poem's owner page or its edit page SHALL NOT navigate; instead a modal dialog titled «Есть несохранённые изменения» with the text «Сначала сохраните изменения.» and the button «Продолжить редактирование» SHALL open, and closing it SHALL leave the form as it was. Links to this poem's owner page SHALL navigate as usual. Pressing the header's «Выйти» SHALL NOT sign out and SHALL open the same dialog. Closing the tab, reloading, or entering another address SHALL show the browser's own leave confirmation, in which leaving stays possible. The browser's Back and Forward buttons SHALL NOT be blocked, and nothing SHALL be blocked from the poem's owner page while a draft is kept on the hidden edit page. An unchanged form SHALL block nothing, and nothing SHALL be blocked once a save has succeeded.

#### Scenario: Header link blocked
- **GIVEN** a changed edit form
- **WHEN** the author clicks the header link to «Наши авторы»
- **THEN** the URL doesn't change and the dialog «Есть несохранённые изменения» opens
- **AND** after «Продолжить редактирование» the form still holds the changes

#### Scenario: Sign-out blocked
- **GIVEN** a changed edit form
- **WHEN** the author presses «Выйти» in the header
- **THEN** the dialog «Есть несохранённые изменения» opens, the author is still signed in, and the form still holds the changes

#### Scenario: Poem page allowed
- **GIVEN** a changed edit form
- **WHEN** the author follows the breadcrumb link to the poem's title
- **THEN** the poem page opens with no dialog

#### Scenario: Closing the tab
- **GIVEN** a changed edit form
- **WHEN** the author closes the tab or reloads
- **THEN** the browser asks to confirm leaving, and leaving is possible

#### Scenario: Leaving while the save is sending
- **GIVEN** a changed form whose save request is still sending («Сохранение…»)
- **WHEN** the author clicks the header link to «Наши авторы», and then closes the tab
- **THEN** the click opens the dialog «Есть несохранённые изменения» and the URL doesn't change, and closing the tab shows the browser's leave confirmation
- **AND** once the save succeeds the author lands on the poem page as usual

#### Scenario: Unchanged form
- **GIVEN** the edit page with no changes
- **WHEN** the author clicks the header link to «Наши авторы» or closes the tab
- **THEN** the page navigates or closes with no dialog or confirmation

#### Scenario: Link opened in a new tab
- **GIVEN** a changed edit form
- **WHEN** the author Ctrl/Cmd-clicks a header link
- **THEN** the link opens in a new tab and the edit page stays with no dialog

### Requirement: Edited poem shown everywhere (edit-poem FR-14)
After a successful save, the author's own tab SHALL show the new content on `/account/poems/<poemId>`, `/account/poems`, `/authors/<own id>`, and `/authors/<own id>/poems/<poemId>` on the next navigation; any other browser SHALL show it after reloading one of those pages.

#### Scenario: Title change on the lists
- **GIVEN** the author renamed «Первый снег» to «Первый снег.»
- **WHEN** they open `/account/poems` and their public author page
- **THEN** both lists show «Первый снег.» and not «Первый снег»

#### Scenario: Guest after reload
- **GIVEN** a guest who opened the poem's public page before the save
- **WHEN** they reload it after the save
- **THEN** the new content is shown

### Requirement: Accessible edit flow (edit-poem NFR-4)
The edit page SHALL have exactly one level-1 heading in its `main`. The add form's accessibility rules (poem-management NFR-7) SHALL hold for the edit form. The failure alert SHALL be a `role="alert"` element and receive focus; the saved notice and the offline notice SHALL be `role="status"` elements. The leave dialog SHALL be a modal dialog with an accessible name from its title, focus SHALL move into it on open, and SHALL return to the element focused before the blocked click when it closes. The stored and the new illustration previews SHALL have an empty `alt` (the field's label names them). A disabled save button SHALL be `disabled`, not only styled.

#### Scenario: Dialog focus
- **GIVEN** a changed form with focus on a header link
- **WHEN** the author presses Enter on it and then «Продолжить редактирование»
- **THEN** focus moves into the dialog on open and back to that header link on close

### Requirement: Design tokens for editing (edit-poem NFR-6)
New and changed styles SHALL use named design-token utilities only: no colour literals and no Tailwind arbitrary-value colour classes.

#### Scenario: Literal search
- **GIVEN** the change is complete
- **WHEN** the new and changed component files are searched for hex, `rgb(`, `hsl(` literals and `text-[`, `bg-[`, `border-[` classes
- **THEN** there are no matches

### Requirement: Russian UI copy for editing (edit-poem NFR-7)
Every new user-facing string of the edit button, the edit page, the form, its notices, and the leave dialog SHALL be the proposal's UI copy table text, verbatim.

#### Scenario: Copy matches the table
- **GIVEN** the edit page in each state, the poem page after a save, and the leave dialog
- **WHEN** their headings, buttons, links, and messages are read
- **THEN** each matches the UI copy table exactly

## MODIFIED Requirements

### Requirement: Database integrity under direct calls (NFR-1)
With the app bypassed and the database or Storage API called directly with the publishable key: no role SHALL insert into the poems table directly; a poem SHALL be stored only through the database's own create operation, for the caller's own public profile and within FR-6's limit; a guest SHALL NOT store a poem; nobody SHALL set a poem's id or creation time; no role SHALL update the poems table directly; a poem SHALL be updated only through the database's own update operation, only when it belongs to the caller's own public profile, and only in its title, text, genre, and illustration, whatever else the request holds; a guest SHALL NOT update a poem (edit-poem NFR-1); no role SHALL delete from the poems table directly; a poem SHALL be deleted only through the database's own delete operation, and only when it belongs to the caller's own profile, whatever else the request holds; a guest SHALL NOT delete a poem (delete-poem NFR-1); the database SHALL reject a blank or over-long title or text, a malformed genre id, and an illustration path outside the author's own folder; poems of a non-public profile SHALL NOT be readable; and illustration uploads SHALL be limited to the own folder, 5 MB, PNG and JPEG, and illustration removals to the own folder.

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

#### Scenario: Update operation for the owner
- **GIVEN** a signed-in author with a public profile and a poem with an illustration
- **WHEN** they call the database's update operation with that poem's id, a new title, and the illustration removed
- **THEN** the title changes, the illustration path is cleared, the answer names the old illustration path, and the poem's id, author, and creation date are unchanged

#### Scenario: Update operation for anyone else
- **GIVEN** a poem of author A
- **WHEN** a signed-in author B calls the update operation with its id, and a guest calls it with its id
- **THEN** the poem is unchanged; B gets the same answer as for an unknown id, and the guest's call is rejected

#### Scenario: Update with a non-public own profile
- **GIVEN** a signed-in author whose own profile has lost its last name
- **WHEN** they call the update operation for their own poem
- **THEN** the poem is unchanged and the answer is the same as for an unknown id

#### Scenario: Illustration path in another folder
- **GIVEN** a signed-in author with a poem
- **WHEN** they call the update operation with an illustration path in another author's folder
- **THEN** the call is rejected and the poem is unchanged

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
The four management pages SHALL be Server Components; the only client modules in poem-management SHALL be the add form and the edit form (with their shared form parts, the shared editor and picker), the created-or-saved notification, the delete button with its dialog, the deleted notice, and the leave dialog. No poem data SHALL be kept in a client cache or store, except that the created-or-saved notification's store SHALL hold only the id of the poem just created or saved and which of the two it was, and the deleted notice's store SHALL hold only the outcome and the deleted poem's title until the notice shows (delete-poem NFR-2, edit-poem NFR-2).

#### Scenario: Static check
- **GIVEN** the change is complete
- **WHEN** `src/features/poem-management/` and `src/app/(authorized)/account/poems/` are searched for `"use client"`
- **THEN** the only matches are the add and edit forms and their shared parts, the created-or-saved notification, the delete button and its dialog, the deleted notice, and the leave dialog

### Requirement: Module boundaries (NFR-3)
Poem creation SHALL live in its own feature. It SHALL import other features only through their public API. `poems` SHALL import nothing from the new feature, `@/features/auth`, or the cookie Supabase client, and `authors` SHALL import neither poem feature. The Markdown editor, the safe Markdown renderer, the image file check and picker, the Supabase error classifier, and the connection-status hook and its notice SHALL each exist once, in `shared/`, used by both the profile editor and the add and edit forms; the leave guard SHALL exist once, beside the edit form, until a second feature needs it. The add form and the edit form SHALL share one implementation of the fields, the field drafts, the browser check, and the focus rules (edit-poem NFR-3).

#### Scenario: Static check
- **GIVEN** the change is complete
- **WHEN** `src/features/poems/` is searched for imports of the new feature, `@/features/auth`, and `@/shared/lib/supabase/server`, and `src/features/authors/` for `@/features/poems` and the new feature
- **THEN** there are no matches
- **AND** no Markdown toolbar, image-type sniffing, Supabase error classifier, or `navigator.onLine` or `navigator.connection` read exists outside `src/shared/`, and no `beforeunload` listener exists outside the edit form's leave guard

#### Scenario: One form implementation
- **GIVEN** the change is complete
- **WHEN** the add form and the edit form components are read
- **THEN** both render the same fields component and use the same form hook, and neither declares the title, text, genre, or illustration draft state itself

### Requirement: Build and rendering modes (NFR-9)
`npm run build` SHALL succeed with no Supabase or Contentful environment variables. The management routes SHALL be partially prerendered like `/account/author`, `/account/poems/[poemId]/edit` included (edit-poem NFR-8), and no existing route SHALL change its render mode.

#### Scenario: Build without env
- **GIVEN** no `NEXT_PUBLIC_SUPABASE_*` and no `CONTENTFUL_*` variables are set
- **WHEN** `npm run build` runs
- **THEN** it exits 0, its route list shows `/account/poems`, `/account/poems/new`, `/account/poems/[poemId]`, and `/account/poems/[poemId]/edit` with the same render-mode marker as `/account/author`, and every other route keeps its marker

### Requirement: No poem content in logs (NFR-10)
Server logs written by poem creation, editing, deletion, and poem reads SHALL carry the operation and the failure kind only, plus, for a Contentful genre entry dropped by validation, that entry's id (editorial data, not a reader's): never a poem's title, text, genre, file name, file path, or file bytes, and never a user id, email, author profile id, or poem id (delete-poem NFR-5, edit-poem NFR-5).

#### Scenario: Failed insert log
- **GIVEN** a create whose insert fails with the title «Секрет» and the text «тайна»
- **WHEN** the failure is logged
- **THEN** the log line contains neither «Секрет» nor «тайна» nor the user's id, the author's profile id, or the poem id

#### Scenario: Failed delete and cleanup logs
- **GIVEN** a delete of the poem «Секрет» whose database call fails, and another whose illustration removal fails
- **WHEN** each failure is logged
- **THEN** neither log line contains «Секрет», the poem id, the illustration path, the user's id, or the author's profile id

#### Scenario: Failed edit logs
- **GIVEN** an edit of the poem «Секрет» whose update fails, another whose upload fails, and another whose old-file removal fails
- **WHEN** each failure is logged
- **THEN** no log line contains «Секрет», the text, the poem id, a file name or path, the user's id, or the author's profile id
