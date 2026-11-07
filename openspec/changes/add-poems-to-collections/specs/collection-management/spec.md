## MODIFIED Requirements

### Requirement: Collection page (FR-6)
`/account/poems/collections/<collectionId>` SHALL show the collection's title as the level-1 heading, its description split into paragraphs on blank lines when it has one, a single line break inside a paragraph shown as a line break (spec-clarify, 2026-11-04); then, when the collection holds poems, the level-2 heading «Произведения» and a list of the collection's poems, newest first by the poem's creation time, each item only the title as a link to `/account/poems/<poemId>` (add-poems-to-collections FR-2); and below them, in one row, the link styled as a button «Редактировать сборник» (to `/account/poems/collections/<collectionId>/edit`), the button «Произведения сборника» (add-poems-to-collections FR-2, FR-3), and the danger button «Удалить сборник», in that order. «Произведения сборника» SHALL be shown exactly when the collection holds at least one poem or the author has at least one free poem (user decision, 2026-11-07); otherwise it SHALL not be rendered. With no poems in the collection, neither the «Произведения» heading nor the list SHALL be rendered. An id that isn't one of the signed-in author's collections — unknown, malformed, or another author's — or any collection while the own profile isn't public SHALL render the 404 page. A failed read of the collection or of its poems SHALL show the generic error screen. While loading, the page SHALL show a skeleton.

#### Scenario: Own collection
- **GIVEN** a signed-in author with the collection «Осенний цикл», description «Стихи октября», holding no poems, and no free poems
- **WHEN** they open its page
- **THEN** the heading «Осенний цикл», the paragraph «Стихи октября», «Редактировать сборник», and «Удалить сборник» are shown
- **AND** no «Произведения» heading and no «Произведения сборника» button exist

#### Scenario: Collection with poems
- **GIVEN** the collection «Осенний цикл» holds «Ночной вокзал» (created 2026-10-02) and «Осенний сад» (created 2026-10-01)
- **WHEN** its author opens its page
- **THEN** the heading «Произведения» and the links «Ночной вокзал», «Осенний сад», in that order, each to `/account/poems/<its id>`, are shown between the description and the button row
- **AND** the button row reads «Редактировать сборник», «Произведения сборника», «Удалить сборник»

#### Scenario: Empty collection, free poems exist
- **GIVEN** an empty collection and an author with one free poem
- **WHEN** they open the collection's page
- **THEN** «Произведения сборника» is shown and no «Произведения» heading exists

#### Scenario: Every poem in another collection
- **GIVEN** an empty collection «Весна» and an author whose every poem is in «Осенний цикл»
- **WHEN** they open «Весна»'s page
- **THEN** «Произведения сборника» is not rendered
- **AND** on «Осенний цикл»'s page it is shown

#### Scenario: Line breaks in the description
- **GIVEN** a description «Стихи октября\nи ноября\n\nБез посвящений»
- **WHEN** its author opens the collection page
- **THEN** two paragraphs are shown, the first on two lines «Стихи октября» / «и ноября», the second «Без посвящений»

#### Scenario: No description
- **GIVEN** a collection stored without a description, no poems in it, and no free poems
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

### Requirement: Offline or slow connection on collection pages (FR-14)
While the browser reports no connection, or its own estimate reports a slow one, the create form, the edit form, the collection page, the open delete dialog, and the collection poems page SHALL show the existing offline or slow notice (the add form's texts) — above the form, above the button row, above the dialog's buttons, or above the checkbox list — and «Создать сборник», «Сохранить изменения», «Удалить сборник», «Произведения сборника», the dialog's «Удалить», every checkbox and «Сохранить выбранное» on the collection poems page, and the leave dialog's «Сохранить изменения» there SHALL be disabled; they SHALL be enabled again when the connection is back (add-poems-to-collections FR-9: on the collection poems page every action is frozen, user request 2026-11-07). «Удалить сборник» and «Произведения сборника» SHALL be disabled with `aria-disabled="true"` (announced as disabled, presses ignored, still focusable), so focus can stay on or return to them; the others use the native `disabled` attribute (spec-clarify, 2026-11-04). Fields on the forms, links, «Отменить изменения», «Отмена», and the leave dialog's «Уйти без сохранения» and «Остаться» SHALL stay enabled. A request that fails because the connection dropped SHALL keep every value — the selection included — and show the offline notice, not a failure alert.

#### Scenario: Offline on the edit form
- **GIVEN** a changed edit form
- **WHEN** the browser goes offline
- **THEN** «Нет подключения к интернету. Сохранение станет доступно, когда связь восстановится.» is shown above the form, «Сохранить изменения» is disabled, and the fields stay editable
- **AND** when the browser is online again, the notice goes and «Сохранить изменения» is enabled

#### Scenario: Offline on the collection page
- **GIVEN** a collection page showing «Произведения сборника»
- **WHEN** the browser goes offline
- **THEN** the offline notice is shown above the buttons, «Удалить сборник» and «Произведения сборника» are disabled, and «Редактировать сборник» stays a working link

#### Scenario: Offline while the delete dialog is open
- **GIVEN** the delete dialog is open
- **WHEN** the browser goes offline
- **THEN** the offline notice is shown inside the dialog above its buttons and the dialog's «Удалить» is disabled, while «Отмена» stays enabled

#### Scenario: Offline on the collection poems page
- **GIVEN** the collection poems page with one box checked and not saved
- **WHEN** the browser goes offline
- **THEN** the offline notice is shown above the list, every checkbox and «Сохранить выбранное» are disabled, and the checked box stays checked
- **AND** when the browser is online again, the notice goes and the boxes and the button are enabled

#### Scenario: Slow connection on the collection poems page
- **GIVEN** the collection poems page
- **WHEN** the browser's estimate reports a slow connection
- **THEN** the slow notice is shown above the list and every checkbox and «Сохранить выбранное» are disabled

#### Scenario: Connection drops during a save
- **GIVEN** a changed selection on the collection poems page
- **WHEN** the author presses «Сохранить выбранное» and the request fails because the connection dropped
- **THEN** the offline notice is shown, no failure alert is shown, and the selection is kept

### Requirement: Guests can't reach collection pages (FR-16)
A signed-out page request for `/account/poems/collections/new`, `/account/poems/collections/<id>`, `/account/poems/collections/<id>/edit`, or `/account/poems/collections/<id>/poems` (add-poems-to-collections FR-13) SHALL be redirected to `/login` before the page renders, and each page SHALL also check the session itself.

#### Scenario: Guest
- **GIVEN** a signed-out visitor
- **WHEN** they request any of the four paths
- **THEN** the response is a redirect to `/login`, and no collection content is rendered

### Requirement: Server-rendered collection pages (NFR-2)
The four collection pages and the section on `/account/poems` SHALL be Server Components; the only client modules in `collection-management` SHALL be the create form, the edit form (with their shared fields and form hook), the leave guard both the edit form and the collection poems form use, the edit form's leave dialog, the collection page's connection-aware button row, the delete button with its dialog, the «Произведения сборника» button, the collection poems form with its leave dialog, the one-time list notice, and the saved notice. No collection or poem data SHALL be kept in a client cache or store, except that the list notice's store SHALL hold the outcome and one title until the notice shows, the saved notice's store only the id of the collection just saved, and the collection poems form its own selection as component state for as long as the page is open (add-poems-to-collections NFR-2).

#### Scenario: Static check
- **GIVEN** the change is complete
- **WHEN** `src/features/collection-management/` and `src/app/(authorized)/account/poems/collections/` are searched for `"use client"`
- **THEN** the only matches are the modules listed above

### Requirement: Rendering modes of collection routes (NFR-8)
The four collection routes SHALL build as partially prerendered routes: the static shell (heading where static, skeleton) prerendered, the session and data reads inside a Suspense boundary at request time, with no route segment config (add-poems-to-collections NFR-8).

#### Scenario: Build output
- **GIVEN** `npm run build`
- **WHEN** the route list is printed
- **THEN** the four collection routes, `/account/poems/collections/[collectionId]/poems` included, are marked partially prerendered, like `/account/poems/[poemId]/edit`

### Requirement: Collection module boundaries (NFR-3)
Collections SHALL live in their own feature, imported only through its public API by `breadcrumbs` and the route files; `poem-management` and `collection-management` SHALL NOT import each other, and `/account/poems`'s route file SHALL compose them through slot props. The feature SHALL import `auth` and `authors` only through their public APIs and nothing from `poems` or `poem-management`. It SHALL repeat the poem flows' logic in its own files — its form hook, leave guard, leave dialog, write-log helpers, and the owner's poem page path — and SHALL reuse from `shared/` only domain-free code that is already there (the connection status and its notice, the leave-block store and its answers, the one-time notice hook, the session-expired store, the Supabase clients and error classifier, the UI primitives) plus the `TextAreaField` primitive (user decision, 2026-11-04). Its leave guard SHALL exist once, in the feature's `hooks/`, used by both the edit form and the collection poems form (add-poems-to-collections NFR-3).

#### Scenario: Static check
- **GIVEN** the change is complete
- **WHEN** `src/features/collection-management/` is searched for `@/features/poems`, `@/features/poem-management`, and `navigator.onLine`, and `src/features/poem-management/` for `@/features/collection-management`
- **THEN** there are no matches
- **AND** `beforeunload` appears in `collection-management` only in `hooks/use-leave-guard.ts`

## ADDED Requirements

### Requirement: One collection per poem (add-poems-to-collections FR-1)
A poem SHALL belong to at most one collection, and only to a collection of its own author. A poem in no collection is *free*. A newly created poem SHALL be free, and every poem stored before this change SHALL start free. Deleting a collection SHALL make its poems free, and deleting a poem SHALL take it out of its collection; neither SHALL change any other poem or collection. Which collection a poem belongs to SHALL be visible only to the poem's author, on the account pages.

#### Scenario: Deleting a collection frees its poems
- **GIVEN** the collection «Осенний цикл» holds «Ночной вокзал»
- **WHEN** its author deletes «Осенний цикл»
- **THEN** «Ночной вокзал» still exists and is listed unchecked on the collection poems page of any other collection of that author

#### Scenario: Deleting a poem
- **GIVEN** «Осенний цикл» holds «Ночной вокзал» and «Осенний сад»
- **WHEN** the author deletes «Ночной вокзал»
- **THEN** «Осенний цикл»'s page lists only «Осенний сад»

#### Scenario: New poem is free
- **GIVEN** an author with one collection
- **WHEN** they create the poem «Первый снег»
- **THEN** that collection's poems page lists «Первый снег» unchecked

#### Scenario: Public pages unchanged
- **GIVEN** «Ночной вокзал» is in a collection
- **WHEN** a guest opens the poem's public page and the author's public page
- **THEN** both show what they showed before the poem joined the collection, with nothing about collections

### Requirement: Opening the collection poems page (add-poems-to-collections FR-3)
Pressing «Произведения сборника» SHALL first ask the server whether the collection still exists and still has something to manage (at least one of its own poems or one free poem of the author). While the check is sending, the button SHALL be disabled and a second press SHALL send nothing. When there is something to manage, the author SHALL be taken to `/account/poems/collections/<collectionId>/poems` (a history push). Otherwise the author SHALL stay on the collection page, and a `role="alert"` element directly under the button row SHALL show «Сборник уже удалён.» when the collection no longer exists (deleted in another tab) or the own profile is no longer public (the collection pages then answer 404, Gate 2), «Нет свободных произведений для добавления в сборник.» when nothing is left to manage, or «Не удалось открыть произведения сборника. Попробуйте позже.» when the check fails; focus SHALL stay on the button, and the alert SHALL go on the next press. When the session can't be refreshed, the author SHALL be taken to `/login` with «Сессия истекла. Войдите снова.» once.

#### Scenario: Opens the page
- **GIVEN** a collection page showing «Произведения сборника» and the author has a free poem
- **WHEN** they press «Произведения сборника»
- **THEN** they are on `/account/poems/collections/<its id>/poems`
- **AND** the browser's Back button returns them to the collection page

#### Scenario: Collection deleted in another tab
- **GIVEN** a collection page opened before the collection was deleted in another tab
- **WHEN** the author presses «Произведения сборника»
- **THEN** they stay on the page and «Сборник уже удалён.» is shown under the button row in a `role="alert"` element

#### Scenario: Nothing left to manage
- **GIVEN** a collection page of an empty collection showing «Произведения сборника», and in another tab the author's last free poem was added to another collection
- **WHEN** the author presses «Произведения сборника»
- **THEN** they stay on the page and «Нет свободных произведений для добавления в сборник.» is shown under the button row

#### Scenario: Check fails
- **GIVEN** the database can't be reached
- **WHEN** the author presses «Произведения сборника»
- **THEN** «Не удалось открыть произведения сборника. Попробуйте позже.» is shown under the button row and they stay on the page

#### Scenario: Session expired
- **GIVEN** a session that can't be refreshed
- **WHEN** the author presses «Произведения сборника»
- **THEN** they land on `/login` with «Сессия истекла. Войдите снова.»

### Requirement: Collection poems page (add-poems-to-collections FR-4)
`/account/poems/collections/<collectionId>/poems` SHALL show the level-1 heading «Произведения сборника», then the hint «Отметьте произведения сборника «<title>». Произведение может входить только в один сборник.», then a group of checkboxes named «Произведения»: one checkbox per poem that is in this collection (checked) or free (unchecked), all in one list, newest first by the poem's creation time, each labelled by the poem's title. Poems in other collections SHALL NOT be listed. When the list would be empty, the page SHALL show «Нет свободных произведений для добавления в сборник.» and the link «Вернуться к сборнику» (to the collection page) instead of the group. An id that isn't one of the signed-in author's collections — unknown, malformed, or another author's — or any collection while the own profile isn't public SHALL render the 404 page. A failed read SHALL show the generic error screen. While loading, the page SHALL show the heading and a skeleton of the list.

#### Scenario: Collection and free poems
- **GIVEN** «Осенний цикл» holds «Ночной вокзал» (created 2026-10-02); the author's «Осенний сад» (2026-10-03) is free and «Весенний дождь» (2026-10-04) is in «Весна»
- **WHEN** they open «Осенний цикл»'s poems page
- **THEN** the heading «Произведения сборника», the hint naming «Осенний цикл», and two checkboxes in order «Осенний сад» (unchecked), «Ночной вокзал» (checked) are shown
- **AND** «Весенний дождь» is not listed, and no «Сохранить выбранное» button exists

#### Scenario: Nothing to manage
- **GIVEN** an empty collection and no free poems
- **WHEN** the author opens its poems page by address
- **THEN** «Нет свободных произведений для добавления в сборник.» and «Вернуться к сборнику» are shown, and no checkbox exists

#### Scenario: Another author's collection
- **GIVEN** a collection id of another author
- **WHEN** a signed-in author opens `/account/poems/collections/<that id>/poems`
- **THEN** the 404 page renders

#### Scenario: Read fails
- **GIVEN** the database can't be reached
- **WHEN** the author opens a collection poems page
- **THEN** the generic error screen is shown

### Requirement: Selection and change detection (add-poems-to-collections FR-5)
The page SHALL count as changed exactly when the set of checked poems differs from the stored set of the collection's poems. While changed, the button «Сохранить выбранное» SHALL be shown and enabled. While unchanged and no save has succeeded since the page opened, neither «Сохранить выбранное» nor «Вернуться к сборнику» SHALL be shown. Checking a box and unchecking it again SHALL count as no change. "Since the page opened" counts from the last full load: returning by Back/Forward to a page Next still keeps restores it as it was left — the saved notice, the disabled button, and the link included — while a reload or a new visit by link opens it fresh (spec-clarify, 2026-11-07).

#### Scenario: One poem added
- **GIVEN** a poems page with the free poem «Осенний сад» unchecked
- **WHEN** the author checks «Осенний сад»
- **THEN** «Сохранить выбранное» is shown and enabled

#### Scenario: One poem removed
- **GIVEN** a poems page with the collection's poem «Ночной вокзал» checked
- **WHEN** the author unchecks it
- **THEN** «Сохранить выбранное» is shown

#### Scenario: Back to the stored selection
- **GIVEN** the author checked «Осенний сад»
- **WHEN** they uncheck it again
- **THEN** no «Сохранить выбранное» button exists

### Requirement: Saving the collection's poems (add-poems-to-collections FR-6)
The browser SHALL send the collection id, the poems newly checked, and the poems newly unchecked; the server SHALL take the author from the session, and the database SHALL store the whole change at once or nothing. While sending, the button SHALL read «Сохранение…», every checkbox and the button SHALL be disabled, and a double click SHALL save once. On success the author SHALL stay on the page: the list SHALL show the stored selection; «Сохранить выбранное» SHALL stay visible and be disabled; «Произведения сборника сохранены.» SHALL be shown in a `role="status"` element above the list, and the link «Вернуться к сборнику» (to the collection page) SHALL be shown below the button. The next checkbox change SHALL hide the notice and the link and enable the button; if the selection returns to the stored one, the disabled button and the link SHALL show again, without the notice.

#### Scenario: Saved
- **GIVEN** «Осенний цикл» holds «Ночной вокзал», and «Осенний сад» is free
- **WHEN** the author checks «Осенний сад», unchecks «Ночной вокзал», and presses «Сохранить выбранное»
- **THEN** they stay on the page, «Произведения сборника сохранены.» and «Вернуться к сборнику» are shown, «Сохранить выбранное» is disabled, «Осенний сад» is checked and «Ночной вокзал» unchecked
- **AND** «Осенний цикл»'s page lists only «Осенний сад»

#### Scenario: Sending
- **GIVEN** a changed selection
- **WHEN** the author double-clicks «Сохранить выбранное»
- **THEN** the button reads «Сохранение…», every checkbox is disabled, and exactly one save is stored

#### Scenario: Change after a save
- **GIVEN** the author just saved
- **WHEN** they check another box
- **THEN** the notice and «Вернуться к сборнику» are gone and «Сохранить выбранное» is enabled

### Requirement: Collection poems save limit (add-poems-to-collections FR-7)
An author SHALL be able to make at most 10 save attempts per minute on collection poems pages, counted per signed-in account after the session check and before the save. Over the limit, nothing SHALL be changed and the alert SHALL read «Слишком много сохранений. Попробуйте через минуту.», the selection kept.

#### Scenario: Eleventh save in a minute
- **GIVEN** an author who made 10 collection poems save attempts in the last minute
- **WHEN** they press «Сохранить выбранное»
- **THEN** nothing is changed and «Слишком много сохранений. Попробуйте через минуту.» is shown above the list

### Requirement: Collection poems save failures (add-poems-to-collections FR-8)
A failure that keeps the author on the page SHALL show its message in a `role="alert"` element above the list, keep the selection, move focus to the alert, and leave «Сохранить выбранное» enabled; nothing SHALL retry on its own. The messages SHALL be «Сохранение сейчас недоступно. Попробуйте позже.», «Что-то пошло не так. Попробуйте ещё раз.», and «Чтобы сохранять изменения, укажите имя и фамилию в профиле автора.» when the own profile stopped being public. When a newly checked poem is no longer free, or a newly unchecked poem is no longer in this collection (changed in another tab), or either no longer exists, nothing SHALL be saved, the list SHALL reload with the stored poems and the stored selection, and the alert SHALL read «Часть произведений уже недоступна: список обновлён. Отметьте произведения заново.»; when the reloaded list is empty, the alert SHALL stay above «Нет свободных произведений для добавления в сборник.» and «Вернуться к сборнику» (spec-clarify, 2026-11-07). When the collection no longer exists, nothing SHALL be saved and the author SHALL be taken to `/account/poems`, which shows «Сборник уже удалён.» once. When the session can't be refreshed, nothing SHALL be saved and the author SHALL be taken to `/login` with «Сессия истекла. Войдите снова.» once.

#### Scenario: Service unavailable
- **GIVEN** a changed selection and an unreachable database
- **WHEN** the author presses «Сохранить выбранное»
- **THEN** «Сохранение сейчас недоступно. Попробуйте позже.» is shown above the list, focused, and the selection stays

#### Scenario: Poem taken by another collection meanwhile
- **GIVEN** the author checked the free poem «Осенний сад», and in another tab added «Осенний сад» to «Весна»
- **WHEN** they press «Сохранить выбранное»
- **THEN** nothing is saved, «Часть произведений уже недоступна: список обновлён. Отметьте произведения заново.» is shown, and the list no longer holds «Осенний сад» and shows the stored selection
- **AND** no other checked poem was added

#### Scenario: Stale save leaves nothing to manage
- **GIVEN** an empty collection, the author checked its only free poem, and in another tab added that poem to another collection
- **WHEN** they press «Сохранить выбранное»
- **THEN** «Часть произведений уже недоступна: список обновлён. Отметьте произведения заново.» is shown above «Нет свободных произведений для добавления в сборник.» and «Вернуться к сборнику», and no checkbox exists

#### Scenario: Collection deleted meanwhile
- **GIVEN** a changed selection whose collection was deleted in another tab
- **WHEN** the author presses «Сохранить выбранное»
- **THEN** they are on `/account/poems` and «Сборник уже удалён.» is shown once

#### Scenario: Profile no longer public
- **GIVEN** a changed selection and the author cleared their last name in another tab
- **WHEN** they press «Сохранить выбранное»
- **THEN** nothing is saved, the alert reads «Чтобы сохранять изменения, укажите имя и фамилию в профиле автора.», and the selection stays

#### Scenario: Session expired
- **GIVEN** a changed selection and a session that can't be refreshed
- **WHEN** the author presses «Сохранить выбранное»
- **THEN** nothing is saved and they land on `/login` with «Сессия истекла. Войдите снова.»

### Requirement: Leaving the collection poems page with unsaved changes (add-poems-to-collections FR-10)
While the selection is changed, and while a save is sending, a click on any link to a page other than this one SHALL NOT navigate; it SHALL open the dialog «Есть несохранённые изменения» with the text «Сохранить выбранные произведения перед уходом?» and the buttons «Сохранить изменения» (focused on open), «Уйти без сохранения», and «Остаться», plus the dialog's close button (user decision, 2026-11-07). «Сохранить изменения» SHALL save as «Сохранить выбранное» does, reading «Сохранение…» with the dialog's buttons disabled while sending; on `saved` the author SHALL be taken to the clicked link's page; on any other outcome the dialog SHALL close and the outcome SHALL be handled as on the page (add-poems-to-collections FR-8). «Уйти без сохранения» SHALL follow the link and drop the selection. «Остаться», the close button, and Escape SHALL close the dialog with nothing sent, focus back on the clicked link. When the dialog opens while a save is already sending, it SHALL wait for that save instead of offering a choice: «Сохранить изменения» reads «Сохранение…», all its buttons and its close button are disabled, and Escape does nothing; on `saved` the author SHALL be taken to the clicked link's page (or, in the sign-out form, signed out), and on any other outcome the dialog SHALL close and the outcome SHALL be handled as on the page. No second save SHALL be sent (spec-clarify, 2026-11-07). While the connection is offline or slow, «Сохранить изменения» SHALL be disabled and focus SHALL open on «Остаться». Pressing «Выйти» SHALL open the same dialog in its sign-out form (text «Сохранить выбранные произведения перед выходом?», «Выйти без сохранения» in place of «Уйти без сохранения»): saving successfully then signs out; «Выйти без сохранения» signs out; «Остаться» does neither. Closing the tab, reloading, or typing an address SHALL show the browser's own leave confirmation. Back/Forward SHALL NOT be blocked; going back to this page while Next keeps the hidden page SHALL show the unsaved selection, unless the collection was deleted meanwhile, which SHALL show the 404 page.

#### Scenario: Save, then leave
- **GIVEN** a changed selection
- **WHEN** the author clicks «Наши авторы» in the header and presses «Сохранить изменения» in the dialog
- **THEN** the selection is stored and they are on the «Наши авторы» page

#### Scenario: Leave without saving
- **GIVEN** a changed selection
- **WHEN** the author clicks the breadcrumb «Управление произведениями» and presses «Уйти без сохранения»
- **THEN** they are on `/account/poems` and nothing was stored

#### Scenario: Stay
- **GIVEN** a changed selection
- **WHEN** the author clicks a header link and presses «Остаться»
- **THEN** the dialog closes, the page stays, the selection is kept, and focus is on the clicked link

#### Scenario: Save from the dialog fails
- **GIVEN** a changed selection and an unreachable database
- **WHEN** the author clicks a header link and presses «Сохранить изменения»
- **THEN** the dialog closes, the page stays, «Сохранение сейчас недоступно. Попробуйте позже.» is shown above the list, and the selection is kept

#### Scenario: Link clicked while a save is sending
- **GIVEN** the author pressed «Сохранить выбранное» and the save is still sending
- **WHEN** they click a header link
- **THEN** the dialog opens with «Сохранение…» and every button disabled, exactly one save is stored, and once it succeeds they are on the link's page

#### Scenario: Offline dialog
- **GIVEN** a changed selection while the browser is offline
- **WHEN** the author clicks a header link
- **THEN** the dialog opens with «Сохранить изменения» disabled and focus on «Остаться»

#### Scenario: Unchanged selection
- **GIVEN** an unchanged selection, before or after a save
- **WHEN** the author clicks any header link
- **THEN** the page navigates with no dialog

### Requirement: Collection poems fresh after a save (add-poems-to-collections FR-12)
After a save, the author's next screen and every page they reach afterwards in that tab, by link or by Back/Forward, SHALL show the stored poems: the collection's list and whether «Произведения сборника» shows on the collection page, the poem lists in the section on `/account/poems`, and the list of checkboxes on the collection poems pages of this and every other collection. A collection poems page still holding an unsaved selection (add-poems-to-collections FR-10) SHALL show the fresh list with that selection kept on top of it: boxes the author changed keep their state, and a poem that is no longer free or in this collection has no checkbox (spec-clarify, 2026-11-07).

#### Scenario: Back after a save
- **GIVEN** an author who opened «Осенний цикл»'s page, pressed «Произведения сборника», added «Осенний сад», and saved
- **WHEN** they press Back
- **THEN** the collection page lists «Осенний сад»
- **AND** «Весна»'s poems page, opened next, does not list «Осенний сад»

#### Scenario: Unsaved selection kept over a fresh list
- **GIVEN** on «Весна»'s poems page the author checked the free poems «Осенний сад» and «Первый снег» without saving, went Back, and then added «Осенний сад» to «Осенний цикл» and saved
- **WHEN** they go Forward to «Весна»'s poems page while Next still keeps it
- **THEN** «Первый снег» is still checked, «Осенний сад» is not listed, and «Сохранить выбранное» is shown

### Requirement: Collection membership integrity (add-poems-to-collections NFR-1)
No client role SHALL read which collection a poem belongs to from the poems table, or change it there; the author SHALL read it only through the database's own read operations, which return only the caller's own poems, and change it only through the database's own save operation, which takes the owner from the session and no author argument. The save SHALL require a public own profile and a collection of the caller's own; SHALL add only the caller's own free poems and remove only poems in that collection; SHALL apply the whole change or, when any poem fails those rules, nothing; and SHALL change no other column of any poem. Two concurrent saves SHALL NOT put one poem in two collections.

#### Scenario: Direct calls
- **GIVEN** pgTAP tests as `anon`, as another author, and as the owner
- **WHEN** they select `collection_id` from the poems table, update it directly, and call the read and save operations with own and others' collection and poem ids
- **THEN** every direct select of `collection_id` and every direct update fails; `anon` can call nothing; another author's ids answer `not-found` or `stale` and change nothing; and a save with one invalid poem among valid ones changes nothing

### Requirement: Accessible collection poems flow (add-poems-to-collections NFR-4)
The checkboxes SHALL be a `<fieldset>` whose `<legend>` «Произведения» names the group (it may be visually hidden), each checkbox with a visible label tied to it; the failure and manage-error alerts SHALL use `role="alert"`, the saved notice and the connection notice `role="status"`; the leave dialog SHALL be the shared `Dialog` with its title as its accessible name; every action SHALL be reachable and usable by keyboard alone.

#### Scenario: Keyboard only
- **GIVEN** a keyboard-only author
- **WHEN** they open the collection poems page from the collection page, toggle boxes with Space, save, and leave through the dialog
- **THEN** every step works with Tab, Enter, Space, and Escape, and focus lands where the requirements above say

### Requirement: No collection poems content in logs (add-poems-to-collections NFR-5)
Server log lines from the new reads, the check, and the save SHALL carry the operation and the failure kind only — never a title, a collection id, a poem id, or an author id.

#### Scenario: Failed save logged
- **GIVEN** a save that fails in the database
- **WHEN** the log line is written
- **THEN** it reads `[collection-management] <operation> failed: <error class or code>` and holds none of the values

### Requirement: Design tokens for collection poems (add-poems-to-collections NFR-6)
The new and changed components SHALL style with the project's design tokens and shared primitives only — no color literals or arbitrary values.

#### Scenario: Static check
- **GIVEN** the change is complete
- **WHEN** `src/features/collection-management/` is searched for hex, `rgb(`, and `hsl(` literals
- **THEN** there are no matches

### Requirement: Russian UI copy for collection poems (add-poems-to-collections NFR-7)
Every new user-facing string SHALL match the proposal's UI copy table verbatim and live in the feature's messages module (or the shared component that owns it).

#### Scenario: Copy check
- **GIVEN** the change is complete
- **WHEN** the messages module is compared with the proposal's table
- **THEN** every entry matches character for character
