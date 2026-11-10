## MODIFIED Requirements

### Requirement: Deleting a collection (FR-13)
«Удалить сборник» SHALL open a dialog titled «Удалить сборник?» with «Сборник «<title>» будет удалён без возможности восстановления.», «Отмена» (focused on open) and the danger button «Удалить». Closing the dialog in any way SHALL delete nothing and return focus to «Удалить сборник». The browser SHALL send only the collection id; the server SHALL take the author from the session, and the database SHALL delete only a collection belonging to the caller's own profile. While deleting, «Удалить» SHALL read «Удаление…», both buttons SHALL be disabled, the dialog SHALL not close, and a double click SHALL delete once. On success the author SHALL be taken to `/account/poems` (replacing the collection page in the history), which SHALL show «Сборник «<title>» удалён.» once, list the remaining collections, and list the deleted collection's poems, now free, in the plain poem list below the section (show-only-free-poems FR-3, user decision 2026-11-10); with none left, the section «Сборники произведений» SHALL not be rendered. When the collection no longer exists, the author SHALL be taken to `/account/poems` with «Сборник уже удалён.» once. A failure SHALL show «Не удалось удалить сборник. Попробуйте позже.» in a `role="alert"` element in the open dialog and change nothing. When the session can't be refreshed, nothing SHALL be deleted and the author SHALL be taken to `/login` with «Сессия истекла. Войдите снова.» once.

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

#### Scenario: Deleted collection's poems move into the plain list
- **GIVEN** an author whose collection «Осенний цикл» holds «Ночной вокзал» (created 2026-10-02), whose collection «Весна» holds «Осенний сад», and who has the free poem «Первый снег» (created 2026-10-03)
- **WHEN** they delete «Осенний цикл»
- **THEN** they are on `/account/poems`, the section lists only «Весна» with «Осенний сад» under it, and the plain poem list is «Первый снег», «Ночной вокзал», in that order
- **AND** «Осенний сад» is not in the plain poem list

#### Scenario: Already deleted
- **GIVEN** the collection was deleted in another tab
- **WHEN** the author confirms the delete
- **THEN** they are on `/account/poems` and «Сборник уже удалён.» is shown once

#### Scenario: Failure
- **GIVEN** an unreachable database
- **WHEN** the author confirms the delete
- **THEN** «Не удалось удалить сборник. Попробуйте позже.» is shown in the open dialog and the collection still exists

### Requirement: Collections fresh after every write (FR-15)
After a create, a save, or a delete, the author's next screen and every page they reach afterwards in that tab, by link or by Back/Forward, SHALL show the current collections: the list on `/account/poems`, whether its section is shown, each collection's title and description, and, after a delete, the deleted collection's poems in the plain poem list on `/account/poems` (show-only-free-poems FR-3).

#### Scenario: Back after a delete
- **GIVEN** an author who opened «Осенний цикл», holding «Ночной вокзал», from `/account/poems` and deleted it, so the delete replaced the collection page in the history with `/account/poems`
- **WHEN** they press Back, then Forward
- **THEN** every page reached is `/account/poems` or an earlier page, none of them lists «Осенний цикл», and the collection page is never reached through history
- **AND** every `/account/poems` reached lists «Ночной вокзал» in the plain poem list
- **AND** opening the collection's old address directly shows the 404 page

### Requirement: Collection poems fresh after a save (add-poems-to-collections FR-12)
After a save, the author's next screen and every page they reach afterwards in that tab, by link or by Back/Forward, SHALL show the stored poems: the collection's list and whether «Произведения сборника» shows on the collection page, the poem lists in the section on `/account/poems` and its plain list of free poems — a poem taken out of the collection listed there, a poem added to it no longer listed (show-only-free-poems FR-4) — and the list of checkboxes on the collection poems pages of this and every other collection. A collection poems page still holding an unsaved selection (add-poems-to-collections FR-10) SHALL show the fresh list with that selection kept on top of it: boxes the author changed keep their state, and a poem that is no longer free or in this collection has no checkbox (spec-clarify, 2026-11-07).

#### Scenario: Back after a save
- **GIVEN** an author who opened «Осенний цикл»'s page, pressed «Произведения сборника», added «Осенний сад», and saved
- **WHEN** they press Back
- **THEN** the collection page lists «Осенний сад»
- **AND** «Весна»'s poems page, opened next, does not list «Осенний сад»

#### Scenario: Plain list on `/account/poems` after a save
- **GIVEN** an author whose collection «Осенний цикл» holds «Ночной вокзал» and who has the free poem «Осенний сад», with `/account/poems` loaded earlier in the tab
- **WHEN** on «Осенний цикл»'s poems page they check «Осенний сад», uncheck «Ночной вокзал», save, and then open `/account/poems` by link and again by Back
- **THEN** each time the plain poem list lists «Ночной вокзал» and not «Осенний сад», and the section lists «Осенний сад» under «Осенний цикл»

#### Scenario: Unsaved selection kept over a fresh list
- **GIVEN** on «Весна»'s poems page the author checked the free poems «Осенний сад» and «Первый снег» without saving, went Back, and then added «Осенний сад» to «Осенний цикл» and saved
- **WHEN** they go Forward to «Весна»'s poems page while Next still keeps it
- **THEN** «Первый снег» is still checked, «Осенний сад» is not listed, and «Сохранить выбранное» is shown


### Requirement: Collection module boundaries (NFR-3)
Collections SHALL live in their own feature, imported only through its public API by `breadcrumbs` and the route files; `poem-management` and `collection-management` SHALL NOT import each other, and `/account/poems`'s route file SHALL compose them through slot props and one read function: the feature's per-request read of which own poems are in a collection, which the route passes to the poem list so it can leave those poems out (show-only-free-poems NFR-1). The section and the poem list SHALL use that one read, memoized per request, so they always agree (show-only-free-poems NFR-2). The feature SHALL import `auth` and `authors` only through their public APIs and nothing from `poems` or `poem-management`. It SHALL repeat the poem flows' logic in its own files — its form hook, leave guard, leave dialog, write-log helpers, and the owner's poem page path — and SHALL reuse from `shared/` only domain-free code that is already there (the connection status and its notice, the leave-block store and its answers, the one-time notice hook, the session-expired store, the Supabase clients and error classifier, the UI primitives) plus the `TextAreaField` primitive (user decision, 2026-11-04). Its leave guard SHALL exist once, in the feature's `hooks/`, used by both the edit form and the collection poems form (add-poems-to-collections NFR-3).

#### Scenario: Static check
- **GIVEN** the change is complete
- **WHEN** `src/features/collection-management/` is searched for `@/features/poems`, `@/features/poem-management`, and `navigator.onLine`, and `src/features/poem-management/` for `@/features/collection-management`
- **THEN** there are no matches
- **AND** `beforeunload` appears in `collection-management` only in `hooks/use-leave-guard.ts`

#### Scenario: One membership read per request
- **GIVEN** a signed-in author with collections and poems
- **WHEN** they open `/account/poems`
- **THEN** `my_collected_poems` is called once for the request, and the section and the poem list are built from that one result

