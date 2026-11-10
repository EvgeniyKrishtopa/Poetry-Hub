# poem-management Specification

## Purpose
TBD - created by archiving change add-poem-creation. Update Purpose after archive.
## Requirements
### Requirement: Entry links to poem management (FR-1)
A signed-in reader whose own author profile is public (first and last name filled) SHALL see a link «Управление произведениями» to `/account/poems` in two places: the account page's author section (reader-account FR-1) and their own public author page (author-profiles FR-15). A reader with no profile or a non-public one, another reader, and a guest SHALL NOT see it.

#### Scenario: Public own profile on the account page
- **GIVEN** a signed-in reader whose profile `<id>` is public
- **WHEN** they open `/account`
- **THEN** a link «Управление произведениями» with `href` `/account/poems` is shown in the author section

#### Scenario: Owner on their public author page
- **GIVEN** a signed-in reader who owns the public profile `<id>`
- **WHEN** they open `/authors/<id>`
- **THEN** a link «Управление произведениями» with `href` `/account/poems` is shown next to «Редактировать профиль»

#### Scenario: Nobody else sees it
- **GIVEN** a guest, a signed-in reader who doesn't own `<id>`, and a signed-in reader whose own profile has no last name
- **WHEN** the first two open `/authors/<id>` and the third opens `/account`
- **THEN** none of them sees a link «Управление произведениями»

### Requirement: Your poems page (FR-2)
`/account/poems` SHALL show the level-1 heading «Ваши Произведения»; below it, one row with the link «Добавить новое произведение» to `/account/poems/new` and the link styled as a button «Создать сборник произведений» to `/account/poems/collections/new`, in that order (add-poem-collections FR-1); then, when the author has collections, the section «Сборники произведений» (add-poem-collections FR-2); then, when the author has free poems, a list of the free poems only, newest first, each item only the title as a link to `/account/poems/<poemId>`, with no heading or text of its own (show-only-free-poems FR-1, user decision 2026-11-10). A poem in a collection SHALL NOT be in that list. With no free poems — no poems at all, or every poem in a collection — it SHALL show no poem list and no text in its place. The section SHALL be a level-2 heading «Сборники произведений» and a list of all the author's own collections, newest first, each item the title as a link to `/account/poems/collections/<collectionId>` followed, when the collection holds poems, by a nested list of its poems, newest first by the poem's creation time, each item only the title as a link to `/account/poems/<poemId>`; a collection with no poems SHALL show its title only (add-poems-to-collections FR-11, user decision 2026-11-07). With no collections, neither the heading nor the section's list SHALL be rendered. The section and the poem list SHALL agree on which poems are in a collection, so no poem is shown both under a collection and in the poem list, and, when every read succeeds, every poem of the author is shown on the page exactly once (show-only-free-poems NFR-2). When only the collections list fails, the section shows its alert and the poem list still lists free poems only; collected poems are then shown nowhere, which the section's alert explains (Gate 1 P1). A failed read of the collections or of their poems SHALL show «Не удалось загрузить сборники. Попробуйте позже.» in a `role="alert"` element in the section's place, with no heading, and SHALL NOT affect the buttons; a failed read of which poems are in a collection SHALL also replace the poem list with the list alert (poem-management FR-11, show-only-free-poems FR-2); a failed poem read SHALL NOT affect the buttons or the section (poem-management FR-11, add-poem-creation).

#### Scenario: Author with poems
- **GIVEN** a signed-in author with a public profile, no collections, and poems «Ночной вокзал» (created 2026-10-02) and «Осенний сад» (created 2026-10-01)
- **WHEN** they open `/account/poems`
- **THEN** the heading «Ваши Произведения», the links «Добавить новое произведение» (`/account/poems/new`) and «Создать сборник произведений» (`/account/poems/collections/new`) in one row, and a list of two links, in order «Ночной вокзал», «Осенний сад», each with `href="/account/poems/<that poem's id>"`, are shown
- **AND** no «Сборники произведений» heading exists

#### Scenario: Author without poems
- **GIVEN** a signed-in author with a public profile, no poems, and no collections
- **WHEN** they open `/account/poems`
- **THEN** the heading «Ваши Произведения» and both links are shown, and the page holds no list

#### Scenario: Author with collections
- **GIVEN** a signed-in author with the collections «Весна» (created 2026-11-02) and «Осенний цикл» (created 2026-11-01), both empty, and one free poem
- **WHEN** they open `/account/poems`
- **THEN** below the button row the section «Сборники произведений» lists «Весна», «Осенний цикл» in that order, each linking to `/account/poems/collections/<its id>`, and the poem list with that one poem follows the section

#### Scenario: Collections read fails
- **GIVEN** the author's collections can't be read, and their poems and which of them are in a collection can
- **WHEN** the author opens `/account/poems`
- **THEN** both links, «Не удалось загрузить сборники. Попробуйте позже.» in a `role="alert"` element, and the list of free poems are shown

#### Scenario: Membership read fails
- **GIVEN** a signed-in author with collections and poems, whose poems can be read but which of them are in a collection can't
- **WHEN** they open `/account/poems`
- **THEN** both links, «Не удалось загрузить сборники. Попробуйте позже.» in the section's place, and «Не удалось загрузить произведения. Попробуйте позже.» in the poem list's place, each in a `role="alert"` element, are shown
- **AND** no poem title link is shown on the page

#### Scenario: Only own poems
- **GIVEN** two authors with public profiles, each with poems and collections
- **WHEN** one of them opens `/account/poems`
- **THEN** only their own poems and collections are listed

#### Scenario: Collections with their poems
- **GIVEN** a signed-in author whose collection «Осенний цикл» holds «Ночной вокзал» (created 2026-10-02) and «Осенний сад» (created 2026-10-01), whose collection «Весна» holds no poems, and who has the free poem «Первый снег»
- **WHEN** they open `/account/poems`
- **THEN** under «Осенний цикл» the links «Ночной вокзал», «Осенний сад», in that order, each to `/account/poems/<its id>`, are listed, and «Весна» shows its title only
- **AND** the poem list below the section lists only «Первый снег»

#### Scenario: Every poem in a collection
- **GIVEN** a signed-in author whose only poems «Ночной вокзал» and «Осенний сад» are both in «Осенний цикл»
- **WHEN** they open `/account/poems`
- **THEN** the section lists «Осенний цикл» with both poems under it
- **AND** no list and no text follow the section

#### Scenario: Free poems in order
- **GIVEN** a signed-in author with the free poems «Первый снег» (created 2026-10-03) and «Осенний сад» (created 2026-10-01), and «Ночной вокзал» (created 2026-10-02) in «Осенний цикл»
- **WHEN** they open `/account/poems`
- **THEN** the poem list below the section is «Первый снег», «Осенний сад», in that order

### Requirement: Management pages need a public own profile (FR-2, FR-3)
On `/account/poems` and `/account/poems/new`, a signed-in reader whose own profile is missing or not public SHALL see, under the page heading, the text «Чтобы добавлять произведения, укажите имя и фамилию в профиле автора.» and a link «Перейти к профилю автора» to `/account/author`, and no list, collections section, add link, create-collection link, or form.

#### Scenario: Profile without a last name
- **GIVEN** a signed-in reader whose profile has a first name and no last name
- **WHEN** they open `/account/poems` or `/account/poems/new`
- **THEN** the not-public text and the link «Перейти к профилю автора» (`/account/author`) are shown
- **AND** no add link, create-collection link, collections section, list, or form is shown

### Requirement: Guests can't reach management pages (FR-2, FR-3, FR-7)
A signed-out page request for `/account/poems`, `/account/poems/new`, or `/account/poems/<poemId>` SHALL be redirected to `/login` before the page renders, and each page SHALL also check the session itself (reader-account FR-19, NFR-2).

#### Scenario: Guest opens a management page
- **GIVEN** a signed-out visitor
- **WHEN** they request `/account/poems`, `/account/poems/new`, or `/account/poems/<any id>`
- **THEN** the response is a redirect to `/login`, and no management content is rendered

### Requirement: Add poem form (FR-3)
`/account/poems/new` SHALL show the level-1 heading «Добавление нового произведения» and a form with, in order: a text input labelled «Название произведения»; the shared Markdown editor labelled «Текст произведения» with the poem toolbar — «Жирный», «Курсив», «Эпиграф», «Разделитель частей», «Отступ», in that order, and no heading or list buttons — the «Редактор» / «Просмотр» tabs, and a live counter «<n> / 10000»; the text «Выберите жанр» as the label of a dropdown whose first option «—» is selected, followed by the Contentful genre tags (at most the first 100 the query returns; past that a warning is logged) by name in Russian alphabetical order, then «Без жанра»; an optional illustration picker labelled «Иллюстрация (необязательно)» with the button «Выбрать иллюстрацию»; and a submit button «Добавить произведение».

#### Scenario: Form fields
- **GIVEN** a signed-in author with a public profile and Contentful genres «Сонет», «Лирика»
- **WHEN** they open `/account/poems/new`
- **THEN** the heading «Добавление нового произведения», the inputs labelled «Название произведения» and «Текст произведения», a dropdown labelled «Выберите жанр» with options «—», «Лирика», «Сонет», «Без жанра» in that order and «—» selected, the illustration picker, and the button «Добавить произведение» are shown

#### Scenario: Poem toolbar buttons
- **GIVEN** the add form
- **WHEN** the text editor renders
- **THEN** its toolbar holds exactly the buttons «Жирный», «Курсив», «Эпиграф», «Разделитель частей», «Отступ», in that order, and none named «Заголовок», «Подзаголовок», «Маркированный список», or «Нумерованный список»

#### Scenario: Epigraph
- **GIVEN** the text "Мороз и солнце" selected on its own line
- **WHEN** the author clicks «Эпиграф»
- **THEN** the line becomes "> Мороз и солнце", and «Просмотр» shows it as an epigraph: right-aligned, smaller, muted, and italic

#### Scenario: Part separator
- **GIVEN** the cursor at the end of a stanza
- **WHEN** the author clicks «Разделитель частей»
- **THEN** a line "* * *" is inserted with a blank line before and after it, and «Просмотр» shows a centred «* * *» between the stanzas

#### Scenario: Indent
- **GIVEN** two selected lines "строка" and "ещё строка"
- **WHEN** the author clicks «Отступ» twice
- **THEN** each selected line starts with two indent steps (two em spaces each), and «Просмотр» shows both lines shifted right by two steps while unselected lines stay at the left edge

#### Scenario: Toolbar and preview in the text editor
- **GIVEN** the add form with the text "строка один\nстрока два" and "один" selected
- **WHEN** the author clicks «Жирный» and then switches to «Просмотр»
- **THEN** the text becomes "строка **один**\nстрока два", and the preview shows "один" in bold with the two lines on separate lines

#### Scenario: Chosen illustration
- **GIVEN** the add form
- **WHEN** the author picks a valid PNG
- **THEN** a preview of the image and a button «Убрать иллюстрацию» are shown

#### Scenario: Removing the chosen illustration
- **GIVEN** the add form with a chosen illustration and its preview
- **WHEN** the author activates «Убрать иллюстрацию»
- **THEN** the preview is gone, no file is chosen, and the button «Выбрать иллюстрацию» is shown

#### Scenario: Genres can't be read
- **GIVEN** Contentful can't be reached
- **WHEN** the author opens `/account/poems/new`
- **THEN** the heading and «Список жанров сейчас недоступен. Попробуйте позже.» in a `role="alert"` element are shown, and no form is shown

### Requirement: Field validation (FR-4)
Title, text, and genre SHALL be required; the illustration SHALL be optional. Title and text SHALL be measured in code points after every line break (`\r\n` or `\r`) is turned into `\n` and the value is trimmed — for the text, trimming removes leading empty lines and trailing whitespace only, so an indented first line keeps its indent; an indent step is two em spaces (U+2003) — the same in the counter, the server, and the database, and stored in that form: title at most 80, text at most 10000. A text that holds only whitespace counts as empty. The illustration SHALL follow the profile photo's rules (at most 5 MB, PNG or JPEG by content). The form SHALL check these before sending, and the server SHALL check them again; the illustration is checked as soon as it is picked, and while its error is shown the form SHALL NOT send (the invalid file is never silently dropped to create the poem without it); an invalid submission SHALL write nothing and SHALL show the error under its field: «Обязательное поле.», «Не более 80 символов.», «Не более 10000 символов.», or the photo messages. Inputs SHALL NOT cap typing or truncate pastes.

#### Scenario: Empty form
- **GIVEN** the add form with every field empty and «—» selected
- **WHEN** the author submits
- **THEN** «Обязательное поле.» is shown under the title, the text, and the genre, nothing is sent to the server, and focus moves to the title input

#### Scenario: Whitespace only
- **GIVEN** a title of three spaces and a valid text and genre
- **WHEN** the author submits
- **THEN** «Обязательное поле.» is shown under the title

#### Scenario: Title too long
- **GIVEN** a title of 81 characters
- **WHEN** the author submits
- **THEN** «Не более 80 символов.» is shown under the title, and the input still holds all 81 characters

#### Scenario: Indented first line kept
- **GIVEN** a text whose first line starts with an indent step (two em spaces), preceded by one empty line
- **WHEN** the poem is created
- **THEN** the stored text starts with the indent step, without the empty line

#### Scenario: Line breaks count once
- **GIVEN** a text of 9 990 letters and 10 line breaks, sent as `\r\n` by the browser
- **WHEN** the author submits
- **THEN** the counter read «10000 / 10000», the poem is created, and its stored text holds `\n` line breaks only

#### Scenario: Title at the limit
- **GIVEN** a title of 80 characters, a text, and the genre «Без жанра»
- **WHEN** the author submits
- **THEN** the poem is created

#### Scenario: Text over the limit
- **GIVEN** a text of 10001 characters after trimming
- **WHEN** the editor renders and the author submits
- **THEN** the counter reads «10001 / 10000» in the danger colour and «Не более 10000 символов.» is shown under the text

#### Scenario: Illustration rules
- **GIVEN** the author picks an illustration that is a 6 MB PNG, or a GIF renamed to `.png`
- **WHEN** the file is picked, and then the author submits
- **THEN** right after the pick «Файл должен быть не больше 5 МБ.» or «Допустимы только изображения PNG или JPEG.» is shown under the illustration picker with no preview and with the button «Убрать иллюстрацию»; the submit sends nothing and nothing is created; the error goes away once the author picks a valid file or activates «Убрать иллюстрацию», and only then can the form be sent

#### Scenario: Server checks a bypassed form
- **GIVEN** a request to the create action with an empty title, sent without the browser check
- **WHEN** the server handles it
- **THEN** no poem is stored, no file is uploaded, the write limit is not counted, and the response names the title as required

#### Scenario: Genre removed meanwhile
- **GIVEN** the form was opened with the genre «Сонет», which is then deleted from Contentful and its cache expires
- **WHEN** the author submits with «Сонет» selected
- **THEN** «Этот жанр больше недоступен. Выберите другой.» is shown under the genre, and nothing is created
- **AND** «Сонет» is no longer an option, «—» is selected, and every other field keeps its value

### Requirement: Creating a poem (FR-5)
A valid submission SHALL store one poem for the signed-in author's own profile with the trimmed title, the trimmed text, the chosen genre (none for «Без жанра»), and the illustration if one was chosen. The author SHALL then be taken to `/account/poems/<new poem id>`, which shows «Поздравляем, Ваше произведение успешно добавлено.» once. While sending, the submit button SHALL read «Добавление…», and the whole form — every field, the toolbar and tabs, the genre dropdown, the illustration picker, and the submit button — SHALL be disabled and dimmed to 50% (as in the contact form) until the outcome arrives. A failure SHALL keep every field's value and show its message above the submit button. Field errors and the failure message SHALL stay as shown while the author edits, and SHALL be hidden when the next submit starts and replaced by that submit's outcome (as in the contact form); the illustration error follows FR-4's pick-time rule instead.

#### Scenario: Successful create with an illustration
- **GIVEN** a signed-in author with a public profile, the title «Первый снег», a two-stanza text, the genre «Лирика», and a valid JPEG
- **WHEN** they submit
- **THEN** they land on `/account/poems/<new id>`, which shows the notification «Поздравляем, Ваше произведение успешно добавлено.», the illustration, the heading «Первый снег», the text, and «Жанр: Лирика»

#### Scenario: Successful create without an illustration
- **GIVEN** a valid form with no illustration and «Без жанра»
- **WHEN** the author submits
- **THEN** the new poem's page starts with its title heading, shows no image, and shows no genre line

#### Scenario: Notification only once
- **GIVEN** the author has just landed on the new poem with the notification shown
- **WHEN** they reload the page, follow a link away and back, or leave and return with the browser's Back or Forward button
- **THEN** the notification is not shown again

#### Scenario: Back to the form after a create
- **GIVEN** the author has just created a poem and landed on its page
- **WHEN** they press the browser's Back button
- **THEN** `/account/poems/new` shows an empty form

#### Scenario: Double submit
- **GIVEN** a valid form
- **WHEN** the author clicks «Добавить произведение» twice quickly
- **THEN** exactly one poem is created, and the button reads «Добавление…» and is disabled while sending

#### Scenario: Server unavailable
- **GIVEN** a valid form and a database that can't be reached
- **WHEN** the author submits
- **THEN** «Сохранение сейчас недоступно. Попробуйте позже.» is shown above the submit button in a `role="alert"` element, every field keeps its value, and no poem exists

#### Scenario: Session expired
- **GIVEN** a valid form whose session expired after it was opened
- **WHEN** the author submits
- **THEN** «Сессия истекла. Войдите снова.» is shown above the submit button, and nothing is stored

#### Scenario: Illustration stored only with its poem
- **GIVEN** a valid form with an illustration, and a poem insert that fails after the upload
- **WHEN** the author submits
- **THEN** the uploaded file is removed and the failure message is shown

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

### Requirement: Owner's poem page (FR-7)
`/account/poems/<poemId>` SHALL show the author's own poem exactly as the public poem page shows it (author-poems FR-4). A `poemId` that isn't one of the signed-in author's poems — unknown, malformed, or another author's — SHALL render the 404 page. A failed read SHALL show the generic error screen.

#### Scenario: Own poem
- **GIVEN** a signed-in author with the poem `<poemId>`
- **WHEN** they open `/account/poems/<poemId>`
- **THEN** the same illustration (if any), heading, text, date, and genre line as on `/authors/<own id>/poems/<poemId>` are shown

#### Scenario: Another author's poem
- **GIVEN** a signed-in author and a poem `<otherId>` of a different author
- **WHEN** they open `/account/poems/<otherId>`
- **THEN** the 404 page renders

#### Scenario: Read fails
- **GIVEN** a signed-in author and a database that can't be reached
- **WHEN** they open `/account/poems/<poemId>`
- **THEN** the generic error screen «Что-то пошло не так» is shown

### Requirement: Management read failures (FR-11)
When the own profile or the own poem list can't be read, or which own poems are in a collection can't be read, `/account/poems` SHALL show «Не удалось загрузить произведения. Попробуйте позже.» in a `role="alert"` element instead of the list; the add link SHALL still be shown when only the list failed, and both links of the button row when the membership read failed (show-only-free-poems FR-2). When the own profile can't be read, `/account/poems/new` SHALL show the same alert instead of the form.

#### Scenario: List read fails
- **GIVEN** a signed-in author with a public profile and a failing poem read
- **WHEN** they open `/account/poems`
- **THEN** the heading, the add link, and the alert «Не удалось загрузить произведения. Попробуйте позже.» are shown, and no list

#### Scenario: Membership read fails, no guessed list
- **GIVEN** a signed-in author with a public profile, readable poems, and a failing read of which poems are in a collection
- **WHEN** they open `/account/poems`
- **THEN** the heading, both links «Добавить новое произведение» and «Создать сборник произведений», «Не удалось загрузить сборники. Попробуйте позже.» in the section's place, and «Не удалось загрузить произведения. Попробуйте позже.» in the list's place are shown, and no poem list, neither all poems nor a partial one

#### Scenario: Profile read fails on the add page
- **GIVEN** a signed-in reader and a failing own-profile read
- **WHEN** they open `/account/poems/new`
- **THEN** the heading and the same alert are shown, and no form

### Requirement: New poem shows everywhere (FR-12)
After a successful create, the next server request for the author's public page, the public poem page, `/account/poems`, and `/account/poems/<new id>` SHALL show the new poem, with no wait for a server cache lifetime, and the author's own browser SHALL show it on every one of those pages, client-side navigation included. A page another browser already holds in its client-side router cache MAY show the old list until it reloads or that client cache expires. A failed or blocked attempt SHALL NOT expire any cache.

#### Scenario: Fresh lists
- **GIVEN** an author whose public page and `/account/poems` were both just loaded and cached
- **WHEN** they create «Первый снег» and then open `/account/poems` and `/authors/<own id>`
- **THEN** «Первый снег» is the first item of both lists

### Requirement: Loading skeletons (FR-13)
`/account/poems`, `/account/poems/new`, and `/account/poems/<poemId>` SHALL show their heading (where it doesn't depend on data) and a skeleton in place of their data while it loads, including right after a create, and SHALL announce «Загрузка…» to screen readers. The skeleton SHALL be hidden from assistive technology and SHALL NOT animate when the reader prefers reduced motion.

#### Scenario: Slow list
- **GIVEN** a slow poem read
- **WHEN** the author opens `/account/poems`
- **THEN** the heading «Ваши Произведения» and the list skeleton are shown, and a `role="status"` element reads «Загрузка…»

#### Scenario: Reduced motion
- **GIVEN** a reader whose system prefers reduced motion
- **WHEN** any of the three skeletons renders
- **THEN** it does not pulse

### Requirement: Database integrity under direct calls (NFR-1)
With the app bypassed and the database or Storage API called directly with the publishable key: no role SHALL insert into the poems table directly; a poem SHALL be stored only through the database's own create operation, for the caller's own public profile and within FR-6's limit; a guest SHALL NOT store a poem; nobody SHALL set a poem's id or creation time; no role SHALL update the poems table directly; a poem SHALL be updated only through the database's own update operation, only when it belongs to the caller's own public profile, and only in its title, text, genre, and illustration, whatever else the request holds; a guest SHALL NOT update a poem (edit-poem NFR-1); no role SHALL delete from the poems table directly; a poem SHALL be deleted only through the database's own delete operation, and only when it belongs to the caller's own profile, whatever else the request holds; a guest SHALL NOT delete a poem (delete-poem NFR-1); no client role SHALL read or change which collection a poem belongs to through the poems table; it SHALL change only through the database's own collection poems save operation, which changes nothing else of a poem, and the update and create operations SHALL leave it as it is, a new poem in no collection (add-poems-to-collections NFR-1); the database SHALL reject a blank or over-long title or text, a malformed genre id, and an illustration path outside the author's own folder; poems of a non-public profile SHALL NOT be readable; and illustration uploads SHALL be limited to the own folder, 5 MB, PNG and JPEG, and illustration removals to the own folder.

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

#### Scenario: Collection of a poem is not readable directly
- **GIVEN** a poem in a collection
- **WHEN** a guest, another author, and the poem's author select its collection from the poems table through the database API
- **THEN** every select is rejected, and selecting the columns readable before this change still works as before

#### Scenario: Editing keeps the collection
- **GIVEN** a poem in the collection «Осенний цикл»
- **WHEN** its author changes its title through the update operation
- **THEN** the poem is still in «Осенний цикл»

### Requirement: Server-rendered pages (NFR-2)
The four management pages SHALL be Server Components; the only client modules in poem-management SHALL be the add form and the edit form (with their shared form parts, the shared editor and picker), the created-or-saved notification, the delete button with its dialog, the deleted notice, and the leave dialog. No poem data SHALL be kept in a client cache or store, except that the created-or-saved notification's store SHALL hold only the id of the poem just created or saved and which of the two it was, and the deleted notice's store SHALL hold only the outcome and the deleted poem's title until the notice shows (delete-poem NFR-2, edit-poem NFR-2).

#### Scenario: Static check
- **GIVEN** the change is complete
- **WHEN** `src/features/poem-management/` and `src/app/(authorized)/account/poems/` are searched for `"use client"`
- **THEN** the only matches are the add and edit forms and their shared parts, the created-or-saved notification, the delete button and its dialog, the deleted notice, and the leave dialog

### Requirement: Module boundaries (NFR-3)
Poem creation SHALL live in its own feature. It SHALL import other features only through their public API. `poems` SHALL import nothing from the new feature, `@/features/auth`, or the cookie Supabase client, and `authors` SHALL import neither poem feature nor `collection-management`. `poem-management` and `collection-management` SHALL NOT import each other; the route file of `/account/poems` SHALL compose them (add-poem-collections NFR-3). The Markdown editor, the safe Markdown renderer, the image file check and picker, the Supabase error classifier, and the connection-status hook and its notice SHALL each exist once, in `shared/`, used by both the profile editor and the add and edit forms; the leave guard SHALL exist beside the poem edit form, and `collection-management` keeps its own copy in its `hooks/`, used by its edit form and its collection poems form (add-poem-collections, user decision 2026-11-04; add-poems-to-collections NFR-3). The add form and the edit form SHALL share one implementation of the fields, the field drafts, the browser check, and the focus rules (edit-poem NFR-3).

#### Scenario: Static check
- **GIVEN** the change is complete
- **WHEN** `src/features/poems/` is searched for imports of the new feature, `@/features/auth`, and `@/shared/lib/supabase/server`; `src/features/authors/` for `@/features/poems`, `@/features/poem-management`, and `@/features/collection-management`; and `src/features/poem-management/` for `@/features/collection-management`
- **THEN** there are no matches
- **AND** no Markdown toolbar, image-type sniffing, Supabase error classifier, or `navigator.onLine` or `navigator.connection` read exists outside `src/shared/`, and `beforeunload` is listened for only in the poem edit form's leave guard and `collection-management`'s leave guard

#### Scenario: One form implementation
- **GIVEN** the change is complete
- **WHEN** the add form and the edit form components are read
- **THEN** both render the same fields component and use the same form hook, and neither declares the title, text, genre, or illustration draft state itself

### Requirement: Design tokens only (NFR-6)
New and changed styles SHALL use named design-token utilities only: no colour literals and no Tailwind arbitrary-value colour classes.

#### Scenario: Literal search
- **GIVEN** the change is complete
- **WHEN** the new and changed component files are searched for hex, `rgb(`, `hsl(` literals and `text-[`, `bg-[`, `border-[` classes
- **THEN** there are no matches

### Requirement: Accessible form and pages (NFR-7)
Each management page SHALL have exactly one level-1 heading in its `main`. Every form control SHALL have a visible label tied to it; each field error SHALL be linked to its control with `aria-describedby` and mark it `aria-invalid`; after a failed submit, focus SHALL move to the first invalid field, whether the browser or the server found the error (when that field is the text and the «Просмотр» tab is open, the editor SHALL first switch back to «Редактор» so the textarea can take focus), and to the failure alert when the failure names no field; the success notification SHALL be a `role="status"` element and failures a `role="alert"` element; the poem list SHALL be a `ul` whose every item holds one link.

#### Scenario: Error tied to its field
- **GIVEN** a submit with an empty title
- **WHEN** the error shows
- **THEN** the title input has `aria-invalid="true"` and `aria-describedby` naming the element with «Обязательное поле.», and it has focus

#### Scenario: Focus after a server failure
- **GIVEN** a submit that the server rejects with «Этот жанр больше недоступен. Выберите другой.», and another rejected with «Сохранение сейчас недоступно. Попробуйте позже.»
- **WHEN** each response arrives
- **THEN** focus moves to the genre dropdown in the first case and to the alert above the submit button in the second

#### Scenario: Notification role
- **GIVEN** a poem was just created
- **WHEN** its page shows the notification
- **THEN** the notification is a `role="status"` element

### Requirement: Russian UI copy (NFR-8)
Every user-facing string of the management pages, the entry links, the form, its errors, and the notification SHALL be the proposal's UI copy table text, verbatim.

#### Scenario: Copy matches the table
- **GIVEN** the three management pages, the form in each state, and the entry links
- **WHEN** their headings, labels, options, buttons, messages, and links are read
- **THEN** each matches the UI copy table exactly

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
While the edit form is changed, and also while its save is sending until the save's result arrives, activating a link to any page other than this poem's owner page or its edit page SHALL NOT navigate; instead a modal dialog titled «Есть несохранённые изменения» with the text «Сначала сохраните изменения.» and the button «Продолжить редактирование» SHALL open, and closing it SHALL leave the form as it was. Links to this poem's owner page SHALL navigate as usual. Pressing the header's «Выйти» SHALL NOT sign out at once; it SHALL open the same dialog in its sign-out form: the text «Если выйти сейчас, изменения пропадут.» and two buttons, «Продолжить редактирование» (focused, closes the dialog and keeps the form) and «Выйти без сохранения» (signs out, the changes are lost); closing it any other way, leaving the page while it is open (Back/Forward), or a save succeeding while it is open SHALL close it, keep the form as it was, and SHALL NOT sign out. A save already sending when the author confirms is not cancelled (PR #168 review, 2026-11-03). Either form of the dialog SHALL close by itself when a save succeeds or the author leaves the page (Back/Forward) while it is open, and SHALL NOT be shown again when they return to the edit page (spec-clarify, 2026-11-03). Closing the tab, reloading, or entering another address SHALL show the browser's own leave confirmation, in which leaving stays possible. The browser's Back and Forward buttons SHALL NOT be blocked, and nothing SHALL be blocked from the poem's owner page while a draft is kept on the hidden edit page. An unchanged form SHALL block nothing, and nothing SHALL be blocked once a save has succeeded.

#### Scenario: Header link blocked
- **GIVEN** a changed edit form
- **WHEN** the author clicks the header link to «Наши авторы»
- **THEN** the URL doesn't change and the dialog «Есть несохранённые изменения» opens
- **AND** after «Продолжить редактирование» the form still holds the changes

#### Scenario: Sign-out asks first
- **GIVEN** a changed edit form
- **WHEN** the author presses «Выйти» in the header
- **THEN** the dialog «Есть несохранённые изменения» opens with «Если выйти сейчас, изменения пропадут.», «Продолжить редактирование» focused, and «Выйти без сохранения»; the author is still signed in

#### Scenario: Sign-out, author stays
- **GIVEN** the sign-out form of the dialog is open over a changed edit form
- **WHEN** the author presses «Продолжить редактирование», the close button, or Escape
- **THEN** the dialog closes, the author is still signed in, and the form still holds the changes

#### Scenario: Sign-out confirmed
- **GIVEN** the sign-out form of the dialog is open over a changed edit form
- **WHEN** the author presses «Выйти без сохранения»
- **THEN** the author is signed out as from any other page, and the changes are not saved

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
The edit page SHALL have exactly one level-1 heading in its `main`. The add form's accessibility rules (poem-management NFR-7) SHALL hold for the edit form. The failure alert SHALL be a `role="alert"` element and receive focus; the saved notice and the offline notice SHALL be `role="status"` elements. The leave dialog SHALL be a modal dialog with an accessible name from its title, focus SHALL move into it on open; when it closes, focus SHALL return to the element focused before the blocked link click (link form) or to «Выйти» when the author closes the sign-out form without leaving («Продолжить редактирование», ×, Escape; every browser; spec-clarify, 2026-11-03). If a save failed while the dialog was open, focus SHALL instead go to the failure alert when the dialog closes (spec-clarify, 2026-11-03). The stored and the new illustration previews SHALL have an empty `alt` (the field's label names them). A disabled save button SHALL be `disabled`, not only styled.

#### Scenario: Dialog focus
- **GIVEN** a changed form with focus on a header link
- **WHEN** the author presses Enter on it and then «Продолжить редактирование»
- **THEN** focus moves into the dialog on open and back to that header link on close

#### Scenario: Sign-out dialog focus
- **GIVEN** a changed form, and the author clicks «Выйти» with the mouse
- **WHEN** they press «Продолжить редактирование» or Escape
- **THEN** focus is on «Выйти»

#### Scenario: Save failed while the dialog was open
- **GIVEN** a save is sending and the leave dialog (either form) is open
- **WHEN** the save fails and the author then presses «Продолжить редактирование»
- **THEN** the failure alert shows above the form and has focus, and the form still holds the changes

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

