## MODIFIED Requirements

### Requirement: Your poems page (FR-2)
`/account/poems` SHALL show the level-1 heading «Ваши Произведения»; below it, one row with the link «Добавить новое произведение» to `/account/poems/new` and the link styled as a button «Создать сборник произведений» to `/account/poems/collections/new`, in that order (add-poem-collections FR-1); then, when the author has collections, the section «Сборники произведений» (add-poem-collections FR-2); then, when the author has poems, a list of all of them, newest first, each item only the title as a link to `/account/poems/<poemId>`. With no poems, it SHALL show no poem list. The section SHALL be a level-2 heading «Сборники произведений» and a list of all the author's own collections, newest first, each item the title as a link to `/account/poems/collections/<collectionId>` followed, when the collection holds poems, by a nested list of its poems, newest first by the poem's creation time, each item only the title as a link to `/account/poems/<poemId>`; a collection with no poems SHALL show its title only (add-poems-to-collections FR-11, user decision 2026-11-07). The poem list below the section SHALL still list every poem of the author, whether in a collection or not; with no collections, neither the heading nor the list SHALL be rendered. A failed read of the collections or of their poems SHALL show «Не удалось загрузить сборники. Попробуйте позже.» in a `role="alert"` element in the section's place, with no heading, and SHALL NOT affect the buttons or the poem list; a failed poem read SHALL NOT affect the buttons or the section (poem-management FR-11, add-poem-creation).

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
- **GIVEN** a signed-in author with the collections «Весна» (created 2026-11-02) and «Осенний цикл» (created 2026-11-01) and one poem
- **WHEN** they open `/account/poems`
- **THEN** below the button row the section «Сборники произведений» lists «Весна», «Осенний цикл» in that order, each linking to `/account/poems/collections/<its id>`, and the poem list follows the section

#### Scenario: Collections read fails
- **GIVEN** the collections can't be read and the poems can
- **WHEN** the author opens `/account/poems`
- **THEN** both links, «Не удалось загрузить сборники. Попробуйте позже.» in a `role="alert"` element, and the poem list are shown

#### Scenario: Only own poems
- **GIVEN** two authors with public profiles, each with poems and collections
- **WHEN** one of them opens `/account/poems`
- **THEN** only their own poems and collections are listed

#### Scenario: Collections with their poems
- **GIVEN** a signed-in author whose collection «Осенний цикл» holds «Ночной вокзал» (created 2026-10-02) and «Осенний сад» (created 2026-10-01), whose collection «Весна» holds no poems, and who has the free poem «Первый снег»
- **WHEN** they open `/account/poems`
- **THEN** under «Осенний цикл» the links «Ночной вокзал», «Осенний сад», in that order, each to `/account/poems/<its id>`, are listed, and «Весна» shows its title only
- **AND** the poem list below the section lists all three poems

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
