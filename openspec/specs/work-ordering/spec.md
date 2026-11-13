# work-ordering Specification

## Purpose
TBD - created by archiving change drag-and-drop-ordering. Update Purpose after archive.
## Requirements
### Requirement: A stored order for collections and poems (FR-1)
An author's collections SHALL have one order, the poems of each collection SHALL have one order each, and the author's free poems (poems in no collection) SHALL have one order. The order SHALL be stored, belong to the author, and be the same wherever the list is shown. Every collection and every poem stored before this change SHALL start in the place newest created first gave it, so shipping the change moves nothing. A newly created poem SHALL be the first of the free poems and a newly created collection SHALL be the first of the author's collections. Deleting a poem or a collection SHALL leave every other item in the order it had.

#### Scenario: Existing works keep their order
- **GIVEN** an author with the collections «Весна» (created 2026-10-05) and «Осенний цикл» (created 2026-10-01), and the free poems «Первый снег» (created 2026-11-01) and «Ночной вокзал» (created 2026-10-02), stored before this change
- **WHEN** the change is applied and the author opens `/account/poems`
- **THEN** the collections are «Весна», «Осенний цикл» and the free poems «Первый снег», «Ночной вокзал»

#### Scenario: New poem and new collection go first
- **GIVEN** an author whose free poems are ordered «Осенний сад», «Ночной вокзал» and whose collections are ordered «Осенний цикл», «Весна»
- **WHEN** they create the poem «Первый снег» and the collection «Зима»
- **THEN** the free poems are «Первый снег», «Осенний сад», «Ночной вокзал» and the collections are «Зима», «Осенний цикл», «Весна»

#### Scenario: A delete keeps the rest in order
- **GIVEN** a collection with «А», «Б», «В» in that order
- **WHEN** the author deletes «Б»
- **THEN** the collection lists «А», «В»

#### Scenario: Deleting a collection frees its poems first, in their order
- **GIVEN** the free poems «Х», «Ю» and the collection «Осень» with «А», «Б» in that order
- **WHEN** the author deletes «Осень»
- **THEN** the free poems are «А», «Б», «Х», «Ю»

### Requirement: Reorder poems inside a collection (FR-2)
On `/account/poems`, an author SHALL be able to drag a poem listed under a collection to another place among the poems of the same collection. When the drop ends, the poem SHALL stand at the place where it was dropped, every other poem of that collection SHALL keep its relative order, and the order SHALL be stored (FR-6).

#### Scenario: Move a poem up inside a collection
- **GIVEN** the collection «Осенний цикл» with «А», «Б», «В» in that order
- **WHEN** the author drags «В» above «А» and drops it
- **THEN** the collection lists «В», «А», «Б»
- **AND** after a reload of `/account/poems` and of `/authors/<id>` the order is still «В», «А», «Б»

#### Scenario: Dropped on its own place
- **GIVEN** the collection above
- **WHEN** the author drags «Б» and drops it where it already was
- **THEN** the order is unchanged and nothing is stored

### Requirement: Move a poem from one collection to another (FR-3)
An author SHALL be able to drag a poem listed under one collection and drop it among the poems of another of their collections, or onto the empty area of an empty collection. When the drop ends, the poem SHALL belong to the target collection only (never to both, never to none), stand at the place where it was dropped, and every other poem of both collections SHALL keep its relative order. Both lists SHALL be stored by one write, all or nothing (NFR-1).

#### Scenario: Move into the middle of another collection
- **GIVEN** the collections «Осень» with «А», «Б» and «Зима» with «В», «Г»
- **WHEN** the author drags «А» between «В» and «Г» and drops it
- **THEN** «Осень» lists «Б» and «Зима» lists «В», «А», «Г»

#### Scenario: Move into an empty collection
- **GIVEN** the empty collection «Весна» and the collection «Осень» with «А»
- **WHEN** the author drags «А» onto «Весна»'s empty area and drops it
- **THEN** «Весна» lists «А» and «Осень» holds no poem
- **AND** a guest opening `/authors/<id>` now sees «Весна» and no longer sees «Осень» (public-collections FR-1)

#### Scenario: The last poem leaves a collection
- **GIVEN** «Осень» holding only «А»
- **WHEN** the author drags «А» into «Зима»
- **THEN** «Осень» stays on the author's own page as an empty collection showing its title only

### Requirement: Move a poem between the free poems and a collection (FR-4)
An author SHALL be able to drag a free poem into a collection, at the place where it is dropped, and to drag a poem out of a collection into the free poems, at the place where it is dropped; and to drag a free poem to another place among the free poems. The free poems' drop area SHALL be available while a poem is being dragged even when the author has no free poem, and SHALL NOT be shown while a collection is being dragged (a collection never lands among the poems). The same rules as in FR-3 apply: one membership, other items keep their relative order, one all-or-nothing write.

#### Scenario: Free poem into a collection
- **GIVEN** the free poem «Первый снег» and the collection «Осень» with «А», «Б»
- **WHEN** the author drags «Первый снег» between «А» and «Б»
- **THEN** «Осень» lists «А», «Первый снег», «Б» and «Первый снег» is no longer among the free poems

#### Scenario: Poem out of a collection
- **GIVEN** the collection «Осень» with «А», «Б» and the free poems «В», «Г»
- **WHEN** the author drags «А» between «В» and «Г»
- **THEN** the free poems are «В», «А», «Г» and «Осень» lists «Б»

#### Scenario: Out of a collection when no free poem exists
- **GIVEN** every poem of the author is in a collection
- **WHEN** the author starts dragging one of them
- **THEN** an empty free-poems drop area with the text «Перетащите сюда произведение, чтобы оно не входило ни в один сборник.» appears, and dropping the poem on it makes the poem free

#### Scenario: Reorder the free poems
- **GIVEN** the free poems «А», «Б», «В»
- **WHEN** the author drags «В» above «А»
- **THEN** the free poems are «В», «А», «Б»

### Requirement: Reorder collections (FR-5)
On `/account/poems`, an author SHALL be able to drag a collection to another place among their collections. The collection SHALL keep its poems in their order, every other collection SHALL keep its relative order, and the order SHALL be stored (FR-6). A collection SHALL NOT be droppable into another collection or among poems. While a collection is being dragged, its poems SHALL travel with it.

#### Scenario: Move a collection to the top
- **GIVEN** the collections «Осень», «Зима», «Весна» in that order, «Весна» holding «А», «Б»
- **WHEN** the author drags «Весна» above «Осень» and drops it
- **THEN** the collections are «Весна», «Осень», «Зима» and «Весна» still lists «А», «Б»
- **AND** a guest opening `/authors/<id>` sees the visible collections in that order (public-collections FR-2)

#### Scenario: A collection cannot nest
- **GIVEN** the collections «Осень» and «Зима»
- **WHEN** the author drags «Зима» over the poems of «Осень» and drops it there
- **THEN** «Зима» is not inside «Осень»; it stands at the place among the collections that the board showed (the in-drag arrangement, design D4) at the moment it was released, even when it was released over the poems of another collection, and returns to its old place only when the board showed no place (for example, when released outside the board); no distance threshold of our own is added

### Requirement: Every drop is saved at once (FR-6)
When a drop ends and changes the order or a membership, the browser SHALL send the moved item, its target (a collection or the free poems), and the target place; the server SHALL take the author from the session and the database SHALL store the move for the caller's own items only (NFR-1). The item SHALL stay at the dropped place while the move is sending, and no other drag SHALL start for the moved item until it answers. On success, nothing more SHALL be shown (no «Сохранено» message, no button, no unsaved-changes dialog). On a refusal or a failure, the item SHALL return to the place where it was before the drag, and a message SHALL be shown in a `role="alert"` element above the board: «Не удалось сохранить порядок. Попробуйте ещё раз.», or, over the limit (NFR-2), «Слишком много перестановок за минуту. Подождите немного и повторите.»; focus SHALL move to the alert; the alert SHALL stay until the next drag starts and SHALL then disappear (a later failure shows its own alert); nothing SHALL retry on its own. While a move is sending, every handle SHALL be disabled with the native `disabled` attribute (so focus leaves it) and the board SHALL be marked `aria-busy`; after a refusal or a failure focus SHALL stay on the alert and SHALL NOT be moved back to the handle. While the browser reports no connection or its own estimate reports a slow one, the board SHALL show the existing offline or slow connection notice above it and every handle SHALL be disabled (approved mockup, artboard 40 state 10); they become active again only when the connection is both online and not reported slow. A drag already in progress when the connection drops SHALL NOT be cancelled: it can be dropped, and a drop that cannot reach the server is shown as any other failure (the item returns, the alert of this requirement). A signed-out session SHALL send the author to `/login` with the existing session-expired message. A drop that changes nothing SHALL send nothing. A call that fails before the server answers (the connection drops) SHALL be shown in the same alert as any other failure, never as the page's error screen.

#### Scenario: A successful drop
- **GIVEN** the collection «Осень» with «А», «Б»
- **WHEN** the author drops «Б» above «А»
- **THEN** «Б», «А» is shown immediately, no message appears, and a reload shows «Б», «А»

#### Scenario: The server refuses
- **GIVEN** the database can't be reached
- **WHEN** the author drops «Б» above «А»
- **THEN** «А», «Б» is shown again, an alert «Не удалось сохранить порядок. Попробуйте ещё раз.» appears above the board and has focus

#### Scenario: Over the limit
- **GIVEN** the author already made 30 moves in the last minute
- **WHEN** they drop one more
- **THEN** nothing is stored, the item returns, and the alert «Слишком много перестановок за минуту. Подождите немного и повторите.» appears

#### Scenario: The connection drops during the move
- **GIVEN** the browser loses the connection after the drop
- **WHEN** the call fails without an answer
- **THEN** the item returns and the alert «Не удалось сохранить порядок. Попробуйте ещё раз.» appears; the page's error screen does not

#### Scenario: Session expired
- **GIVEN** the author's session has ended
- **WHEN** they drop an item
- **THEN** they are taken to `/login` with the session-expired message and nothing is stored

#### Scenario: Offline
- **GIVEN** the browser reports no connection
- **WHEN** the author opens `/account/poems`
- **THEN** the existing offline notice is shown above the board and no handle can start a drag

### Requirement: Keyboard, touch, and screen reader operation (FR-7)
Every move of FR-2 to FR-5 SHALL be possible with the keyboard alone and by touch, not only with a mouse. Each collection and each poem on the board SHALL have a drag handle that is a button; the handle's accessible name SHALL be «Переместить сборник «<title>»» or «Переместить произведение «<title>»». With the keyboard, Space on a focused handle SHALL pick the item up, the arrow keys SHALL move it between places (including into and out of collections for a poem). The mapping is ours, not a library's (user decision, 2026-11-11, after the group 5 spike showed that `@hello-pangea/dnd` reaches no neighbouring list from stacked lists): ArrowUp and ArrowDown SHALL step a poem to the previous or next place on the board in reading order — the places are the slots of each collection's poem list (an empty collection has one slot) followed by the slots of the free poems (an empty free list has one slot too, so a poem can be taken out of a collection to the free poems when none exist) — crossing from one list into the next at its end, and SHALL step a collection to the previous or next place among the collections; ArrowLeft and ArrowRight SHALL do nothing, and so SHALL ArrowUp at the first place and ArrowDown at the last place of the board (the item stays, nothing is announced, nothing wraps around). Space is the only key that picks up and drops (Enter SHALL do neither; the keyboard sensor's codes are set to say so). Space SHALL drop it, and Escape SHALL cancel and return it to its old place. The instructions «Нажмите пробел, чтобы взять. Стрелками выберите место. Пробел — положить, Escape — отменить.» SHALL be available to a screen reader when a handle is focused. Each pick-up, move, drop, and cancel SHALL be announced in a polite live region, for a drag by mouse, by touch, and by keyboard alike (a move is announced on every change of place); the «помещено в …» phrases SHALL be used only when a poem's list changes compared with the previous step (the pick-up is the first step, so the list it was taken from is the starting one; a further move inside the new list, and the drop itself, are not a change), and a move or drop inside the same list, and every collection move (the position among the collections), SHALL use the «— позиция <n> из <total>» phrase: «Взято: «<title>».», ««<title>» — позиция <n> из <total>.», ««<title>» помещено в сборник «<collection>», позиция <n> из <total>.», ««<title>» помещено в свободные, позиция <n> из <total>.», ««<title>» возвращено на прежнее место.». After a drop that is stored and after a cancel, focus SHALL be on the moved item's handle; after a refused or failed move FR-6's alert keeps focus, and after a stale move FR-11's alert does (the moved item may no longer exist). A touch drag SHALL NOT start by a simple scroll of the page; it SHALL start from the handle.

#### Scenario: Move with the keyboard
- **GIVEN** the collection «Осень» with «А», «Б», «В» and focus on «В»'s handle
- **WHEN** the author presses Space, ArrowUp, ArrowUp, Space
- **THEN** the collection lists «В», «А», «Б», the live region has announced «Взято: «В».» and the new position, and focus is on «В»'s handle

#### Scenario: Cancel
- **GIVEN** «В» picked up with the keyboard and moved one place up
- **WHEN** the author presses Escape
- **THEN** «В» is back at its old place, nothing is stored, and ««В» возвращено на прежнее место.» is announced

#### Scenario: Keyboard move between collections
- **GIVEN** the collections «Осень» with «А» and «Зима» with «Б»
- **WHEN** the author picks up «А» with Space, presses ArrowDown until «А» is in «Зима», and drops it with Space
- **THEN** «Зима» lists «А» and «Б» in the place chosen, and «А» is no longer in «Осень»

#### Scenario: Keyboard move into an empty collection
- **GIVEN** the collection «Осень» with «А» and the empty collection «Пустой» below it
- **WHEN** the author picks up «А» with Space, presses ArrowDown until the announcement says «помещено в сборник «Пустой»», and drops it with Space
- **THEN** «Пустой» lists «А», «Осень» is empty, and focus is on «А»'s handle

#### Scenario: Scroll on touch
- **GIVEN** a touch screen
- **WHEN** the author scrolls the page by swiping on a poem's title
- **THEN** the page scrolls and no drag starts

### Requirement: Public pages show the author's order (FR-8)
The author page `/authors/<id>` (the collections section, each collection's poems, and the free poems of «Произведения») and the public collection page `/authors/<id>/collections/<collectionId>` SHALL list in the author's order (FR-1), with the same content for every visitor — signed out, signed in as another reader, or signed in as the owner — and no sign-in. After a move, the next server request for the author's public pages SHALL show it, with no wait for a cache lifetime: a successful move SHALL expire the author's public cache tag, as every other write of collections and poems does (public-collections FR-7). A refused or failed move SHALL expire nothing.

#### Scenario: A guest follows a move
- **GIVEN** a guest has opened `/authors/<id>` showing «Осень» before «Зима»
- **WHEN** the author drags «Зима» above «Осень» and the guest reloads
- **THEN** the guest sees «Зима» before «Осень»

#### Scenario: A refused move changes nothing public
- **GIVEN** a move that the server refuses
- **WHEN** a guest reloads `/authors/<id>`
- **THEN** the order is the old one and no cache tag was expired

### Requirement: Read the stored order everywhere a list is shown (FR-9)
Every read that lists an author's collections or poems for display — the public author page, the public collection page, `/account/poems`, the owner's collection page — SHALL order by the stored order of FR-1, with the item's id as the final tie-break. No page SHALL sort again in the browser.

#### Scenario: The owner and a guest see the same order
- **GIVEN** an author who reordered a collection's poems «В», «А», «Б»
- **WHEN** the author opens `/account/poems/collections/<id>` and a guest opens `/authors/<id>/collections/<id>`
- **THEN** both list «В», «А», «Б»

### Requirement: Other writes keep the order sensible (FR-10)
Saving the poems of a collection (add-poems-to-collections FR-4) SHALL make the poems newly added the first of that collection, in the order of the page's checklist (newest created first, then id), and the poems newly removed the first of the free poems, in the order they had in the collection, without moving any other item. Creating a poem or a collection SHALL put it first (FR-1). Moving a poem into a collection or out of one, and deleting a collection (which frees its poems, FR-1), SHALL be the only other changes of membership.

#### Scenario: Save the collection's poems
- **GIVEN** «Осень» with «Б», «В» and the free poems «А», «Г»
- **WHEN** the author adds «А», removes «В», and saves on «Произведения сборника»
- **THEN** «Осень» lists «А», «Б» and the free poems are «В», «Г»

### Requirement: A move made stale by another tab (FR-11)
When a move names an item that is not the caller's, no longer exists, no longer belongs where the browser last saw it (another tab moved it or deleted it), or is the item of an author whose profile is no longer public, the server SHALL store nothing and answer that the list changed. The server SHALL also refresh the author's pages. The board SHALL then show the stored lists, show the alert «Список изменился в другой вкладке. Мы обновили его — попробуйте ещё раз.» above the board with focus on it, and keep working. An id that is not the caller's and an unknown id SHALL answer alike. When two moves reach the server at once, both SHALL be applied one after the other; the last one SHALL decide the final order.

#### Scenario: The poem was deleted in another tab
- **GIVEN** the board shows «А» in «Осень» in tab 1, and «А» is deleted in tab 2
- **WHEN** the author drops «А» somewhere in tab 1
- **THEN** nothing is stored, the board shows the stored lists without «А», and the alert «Список изменился в другой вкладке. Мы обновили его — попробуйте ещё раз.» has focus

#### Scenario: Another author's poem
- **GIVEN** a request that names a poem of another author
- **WHEN** the move runs
- **THEN** nothing changes, and the answer is the same as for an unknown id

### Requirement: Database rule for order (NFR-1)
The order of collections and poems SHALL be readable by every role that can read the row (anon and authenticated for a public author's poems and non-empty collections, the owner for their own), and no client role SHALL hold an insert, update, or delete grant on it. Order and membership SHALL change only through these definer paths and no other: two move functions — one moving a poem to a collection or the free poems at a place, one moving a collection to a place — plus the existing `save_my_collection_poems` and `delete_my_collection` (FR-10) and the two `before insert` triggers (FR-1); the move functions take the owner from the session (`auth.uid()` and the caller's own profile) and never from an argument. Each SHALL change the source and the target lists in one transaction, queue behind every other writer of the same author's order (one per-author lock, taken first) and lock the collections it names in a fixed order (by id) before the poem, so two writes never deadlock, refuse another author's items and an unknown or malformed argument (a null or non-integer place), and clamp a place below the start to the start and a place beyond the end of a list to the end. Every insert of a poem or a collection that names no position SHALL get the first one of its list, so no writer has to remember to ask for it. A poem SHALL still belong to at most one collection, and only to its own author's.

#### Scenario: Direct writes are closed
- **GIVEN** a signed-in author
- **WHEN** they update the order column of their own poem or collection through the table API
- **THEN** the database refuses

#### Scenario: Another author's poem
- **GIVEN** a signed-in author A and a poem of author B
- **WHEN** A calls the move function with B's poem
- **THEN** nothing changes and the answer is `not-found`

#### Scenario: Place below the start
- **GIVEN** a collection with 3 poems
- **WHEN** a poem is moved to place -5
- **THEN** it becomes the first

#### Scenario: Place beyond the end
- **GIVEN** a collection with 3 poems
- **WHEN** a poem is moved to place 99
- **THEN** it becomes the last

#### Scenario: Guest reads the order
- **GIVEN** a public author's ordered poems
- **WHEN** an unauthenticated client selects them with their order
- **THEN** the rows come in the author's order

### Requirement: Move limit (NFR-2)
An author SHALL be able to make at most 30 moves per minute, counted per signed-in account after the session check and before the move. Over the limit nothing SHALL be changed and the answer SHALL be the over-the-limit message of FR-6. The counter SHALL be a scope of the existing per-user write-limit counter, the same shape as the collection edit and collection poems limits.

#### Scenario: The thirty-first move
- **GIVEN** 30 moves in the last minute
- **WHEN** the author makes one more
- **THEN** it is refused with the over-the-limit message and nothing changes

### Requirement: Module boundaries (NFR-3)
Ordering SHALL live in its own feature `work-ordering`, imported only through its public API by the `/account/poems` route file. `work-ordering` SHALL NOT import `poem-management` or `collection-management`, and neither of them SHALL import it or each other. `work-ordering` MAY import the public APIs of `auth` and `authors` and `shared/`, as its siblings do. The route file SHALL compose the existing pages' parts with the board without any feature importing another's internals; a rule that a feature repeats (a free poem, the order) SHALL be repeated in its own module, not extracted into `shared/` (project rule; `docs/deferred.md` public-collections 7.2).

#### Scenario: Boundary test
- **GIVEN** the repository
- **WHEN** the boundary tests run
- **THEN** none of the three features imports another's source, and only the route file imports `work-ordering`

### Requirement: Accessible board (NFR-4)
Each list on the board SHALL be a list; the collections SHALL be list items of one list with the poems in a nested list; drag handles SHALL be buttons with the names of FR-7 and a visible focus ring; the alerts SHALL use `role="alert"` and the connection notice `role="status"`; the live region of FR-7 SHALL be polite (`aria-live="polite"`, the board's own region; the drag library's built-in live region SHALL announce nothing, so the text is read once). Dragging SHALL NOT be the only way to reach a title link: each title SHALL stay a link to its page.

#### Scenario: Structure
- **GIVEN** an author with two collections holding poems
- **WHEN** `/account/poems` renders
- **THEN** the collections are `li` of one `ul`, each collection's poems are `li` of a nested `ul`, and each handle is a `button` with its accessible name

### Requirement: Design tokens only (NFR-5)
The board SHALL style with the project's design tokens and shared primitives only — no color literals or arbitrary values. The drag state (lifted item, drop place, drop area) SHALL use existing tokens, and reduced motion SHALL be respected.

#### Scenario: No literals
- **GIVEN** the board's styles
- **WHEN** the style lint runs
- **THEN** it finds no color literal and no arbitrary value

### Requirement: UI copy verbatim (NFR-6)
Every new user-facing string SHALL match the proposal's UI copy table verbatim and live in the feature's messages module (or the shared component that owns it).

#### Scenario: Copy lives in one module
- **GIVEN** the feature's components
- **WHEN** the copy test runs
- **THEN** every string in the table is exported from the messages module and no component holds a literal of it

### Requirement: Logs without content (NFR-7)
Server log lines from the move reads and writes SHALL carry the operation and the failure kind only — never a title, a collection id, a poem id, or an author id.

#### Scenario: A failed move logs
- **GIVEN** a move that fails in the database
- **WHEN** the log line is written
- **THEN** it holds the operation and the kind and no title or id

### Requirement: Build and loading (NFR-8)
`npm run build` SHALL succeed with no Supabase or Contentful environment variables, and `/account/poems` SHALL keep its render mode. The dragging code SHALL load only on `/account/poems`; no other route's client bundle SHALL include it.

#### Scenario: Build without env
- **GIVEN** no environment variables
- **WHEN** `npm run build` runs
- **THEN** it succeeds and the route list marks `/account/poems` as before

#### Scenario: Other routes unaffected
- **GIVEN** the build output
- **WHEN** the client chunks of `/authors/[id]` are inspected
- **THEN** none contains the drag-and-drop library

