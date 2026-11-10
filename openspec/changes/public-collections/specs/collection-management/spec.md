## MODIFIED Requirements

### Requirement: One collection per poem (add-poems-to-collections FR-1)
A poem SHALL belong to at most one collection, and only to a collection of its own author. A poem in no collection is *free*. A newly created poem SHALL be free, and every poem stored before this change SHALL start free. Deleting a collection SHALL make its poems free, and deleting a poem SHALL take it out of its collection; neither SHALL change any other poem or collection. Which collection a poem belongs to SHALL be public for a public author, shown on the public author page and the public collection page (public-collections FR-1, user decision 2026-11-10); only its author SHALL change it, on the account pages.

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

#### Scenario: Public pages show membership
- **GIVEN** «Ночной вокзал» of a public author is in the collection «Осенний цикл»
- **WHEN** a guest opens the author's public page
- **THEN** «Ночной вокзал» is listed under «Осенний цикл» in the «Сборники произведений» section and not in the «Произведения» list

#### Scenario: Public pages unchanged
- **GIVEN** «Ночной вокзал» is in a collection
- **WHEN** a guest opens the poem's public page
- **THEN** it shows what it showed before the poem joined the collection, with nothing about collections (user decision, 2026-11-10)

### Requirement: Collection database integrity (NFR-1)
A collection of a public author that holds at least one poem SHALL be readable by everyone, `anon` included, in its id, author, title, description, and creation time (public-collections NFR-1). Any other collection — empty, or of a profile that isn't public — SHALL be readable only by its author. No client role SHALL insert, update, or delete a row directly; the only writes SHALL be the three `security definer` functions, each resolving the owner from the session and taking no author argument. Updates SHALL change only the title and the description; create and update SHALL require a public own profile; delete SHALL not. The table's checks SHALL reject a blank or over-long title, an over-long description, and an empty-string description.

#### Scenario: Direct calls
- **GIVEN** pgTAP tests as `anon`, as another author, and as the owner
- **WHEN** they select, insert, update, and delete collections directly and call the three functions
- **THEN** `anon` and another author see only the owner's non-empty collections while the owner's profile is public, and the owner also sees their empty ones; direct writes fail for every role; another author gets `not-found` from update and delete; and only the owner's function calls change the owner's rows

#### Scenario: Hidden collections
- **GIVEN** an owner with the empty collection «Весна», the collection «Осенний цикл» whose only poem was then deleted, and, as a second case, the same owner with a non-public profile and a non-empty collection
- **WHEN** `anon` and another author select collections directly
- **THEN** none of these collections is returned, and the owner still reads each of them

### Requirement: Collection membership integrity (add-poems-to-collections NFR-1)
Which collection a poem belongs to SHALL be readable from the poems table by every role that can read the poem (public-collections NFR-1); no client role SHALL change it there. The author SHALL change it only through the database's own save operation, which takes the owner from the session and no author argument. The save SHALL require a public own profile and a collection of the caller's own; SHALL add only the caller's own free poems and remove only poems in that collection; SHALL apply the whole change or, when any poem fails those rules, nothing; and SHALL change no other column of any poem. Two concurrent saves SHALL NOT put one poem in two collections. The database's own membership read operations for the author SHALL keep returning only the caller's own poems.

#### Scenario: Direct calls
- **GIVEN** pgTAP tests as `anon`, as another author, and as the owner
- **WHEN** they select `collection_id` from the poems table, update it directly, and call the read and save operations with own and others' collection and poem ids
- **THEN** every role reads `collection_id` of a public author's poems; every direct update fails; `anon` can call no read or save operation; another author's ids answer `not-found` or `stale` and change nothing; and a save with one invalid poem among valid ones changes nothing

#### Scenario: Malformed save input (added by defect fix)
- **GIVEN** a signed-in author calling the save operation directly
- **WHEN** either list is missing, holds an empty element, a duplicate, or a nested list, both are empty, one poem is in both, or a list has more than 1000 poems
- **THEN** the call is rejected as invalid input (22023), the same way for every one of these, and nothing changes

### Requirement: Collections fresh after every write (FR-15)
After a create, a save, or a delete, the author's next screen and every page they reach afterwards in that tab, by link or by Back/Forward, SHALL show the current collections: the list on `/account/poems`, whether its section is shown, each collection's title and description, and, after a delete, the deleted collection's poems in the plain poem list on `/account/poems` (show-only-free-poems FR-3). After an edit, a delete, and a collection poems save that stored a change, the next request for the author's public page and for any of their public collection pages SHALL show the result, with no wait for a cache lifetime (public-collections FR-7).

#### Scenario: Back after a delete
- **GIVEN** an author who opened «Осенний цикл», holding «Ночной вокзал», from `/account/poems` and deleted it, so the delete replaced the collection page in the history with `/account/poems`
- **WHEN** they press Back, then Forward
- **THEN** every page reached is `/account/poems` or an earlier page, none of them lists «Осенний цикл», and the collection page is never reached through history
- **AND** every `/account/poems` reached lists «Ночной вокзал» in the plain poem list
- **AND** opening the collection's old address directly shows the 404 page

#### Scenario: Public page after a delete
- **GIVEN** a cached public author page listing «Осенний цикл» with «Ночной вокзал» under it
- **WHEN** the author deletes «Осенний цикл» and a guest then opens `/authors/<id>` and the collection's public address
- **THEN** «Осенний цикл» is not listed, «Ночной вокзал» is in the «Произведения» list, and the collection's public address renders the 404 page

#### Scenario: Public page after an edit
- **GIVEN** a cached public collection page of «Осенний цикл»
- **WHEN** the author renames it «Осень» and a guest then opens that page
- **THEN** the heading reads «Осень»

### Requirement: Collection module boundaries (NFR-3)
Collections SHALL live in their own feature, imported only through its public API by `breadcrumbs` and the route files; `poem-management` and `collection-management` SHALL NOT import each other, and `/account/poems`'s route file SHALL compose them through slot props and one read function: the feature's per-request read of which own poems are in a collection, which the route passes to the poem list so it can leave those poems out (show-only-free-poems NFR-1). The section and the poem list SHALL use that one read, memoized per request, so they always agree (show-only-free-poems NFR-2). The feature SHALL import `auth` and `authors` only through their public APIs and nothing from `poems`, `poem-management`, or the public `collections` feature (public-collections NFR-3); the one cache tag of an author's public works SHALL come from `shared/config`. It SHALL repeat the poem flows' logic in its own files — its form hook, leave guard, leave dialog, write-log helpers, the tag expiry, and the owner's poem page path — and SHALL reuse from `shared/` only domain-free code that is already there (the connection status and its notice, the leave-block store and its answers, the one-time notice hook, the session-expired store, the Supabase clients and error classifier, the UI primitives) plus the `TextAreaField` primitive (user decision, 2026-11-04) and the per-author cache tag (public-collections NFR-3). Its leave guard SHALL exist once, in the feature's `hooks/`, used by both the edit form and the collection poems form (add-poems-to-collections NFR-3).

#### Scenario: Static check
- **GIVEN** the change is complete
- **WHEN** `src/features/collection-management/` is searched for `@/features/poems`, `@/features/poem-management`, `@/features/collections`, and `navigator.onLine`, and `src/features/poem-management/` for `@/features/collection-management`
- **THEN** there are no matches
- **AND** `beforeunload` appears in `collection-management` only in `hooks/use-leave-guard.ts`

#### Scenario: One membership read per request
- **GIVEN** a signed-in author with collections and poems
- **WHEN** they open `/account/poems`
- **THEN** `my_collected_poems` is called once for the request, and the section and the poem list are built from that one result
