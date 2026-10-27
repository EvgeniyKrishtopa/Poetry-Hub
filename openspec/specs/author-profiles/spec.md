# author-profiles Specification

## Purpose
Lets a signed-in reader publish an author profile (name, about, photo), edit and delete each part on its own, and lets every visitor browse public authors.
## Requirements
### Requirement: Public visibility rule (FR-4)
A profile SHALL be public exactly when both its first name and its last name are non-empty. A profile that is not public SHALL appear neither on `/authors` nor at `/authors/<id>`. The rule SHALL be enforced by the database's access policies, not only by the application.

#### Scenario: First name only is not public
- **GIVEN** a profile with first name "Anna" and no last name
- **WHEN** an anonymous visitor requests `/authors` and `/authors/<id>`
- **THEN** the directory does not list it and `/authors/<id>` renders the 404 page

#### Scenario: Both names make it public
- **GIVEN** a profile with first name "Anna" and last name "Akhmatova"
- **WHEN** an anonymous visitor requests `/authors`
- **THEN** a link "Anna Akhmatova" to `/authors/<id>` is listed

#### Scenario: Deleting a name hides the profile and keeps the rest
- **GIVEN** a public profile with an about text and a photo
- **WHEN** its owner deletes the last name
- **THEN** `/authors/<id>` renders the 404 page and the directory no longer lists it
- **AND** the editor still shows the first name, about, and photo

#### Scenario: Database enforces the rule
- **GIVEN** a non-public profile row
- **WHEN** it is selected directly through the database API with the anonymous role
- **THEN** no row is returned

### Requirement: Ownership (FR-5, NFR-2)
Each user SHALL own at most one profile. Only its owner SHALL create or change it or the files in the owner's photo folder. Writes SHALL derive the owner from the session and never from client input. A profile's public identifier SHALL be its own UUID, not the auth user id.

#### Scenario: Another user cannot write
- **GIVEN** user B is signed in and user A owns profile `<idA>`
- **WHEN** user B attempts to update `<idA>` or upload into A's photo folder through the database or storage API
- **THEN** the write is rejected and A's data is unchanged

#### Scenario: One profile per user
- **GIVEN** a user who already owns a profile
- **WHEN** they save a field again
- **THEN** their existing profile is updated and no second profile is created

#### Scenario: URL uses the profile id
- **GIVEN** a public profile
- **WHEN** its page link and its photo URL are rendered
- **THEN** the `href` is `/authors/<profile id>`, and neither the `href` nor the photo URL contains the auth user id

#### Scenario: Anonymous API reads hide the owner
- **GIVEN** a public profile
- **WHEN** an anonymous caller requests its owner column through the database API
- **THEN** the request is rejected

#### Scenario: Signed-in API reads hide the owner (FR-5, added by defect fix)
- **GIVEN** a public profile and a signed-in user, who may be its owner
- **WHEN** the user requests the owner column of any profile through the database API
- **THEN** the request is rejected; the user reaches their own profile only through functions that resolve them from the session and return the profile id

### Requirement: Database integrity under direct writes (FR-5, NFR-2)
The database SHALL enforce the profile rules even when the application is bypassed and its API is called with the publishable key and the owner's own session. It SHALL reject writes to a profile's id, owner, or creation time, a photo path outside the profile's own folder, and a name or about that is empty or whitespace-only.

#### Scenario: Pointing at another author's photo
- **GIVEN** user A owns profile `<idA>` and user B owns `<idB>` with a stored photo
- **WHEN** A updates their own row directly with a photo path inside `<idB>`'s folder
- **THEN** the write is rejected and A's photo path is unchanged

#### Scenario: Protected columns
- **GIVEN** a user owns a profile
- **WHEN** they directly update its id, owner, or creation time
- **THEN** the write is rejected

#### Scenario: Dot segments in the photo path
- **GIVEN** user A owns profile `<idA>` and user B owns `<idB>`
- **WHEN** A directly sets their photo path to `<idA>/../<idB>/<file>.jpg`
- **THEN** the write is rejected

#### Scenario: Whitespace-only name
- **GIVEN** a user owns a profile
- **WHEN** they directly set the first name to "   "
- **THEN** the write is rejected and the profile does not become public

#### Scenario: Upload name format (FR-5, added by defect fix)
- **GIVEN** user A owns profile `<idA>`
- **WHEN** A uploads directly through the storage API an object under `<idA>/` whose name is not `<uuid>.png` or `<uuid>.jpg` (for example `<idA>/page.html`, `<idA>/sub/<uuid>.png`, or a path with `..` segments)
- **THEN** the upload is rejected, so the public photo bucket holds only files in the same format a profile's photo path allows

### Requirement: Editor field states (FR-2, FR-6)
`/account/author` SHALL show four fields: first name, last name, about, and photo. A field without a value SHALL show an add prompt ("Добавить имя", "Добавить фамилию", "Добавить «О себе»", "Добавить фото"); the empty photo field SHALL also show the user-icon placeholder. A field with a value SHALL show it with "Изменить" and "Удалить" buttons. A field being edited SHALL show its input with "Сохранить" and "Отмена" buttons. At most one field SHALL be in edit mode at a time; while one is, the other fields' "Изменить", "Удалить", and add prompts SHALL be disabled. When the profile is public, a "Открыть публичную страницу" link SHALL appear at the top.

#### Scenario: Empty profile
- **GIVEN** a signed-in reader with no profile
- **WHEN** they open `/account/author`
- **THEN** the four add prompts are shown, the photo field shows the user-icon placeholder, and there is no "Открыть публичную страницу" link

#### Scenario: Editing a field
- **GIVEN** the first name "Anna" is saved
- **WHEN** the reader clicks its "Изменить" button
- **THEN** a text input labelled "Имя" holds "Anna", with "Сохранить" and "Отмена" buttons

#### Scenario: Only one field is edited at a time
- **GIVEN** first name and last name are saved
- **WHEN** the reader clicks the first name's "Изменить"
- **THEN** the last name's, about's, and photo's "Изменить", "Удалить", and add prompts are disabled
- **AND** they are enabled again after the reader clicks "Отмена" or the save succeeds

#### Scenario: Cancel discards the draft
- **GIVEN** the reader is editing the first name and has typed "Anya"
- **WHEN** they click "Отмена"
- **THEN** the field shows "Anna" with "Изменить" and "Удалить", and no action was called

#### Scenario: View public page link
- **GIVEN** the profile `<id>` has a first and a last name
- **WHEN** the editor renders
- **THEN** a link "Открыть публичную страницу" with `href` `/authors/<id>` is at the top of the page

### Requirement: Saving a field (FR-7)
Saving SHALL call that field's server action and leave edit mode at once. While pending, the field SHALL show the submitted value as text with one disabled "Сохранение…" button, and every other field's controls SHALL be disabled. On success, "Изменить" returns and "Сохранено" is announced. On failure, the field SHALL return to edit mode (input only) with the draft kept and the error under the field.

#### Scenario: Pending save
- **GIVEN** the reader submits first name "Anna" and the action has not resolved
- **WHEN** the editor renders
- **THEN** the first-name field shows the text "Anna", no text input, and a disabled button "Сохранение…"
- **AND** the "Изменить", "Удалить", and add-prompt buttons of last name, about, and photo are disabled

#### Scenario: Successful save
- **GIVEN** a pending first-name save
- **WHEN** the action resolves successfully
- **THEN** the field shows "Anna" with an enabled "Изменить" button
- **AND** a `role="status"` element reads "Сохранено"
- **AND** the other fields' buttons are enabled again

#### Scenario: Repeated saves are each announced
- **GIVEN** the reader saved the first name and "Сохранено" was announced
- **WHEN** they save the last name successfully
- **THEN** the `role="status"` element is emptied while the save is pending and reads "Сохранено" again afterwards

#### Scenario: Failed save
- **GIVEN** the saved first name is "Anna" and the reader submits "Anya"
- **WHEN** the action returns a failure
- **THEN** the field is back in edit mode with "Anya" in the input and no separate value line
- **AND** the error message is shown under the field and referenced by the input's `aria-describedby`
- **AND** clicking "Отмена" then shows the saved value "Anna"

### Requirement: Name validation (FR-8)
First name and last name SHALL each be trimmed and SHALL be 1–60 characters long, counted in Unicode code points. A violation SHALL be returned as a field error under that field, without any database call.

#### Scenario: Too long
- **GIVEN** a first name of 61 characters
- **WHEN** it is saved
- **THEN** an error under the first-name field reads "Не более 60 символов."
- **AND** no database write happened

#### Scenario: Blank after trimming
- **GIVEN** a last name of only spaces
- **WHEN** it is saved
- **THEN** an error under the last-name field reads "Обязательное поле."

#### Scenario: Emoji count as one character
- **GIVEN** a first name of 60 emoji characters
- **WHEN** it is saved
- **THEN** it is accepted

#### Scenario: Boundary length accepted
- **GIVEN** a first name of exactly 60 characters, surrounded by spaces
- **WHEN** it is saved
- **THEN** the trimmed 60-character value is stored

### Requirement: About validation and alignment (FR-8)
About SHALL be trimmed and the trimmed Markdown source SHALL be what is stored; it SHALL be 1–1000 characters long, counted in Unicode code points and including Markdown syntax. Alignment SHALL be one of left, center, right. A violation SHALL be a field error under about, without any database call.

#### Scenario: Over the limit
- **GIVEN** an about text of 1001 characters
- **WHEN** it is saved
- **THEN** an error under about reads "Не более 1000 символов."
- **AND** no database write happened

#### Scenario: Surrounding whitespace is trimmed before storing
- **GIVEN** an about text of 1000 characters surrounded by spaces and blank lines
- **WHEN** it is saved
- **THEN** it is accepted and the stored value has no leading or trailing whitespace

#### Scenario: Markdown syntax counts
- **GIVEN** an about text of 996 visible characters wrapped in `**…**`
- **WHEN** it is saved
- **THEN** it is accepted (1000 characters)

#### Scenario: Invalid alignment
- **GIVEN** a save request with alignment "justify"
- **WHEN** the action runs
- **THEN** it returns a validation error and makes no database write

### Requirement: Photo validation (FR-8)
A photo SHALL be a PNG or JPEG file of at most 5 × 1024 × 1024 bytes, typed by its content, not its name or declared type. The browser SHALL check this when the file is chosen and before sending, and on a violation show the field error and send nothing. The server SHALL repeat the check; a violation there is the same field error, with nothing uploaded.

#### Scenario: Too large, caught before sending
- **GIVEN** a 6 MB JPEG
- **WHEN** the reader chooses it as the photo
- **THEN** an error under photo reads "Файл должен быть не больше 5 МБ."
- **AND** no request was sent and nothing was uploaded

#### Scenario: Wrong type, caught before sending
- **GIVEN** a GIF file renamed to `photo.png`
- **WHEN** the reader chooses it as the photo
- **THEN** an error under photo reads "Допустимы только изображения PNG или JPEG."
- **AND** no request was sent

#### Scenario: Server repeats the check
- **GIVEN** the photo action is called directly with a GIF disguised as a PNG, or a file of 5 × 1024 × 1024 + 1 bytes
- **WHEN** it runs
- **THEN** it returns the matching field error and nothing is uploaded

#### Scenario: Valid PNG
- **GIVEN** a 2 MB PNG
- **WHEN** it is saved as the photo
- **THEN** it is stored and the photo field shows it

#### Scenario: Stored type follows the content (FR-8, added by defect fix)
- **GIVEN** a valid JPEG sent with a declared type of `image/png`
- **WHEN** it is saved as the photo
- **THEN** it is stored with a `.jpg` name and served with content type `image/jpeg`
- **AND** the client's declared type is not passed to Storage

### Requirement: Server and data-access failures (FR-9)
Failures after validation SHALL be shown under the field that triggered them: not signed in → "Сессия истекла. Войдите снова."; storage, database, or the session check unavailable (FR-20) → "Сохранение сейчас недоступно. Попробуйте позже."; anything else, including an unexpected server error → "Что-то пошло не так. Попробуйте ещё раз." Logs SHALL carry no input values or file contents.

#### Scenario: Session check unavailable (FR-20)
- **GIVEN** Supabase Auth is unreachable when the reader saves a field
- **WHEN** the action checks the session
- **THEN** "Сохранение сейчас недоступно. Попробуйте позже." is shown under that field, not "Сессия истекла. Войдите снова."
- **AND** no database write happened

#### Scenario: Session expired
- **GIVEN** the session has expired since the editor loaded
- **WHEN** the reader saves a field
- **THEN** "Сессия истекла. Войдите снова." is shown under that field
- **AND** no database write happened

#### Scenario: Backend unavailable
- **GIVEN** the database or storage returns a server error, or the Supabase config is missing
- **WHEN** the reader saves a field
- **THEN** "Сохранение сейчас недоступно. Попробуйте позже." is shown under that field

#### Scenario: Unexpected error
- **GIVEN** the server action throws unexpectedly
- **WHEN** the reader saves a field
- **THEN** "Что-то пошло не так. Попробуйте ещё раз." is shown under that field
- **AND** the server log names only the error's type, not the submitted value

#### Scenario: Request rejected before the action runs
- **GIVEN** the action call is rejected by the server framework or the network
- **WHEN** the reader saves a field
- **THEN** "Что-то пошло не так. Попробуйте ещё раз." is shown under that field and the page is not replaced by the error screen

### Requirement: Per-user write limit (FR-21)
The profile actions SHALL limit each signed-in user to 10 profile writes (name save, about save, or any field delete, photo included) in one minute window and 5 photo uploads in one hour window, counted separately in fixed (not sliding) windows that start at the first counted attempt. Every attempt that passes the input schema and the session check SHALL count, whether its write succeeds or fails; a photo whose content check fails counts too, because the limit is checked before its bytes are read. The limit SHALL be checked after the session check and before any other database or Storage call, and for a photo before its bytes are read. Over the limit, the action SHALL make no write, no Storage call, and no cache expiry, and SHALL show «Слишком много сохранений. Попробуйте через минуту.» (profile write) or «Слишком много загрузок фото. Попробуйте через час.» (photo) under the field. The limits SHALL be fixed in the database, and a signed-in user SHALL be unable to read or change their counters through the database API.

#### Scenario: Eleventh save in a minute
- **GIVEN** a reader who has made 10 profile writes in the current minute window
- **WHEN** they save their first name
- **THEN** «Слишком много сохранений. Попробуйте через минуту.» is shown under the first-name field, which returns to edit mode with the draft kept
- **AND** no profile write happened
- **AND** neither the directory's nor the author's cache tag was expired

#### Scenario: Delete over the limit
- **GIVEN** a reader with a saved about who has made 10 profile writes in the current minute window
- **WHEN** they delete about
- **THEN** the previous about returns with «Слишком много сохранений. Попробуйте через минуту.» under the field
- **AND** about is still stored

#### Scenario: Sixth photo in an hour
- **GIVEN** a reader who has uploaded 5 photos in the current hour window
- **WHEN** they save a valid photo
- **THEN** «Слишком много загрузок фото. Попробуйте через час.» is shown under the photo field
- **AND** nothing was uploaded, the file's bytes were not read, and no cache tag was expired

#### Scenario: The two limits are separate
- **GIVEN** a reader who has uploaded 5 photos in the current hour window
- **WHEN** they save their last name
- **THEN** the save succeeds

#### Scenario: The window resets
- **GIVEN** a reader whose 10 profile writes all fall in a window that started more than a minute ago
- **WHEN** they save a field
- **THEN** the save succeeds and starts a new window

#### Scenario: Not counted before the session check
- **GIVEN** a signed-out caller, or an input the action's schema rejects (a name over 60 characters, a file over 5 MB)
- **WHEN** the action is called
- **THEN** no allowance is consumed

#### Scenario: A photo with the wrong content counts
- **GIVEN** the browser check was bypassed and a GIF renamed to `.jpg` reaches the photo action
- **WHEN** the action runs
- **THEN** one photo-upload allowance is consumed before the file's bytes are read
- **AND** «Допустимы только изображения PNG или JPEG.» is shown under the photo field and nothing is uploaded

#### Scenario: Limit check unavailable
- **GIVEN** the limit check's database call returns a server or network error, or the Supabase config is missing
- **WHEN** the reader saves a field
- **THEN** «Сохранение сейчас недоступно. Попробуйте позже.» is shown under the field
- **AND** no profile write happened

#### Scenario: Session expires between the two checks
- **GIVEN** the session check passed, but the limit check's call is rejected because the token has just expired (HTTP 401)
- **WHEN** the reader saves a field
- **THEN** «Сессия истекла. Войдите снова.» is shown under the field
- **AND** no profile write happened

#### Scenario: Limit check fails otherwise
- **GIVEN** the limit check fails for another reason (the function is missing, or it returns something other than true or false)
- **WHEN** the reader saves a field
- **THEN** «Что-то пошло не так. Попробуйте ещё раз.» is shown under the field
- **AND** no profile write happened

#### Scenario: Counters are out of the API's reach
- **GIVEN** a signed-in user calling the database API directly with the publishable key
- **WHEN** they select, insert, update, or delete rows of the counter table
- **THEN** each request is denied
- **AND** an anonymous caller cannot call the allowance function

### Requirement: Deleting a field (FR-10)
"Удалить" SHALL clear that field through its server action at once, with no confirmation, with the same pending, notification, and error behavior as saving. Afterwards the field SHALL show its add prompt. While pending, the field SHALL show its empty state at once with a disabled add prompt reading "Удаление…"; on failure the previous value SHALL return. Deleting about SHALL reset alignment to left. Deleting the photo SHALL remove the stored file and show the user-icon placeholder again, as before a photo was added.

#### Scenario: Delete about
- **GIVEN** about is saved with center alignment
- **WHEN** the reader clicks about's "Удалить" and the action succeeds
- **THEN** the field shows "Добавить «О себе»", "Сохранено" is announced, and a later about save starts with left alignment

#### Scenario: Delete photo
- **GIVEN** a photo is saved
- **WHEN** the reader deletes it and the action succeeds
- **THEN** the field shows the user-icon placeholder and "Добавить фото", and the stored file no longer exists
- **AND** the public page shows the placeholder instead of the photo

#### Scenario: Delete photo fails
- **GIVEN** a photo is saved
- **WHEN** the reader deletes it and the database write fails
- **THEN** the previous photo is shown again with the error under the field, and the stored file still exists

#### Scenario: Delete pending
- **GIVEN** a delete of the last name "Akhmatova" is pending
- **WHEN** the editor renders
- **THEN** the last-name field shows no value and a disabled add prompt reading "Удаление…"
- **AND** the other fields' "Изменить", "Удалить", and add prompts are disabled

#### Scenario: Delete fails
- **GIVEN** a delete of the last name "Akhmatova" is pending
- **WHEN** the action returns a failure
- **THEN** the field shows "Akhmatova" with "Изменить" and "Удалить" again, and the error under the field

### Requirement: About editor toolbar (FR-11)
The about editor SHALL offer toolbar buttons that insert Markdown around the selection: «Жирный», «Курсив», «Заголовок», «Подзаголовок», «Маркированный список», «Нумерованный список», «Цитата». It SHALL also offer an alignment control («По левому краю», «По центру», «По правому краю»), a «Редактор»/«Просмотр» toggle, and a live character count out of 1000, measured as validation measures (code points after trimming). It can exceed 1000, and over the limit it is shown in the danger colour. Inputs SHALL NOT cap typing or truncate pastes.

#### Scenario: Bold wraps the selection
- **GIVEN** the about text "hello world" with "world" selected
- **WHEN** the reader clicks "Жирный"
- **THEN** the text becomes "hello **world**" and "world" is still selected

#### Scenario: Block format prefixes lines
- **GIVEN** two selected lines "a" and "b"
- **WHEN** the reader clicks "Маркированный список"
- **THEN** the text becomes "- a" and "- b" on separate lines

#### Scenario: Preview renders the Markdown
- **GIVEN** the about text "## Hi"
- **WHEN** the reader switches to «Просмотр»
- **THEN** a level-2 heading "Hi" is shown

#### Scenario: Counter
- **GIVEN** the reader has typed 42 characters
- **WHEN** the editor renders
- **THEN** the counter reads "42 / 1000"

#### Scenario: Counter over the limit, no input cap
- **GIVEN** the reader pastes 1012 characters into about
- **WHEN** the editor renders
- **THEN** the textarea holds all 1012 characters, the counter reads "1012 / 1000" in the danger colour
- **AND** saving shows the over-limit error under about

#### Scenario: Counter matches validation
- **GIVEN** the about text is "  hi  " (two characters after trimming)
- **WHEN** the editor renders
- **THEN** the counter reads "2 / 1000"

### Requirement: Photo replacement (FR-12)
Saving a new photo over an existing one SHALL leave only the new file stored for that profile, and every page SHALL show the new photo.

#### Scenario: Replace
- **GIVEN** photo file F1 is saved
- **WHEN** the reader saves photo F2 successfully
- **THEN** the profile shows F2 and F1 is no longer stored

### Requirement: Author directory (FR-13)
`/authors` SHALL list every public profile as a link to `/authors/<id>` labelled "<first name> <last name>", sorted case-insensitively by last name, then first name, then profile id. With no public profile it SHALL show "Пока нет авторов." It SHALL be readable without signing in.

#### Scenario: Sorted list
- **GIVEN** public profiles "Boris Pasternak", "Anna Akhmatova", "Marina Tsvetaeva"
- **WHEN** an anonymous visitor opens `/authors`
- **THEN** the links appear in the order Anna Akhmatova, Boris Pasternak, Marina Tsvetaeva

#### Scenario: Case-insensitive order with a stable tiebreak
- **GIVEN** public profiles "anna zeta", "Boris Alpha", and two "Ivan Petrov" profiles with ids `<id1>` < `<id2>`
- **WHEN** `/authors` renders
- **THEN** the order is Boris Alpha, Ivan Petrov (`<id1>`), Ivan Petrov (`<id2>`), anna zeta

#### Scenario: Empty directory
- **GIVEN** no public profiles
- **WHEN** `/authors` renders
- **THEN** it shows "Пока нет авторов."

#### Scenario: Directory unavailable
- **GIVEN** the database read fails
- **WHEN** `/authors` renders
- **THEN** it shows "Список авторов сейчас недоступен."

### Requirement: Public author page (FR-14)
`/authors/[id]` SHALL render a public profile without signing in: the full name as the page heading, the photo (or a user-icon placeholder), and the about section rendered from Markdown with its alignment, or no about section when about is empty. An `id` that is not a UUID or names no public profile SHALL render the 404 page (its UI; the streamed status may be 200).

#### Scenario: Full profile
- **GIVEN** a public profile "Anna Akhmatova" with a photo and about "## Poet" aligned center
- **WHEN** an anonymous visitor opens `/authors/<id>`
- **THEN** a level-1 heading "Anna Akhmatova", an image with alt "Фото: Anna Akhmatova", and a centered level-2 heading "Poet" are shown

#### Scenario: No photo
- **GIVEN** a public profile without a photo
- **WHEN** its page renders
- **THEN** a user-icon placeholder is shown instead of an image

#### Scenario: Unknown or malformed id
- **GIVEN** the id "not-a-uuid", or a UUID with no public profile
- **WHEN** `/authors/<id>` is requested
- **THEN** the 404 page renders

### Requirement: Owner edit link (FR-15)
When the signed-in reader owns the profile, `/authors/[id]` SHALL show an "Редактировать профиль" link to `/account/author` at the top of the page. Other visitors SHALL NOT see it.

#### Scenario: Owner
- **GIVEN** the signed-in reader owns profile `<id>`
- **WHEN** they open `/authors/<id>`
- **THEN** a link "Редактировать профиль" with `href` `/account/author` is shown at the top

#### Scenario: Other visitor
- **GIVEN** an anonymous visitor, or a signed-in reader who does not own `<id>`
- **WHEN** they open `/authors/<id>`
- **THEN** no "Редактировать профиль" link is shown

### Requirement: Photo sizing (FR-16)
The photo and its placeholder SHALL display at 300 × 400 CSS pixels, cropped to cover, on viewports 460 px wide or wider. On narrower viewports they SHALL take the full width of the page's content container with a 3:4 aspect ratio.

#### Scenario: Desktop size
- **GIVEN** a viewport 1024 px wide
- **WHEN** an author page with a photo renders
- **THEN** the photo box measures 300 × 400 px

#### Scenario: Narrow viewport
- **GIVEN** a viewport 390 px wide
- **WHEN** the same page renders
- **THEN** the photo box spans the content width and its height is 4/3 of its width

### Requirement: Cache freshness after edits (FR-17)
Public author data SHALL be served from cache. A successful save or delete SHALL expire that author's cached data and the directory's, so the next view of either page shows the change.

#### Scenario: Name change shows immediately
- **GIVEN** `/authors` and `/authors/<id>` have been rendered and cached showing "Anna Akhmatova"
- **WHEN** the owner saves first name "Anya" successfully and then opens either page
- **THEN** both show "Anya Akhmatova"

### Requirement: Own-profile load failure (FR-18)
When the signed-in reader's own profile can't be read, `/account` and `/account/author` SHALL show "Не удалось загрузить профиль. Попробуйте позже." in place of the author section or editor, and `/authors/[id]` SHALL show no "Редактировать профиль" link.

#### Scenario: Editor can't load
- **GIVEN** a signed-in reader and a failing profile read
- **WHEN** they open `/account/author`
- **THEN** the message is shown in a `role="alert"` element and no field editor is rendered

#### Scenario: Owner link on failure
- **GIVEN** the owner's profile read fails
- **WHEN** they open their public page
- **THEN** the page renders without an "Редактировать профиль" link

### Requirement: Brief caching of failed public reads (NFR-7)
A cached public read (the directory list, or one author) SHALL keep an unavailable result for seconds, a not-found result for minutes, and a successful result for hours, so a transient failure heals without a deploy or an edit. With no cache entry, the page SHALL show its loading state until the read finishes, and concurrent requests for the same read on one server instance SHALL share one read (add-author-poems FR-14). An unavailable result SHALL never be frozen into a prerendered page: a build with no database SHALL exit 0 and the page SHALL render the failure at request time.

#### Scenario: Unavailable heals
- **GIVEN** `/authors` rendered "Список авторов сейчас недоступен." because the database was down
- **WHEN** the database is back and the page is requested again a little over one second later (the `"seconds"` profile's revalidate time, with Next's default cache)
- **THEN** it lists the public authors without any edit or deploy

#### Scenario: Loading state and one shared read
- **GIVEN** no cache entry for an author, and the server's read from Supabase is slow (delayed on the server → Supabase hop, not in the browser)
- **WHEN** two requests for `/authors/<id>` arrive at the same time
- **THEN** both show the author page's skeleton until the content arrives
- **AND** the database is read once for both

#### Scenario: Build without a database
- **GIVEN** no Supabase environment variables are set
- **WHEN** `npm run build` runs
- **THEN** it exits 0, and `/authors` is not prerendered with the unavailable message: the list renders at request time

### Requirement: Russian UI copy (NFR-8)
Every user-facing text this change adds SHALL be in Russian, exactly as listed in the proposal's UI copy table, and the elements rendering it SHALL carry `lang="ru"`. "At the top" for the «Открыть публичную страницу» and «Редактировать профиль» links SHALL mean the first element of the page's main content, above its heading.

#### Scenario: Validation messages are Russian
- **GIVEN** a first name of 61 characters and an empty last name
- **WHEN** they are saved
- **THEN** the errors read "Не более 60 символов." and "Обязательное поле."

#### Scenario: Language attribute
- **GIVEN** the editor or an author page renders
- **WHEN** its main content is inspected
- **THEN** the element wrapping the feature's text has `lang="ru"`

#### Scenario: Link position
- **GIVEN** the owner opens their public page
- **WHEN** it renders
- **THEN** «Редактировать профиль» precedes the level-1 heading inside the main content

### Requirement: Safe Markdown rendering (NFR-1)
Rendered about Markdown SHALL contain no raw HTML from the source. Only paragraphs, strong, emphasis, h2, h3, lists, list items, blockquotes, and line breaks SHALL be rendered as elements. Links and images SHALL be rendered as their plain text.

#### Scenario: Script tag
- **GIVEN** an about text containing `<script>alert(1)</script>`
- **WHEN** the public page renders
- **THEN** the output contains no `script` element

#### Scenario: Link becomes text
- **GIVEN** an about text `[site](https://evil.example)`
- **WHEN** it renders
- **THEN** the text "site" is shown and there is no `a` element in the about section

### Requirement: Secrets and logging (NFR-3)
Only the Supabase publishable key SHALL be used, with no service-role key. Server logs from author actions and data access SHALL contain an error's type name only, never input values or file contents.

#### Scenario: No privileged key
- **GIVEN** the change is complete
- **WHEN** the source is searched for `SUPABASE_SERVICE_ROLE` or `SUPABASE_SECRET`
- **THEN** there are no matches

### Requirement: Dependencies and token-only styles (NFR-4)
Relative to `main`, the change SHALL add exactly one runtime dependency, `react-markdown`. New components SHALL use existing design tokens and Tailwind utilities only, with no color literals.

#### Scenario: Dependencies and colors
- **GIVEN** the change is complete
- **WHEN** `package.json` `dependencies` are diffed against `main` and the new component files are searched for hex, `rgb(`, `hsl(` literals and Tailwind arbitrary color values
- **THEN** only `react-markdown` is added and there are no color matches

### Requirement: Accessible editor and pages (NFR-5)
Every editor input SHALL have a visible label. Field errors SHALL be linked through `aria-describedby` and set `aria-invalid`. Toolbar buttons SHALL have accessible names. The photo SHALL have alt text "Фото: <full name>". The placeholder SHALL be hidden from assistive technology. The save notification SHALL be announced through `role="status"`.

#### Scenario: Field error wiring
- **GIVEN** a first-name validation error
- **WHEN** the editor renders
- **THEN** the "Имя" input has `aria-invalid="true"` and `aria-describedby` pointing at the error text

#### Scenario: Toolbar names
- **GIVEN** the about editor is open
- **WHEN** the toolbar is queried by role
- **THEN** buttons named "Жирный", "Курсив", "Заголовок", "Подзаголовок", "Маркированный список", "Нумерованный список", and "Цитата" exist

#### Scenario: Keyboard focus follows the field's mode (NFR-5, added by defect fix)
- **GIVEN** a keyboard user on the editor with a saved first name
- **WHEN** they press Enter on the first name's «Изменить», or on an empty field's add prompt
- **THEN** focus is in that field's control (the input, the about textarea, or the photo file input)
- **AND WHEN** they press «Отмена», or the save or delete they started succeeds
- **THEN** focus is on that field's «Изменить», or on its add prompt when the field is now empty
- **AND WHEN** a name or about save fails
- **THEN** focus is in that field's control, which shows the error
- **AND** a first page load moves focus nowhere

### Requirement: Rendering modes (NFR-6)
`npm run build` SHALL succeed with no Supabase environment variables set. `/authors` and `/authors/[id]` SHALL be partially prerendered with cached content, and `/account` and `/account/author` SHALL render per request.

#### Scenario: Build without env
- **GIVEN** no `NEXT_PUBLIC_SUPABASE_*` variables are set
- **WHEN** `npm run build` runs
- **THEN** it exits 0 and its route table lists `/authors`, `/authors/[id]`, `/account`, and `/account/author`

