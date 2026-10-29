## Purpose

The author's own poem area under `/account/poems`: where a signed-in author with a public profile sees their poems, adds a new one, and opens a poem they wrote.

## ADDED Requirements

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
`/account/poems` SHALL show the level-1 heading «Ваши Произведения», a link «Добавить новое произведение» to `/account/poems/new`, and, when the author has poems, a list of all of them, newest first, each item only the title as a link to `/account/poems/<poemId>`. With no poems, it SHALL show the heading and the add link and no list.

#### Scenario: Author with poems
- **GIVEN** a signed-in author with a public profile and poems «Ночной вокзал» (created 2026-10-02) and «Осенний сад» (created 2026-10-01)
- **WHEN** they open `/account/poems`
- **THEN** the heading «Ваши Произведения», a link «Добавить новое произведение» (`/account/poems/new`), and a list of two links, in order «Ночной вокзал», «Осенний сад», each with `href="/account/poems/<that poem's id>"`, are shown

#### Scenario: Author without poems
- **GIVEN** a signed-in author with a public profile and no poems
- **WHEN** they open `/account/poems`
- **THEN** the heading «Ваши Произведения» and the link «Добавить новое произведение» are shown, and the page holds no list

#### Scenario: Only own poems
- **GIVEN** two authors with public profiles, each with poems
- **WHEN** one of them opens `/account/poems`
- **THEN** only their own poems are listed

### Requirement: Management pages need a public own profile (FR-2, FR-3)
On `/account/poems` and `/account/poems/new`, a signed-in reader whose own profile is missing or not public SHALL see, under the page heading, the text «Чтобы добавлять произведения, укажите имя и фамилию в профиле автора.» and a link «Перейти к профилю автора» to `/account/author`, and no list, add link, or form.

#### Scenario: Profile without a last name
- **GIVEN** a signed-in reader whose profile has a first name and no last name
- **WHEN** they open `/account/poems` or `/account/poems/new`
- **THEN** the not-public text and the link «Перейти к профилю автора» (`/account/author`) are shown
- **AND** no add link, list, or form is shown

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
Each author SHALL be able to create at most 100 poems within any 30 days, counted from the author's stored poems in a sliding window (the last 30 days up to the moment of the request, not a calendar month). There SHALL be no shorter window: within the 100, poems MAY be created in any rhythm. The limit SHALL be enforced in the database by the only operation that can store a poem, so no direct API call can bypass it, and the app SHALL check it before any upload or Contentful call. Over the limit, nothing SHALL be stored, no cache SHALL be expired, nothing SHALL be uploaded when the app's pre-check catches it, and a file already uploaded when only the database's final check catches it (two concurrent creates) SHALL be removed best-effort, and «Слишком много новых произведений. Попробуйте позже.» SHALL be shown above the submit button.

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
When the own profile or the own poem list can't be read, `/account/poems` SHALL show «Не удалось загрузить произведения. Попробуйте позже.» in a `role="alert"` element instead of the list; the add link SHALL still be shown when only the list failed. When the own profile can't be read, `/account/poems/new` SHALL show the same alert instead of the form.

#### Scenario: List read fails
- **GIVEN** a signed-in author with a public profile and a failing poem read
- **WHEN** they open `/account/poems`
- **THEN** the heading, the add link, and the alert «Не удалось загрузить произведения. Попробуйте позже.» are shown, and no list

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
With the app bypassed and the database or Storage API called directly with the publishable key: no role SHALL insert into the poems table directly; a poem SHALL be stored only through the database's own create operation, for the caller's own public profile and within FR-6's limit; a guest SHALL NOT store a poem; nobody SHALL set a poem's id or creation time, update, or delete a poem; the database SHALL reject a blank or over-long title or text, a malformed genre id, and an illustration path outside the author's own folder; poems of a non-public profile SHALL NOT be readable; and illustration uploads SHALL be limited to the own folder, 5 MB, PNG and JPEG.

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
- **WHEN** they try to update or delete it through the database API
- **THEN** nothing changes

#### Scenario: Hidden author
- **GIVEN** a poem whose author's profile has lost its last name
- **WHEN** a guest selects poems through the database API
- **THEN** that poem is not returned

### Requirement: Server-rendered pages (NFR-2)
The three management pages SHALL be Server Components; the only client modules the change adds SHALL be the add form (with its shared editor and picker) and the success notification. No poem data SHALL be kept in a client cache or store; the notification store SHALL hold only the id of the poem just created.

#### Scenario: Static check
- **GIVEN** the change is complete
- **WHEN** `src/features/poem-management/` and `src/app/(authorized)/account/poems/` are searched for `"use client"`
- **THEN** the only matches are the form, its components, and the notification

### Requirement: Module boundaries (NFR-3)
Poem creation SHALL live in its own feature. It SHALL import other features only through their public API. `poems` SHALL import nothing from the new feature, `@/features/auth`, or the cookie Supabase client, and `authors` SHALL import neither poem feature. The Markdown editor, the safe Markdown renderer, the image file check and picker, and the Supabase error classifier SHALL each exist once, in `shared/`, used by both the profile editor and the add form.

#### Scenario: Static check
- **GIVEN** the change is complete
- **WHEN** `src/features/poems/` is searched for imports of the new feature, `@/features/auth`, and `@/shared/lib/supabase/server`, and `src/features/authors/` for `@/features/poems` and the new feature
- **THEN** there are no matches
- **AND** no Markdown toolbar, image-type sniffing, or Supabase error classifier exists outside `src/shared/`

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
`npm run build` SHALL succeed with no Supabase or Contentful environment variables. The three new routes SHALL be partially prerendered like `/account/author`, and no existing route SHALL change its render mode.

#### Scenario: Build without env
- **GIVEN** no `NEXT_PUBLIC_SUPABASE_*` and no `CONTENTFUL_*` variables are set
- **WHEN** `npm run build` runs
- **THEN** it exits 0, its route list adds `/account/poems`, `/account/poems/new`, and `/account/poems/[poemId]` with the same render-mode marker as `/account/author`, and every other route keeps its marker

### Requirement: No poem content in logs (NFR-10)
Server logs written by poem creation and poem reads SHALL carry the operation and the failure kind only, plus, for a Contentful genre entry dropped by validation, that entry's id (editorial data, not a reader's): never a poem's title, text, genre, file name, or file bytes, and never a user id, email, author profile id, or poem id.

#### Scenario: Failed insert log
- **GIVEN** a create whose insert fails with the title «Секрет» and the text «тайна»
- **WHEN** the failure is logged
- **THEN** the log line contains neither «Секрет» nor «тайна» nor the user's id, the author's profile id, or the poem id
