## RENAMED Requirements

- FROM: `### Requirement: About validation and alignment (FR-8)`
- TO: `### Requirement: About validation (FR-8)`

## MODIFIED Requirements

### Requirement: About validation (FR-8)
About SHALL be trimmed and the trimmed Markdown source SHALL be what is stored; it SHALL be 1–1000 characters long, counted in Unicode code points and including Markdown syntax. A violation SHALL be a field error under about, without any database call. The about save SHALL accept only the about text: no alignment is validated or stored (refine-author-page-and-contact FR-4), and any other field in the request is ignored.

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
- **GIVEN** a save request with about "Текст" and an extra field `align` = "justify"
- **WHEN** the action runs
- **THEN** it succeeds and the database write holds only `about` = "Текст"

### Requirement: Database integrity under direct writes (FR-5, NFR-2)
The database SHALL enforce the profile rules even when the application is bypassed and its API is called with the publishable key and the owner's own session. It SHALL reject writes to a profile's id, owner, or creation time, a photo path outside the profile's own folder, and a name or about that is empty or whitespace-only. `public.author_profiles` SHALL have no `about_align` column (refine-author-page-and-contact FR-4).

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

#### Scenario: No alignment column
- **GIVEN** the migrations are applied
- **WHEN** the columns of `public.author_profiles` are listed
- **THEN** `about_align` is not among them

### Requirement: Deleting a field (FR-10)
"Удалить" SHALL clear that field through its server action at once, with no confirmation, with the same pending, notification, and error behavior as saving. Afterwards the field SHALL show its add prompt. While pending, the field SHALL show its empty state at once with a disabled add prompt reading "Удаление…"; on failure the previous value SHALL return. Deleting about SHALL clear only the about text. Deleting the photo SHALL remove the stored file and show the user-icon placeholder again, as before a photo was added.

#### Scenario: Delete about
- **GIVEN** about is saved
- **WHEN** the reader clicks about's "Удалить" and the action succeeds
- **THEN** the field shows "Добавить «О себе»" and "Сохранено" is announced
- **AND** the database write sets only `about` to null

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
The about editor SHALL offer toolbar buttons that insert Markdown around the selection: «Жирный», «Курсив», «Заголовок», «Подзаголовок», «Маркированный список», «Нумерованный список», «Цитата». It SHALL also offer a «Редактор»/«Просмотр» toggle and a live character count out of 1000, measured as validation measures (code points after trimming). It can exceed 1000, and over the limit it is shown in the danger colour. Inputs SHALL NOT cap typing or truncate pastes. It SHALL offer no alignment control, in either tab (refine-author-page-and-contact FR-2), and the «Просмотр» tab SHALL render about left-aligned, as the public page does (refine-author-page-and-contact FR-3).

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

#### Scenario: No alignment control
- **GIVEN** the about editor is open
- **WHEN** the «Редактор» tab and then the «Просмотр» tab render
- **THEN** neither has a button named «По левому краю», «По центру», or «По правому краю»

### Requirement: Public author page (FR-14)
`/authors/[id]` SHALL render a public profile without signing in: the full name as the page heading, the photo (or a user-icon placeholder), and the about section rendered from Markdown, left-aligned, with list markers at the left edge inside the text block and no indent (refine-author-page-and-contact FR-3), or no about section when about is empty. An `id` that is not a UUID or names no public profile SHALL render the 404 page (its UI; the streamed status may be 200).

#### Scenario: Full profile
- **GIVEN** a public profile "Anna Akhmatova" with a photo and about "## Poet\n\n- first\n- second"
- **WHEN** an anonymous visitor opens `/authors/<id>`
- **THEN** a level-1 heading "Anna Akhmatova", an image with alt "Фото: Anna Akhmatova", a level-2 heading "Poet", and a two-item list are shown
- **AND** the about section carries no centre or right alignment, and its list markers sit inside the text block at its left edge, with no indent

#### Scenario: No photo
- **GIVEN** a public profile without a photo
- **WHEN** its page renders
- **THEN** a user-icon placeholder is shown instead of an image

#### Scenario: Unknown or malformed id
- **GIVEN** the id "not-a-uuid", or a UUID with no public profile
- **WHEN** `/authors/<id>` is requested
- **THEN** the 404 page renders

## ADDED Requirements

### Requirement: Local test data seed (FR-22)
`supabase/seed.sql` SHALL create, on `npx supabase db reset`, five test readers with confirmed emails who can sign in, each owning a public author profile (first name, last name, and a Markdown about text holding a heading and a list), whose profile ids give them mock poems in email order (`author1@example.test` 0, `author2@example.test` 1, `author3@example.test` 2, `author4@example.test` 3, `author5@example.test` 4), and one more test reader whose profile has no name and is therefore not public (refine-author-page-and-contact FR-8). The seed SHALL use `.test` email addresses and a placeholder password documented as local-only, and SHALL run only on a local reset, never on `db push`.

#### Scenario: Reset loads exactly the seed
- **GIVEN** the local Supabase stack holds older hand-made test records
- **WHEN** `npx supabase db reset` runs
- **THEN** `auth.users` holds exactly the six seeded readers and `public.author_profiles` exactly their six profiles
- **AND** `/authors` lists exactly the five public seeded authors

#### Scenario: Every poem count is covered
- **GIVEN** the five public seeded profile ids
- **WHEN** the mock poem count is computed for each
- **THEN** `author1@example.test`'s profile gets 0, `author2` 1, `author3` 2, `author4` 3, and `author5` 4

#### Scenario: A seeded reader can sign in
- **GIVEN** the seed is loaded
- **WHEN** `author1@example.test` signs in on `/login` with the seed's placeholder password
- **THEN** sign-in succeeds and `/account/author` shows that reader's profile
