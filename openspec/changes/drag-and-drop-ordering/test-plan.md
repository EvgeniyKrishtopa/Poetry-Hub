# Test Plan

One row per acceptance criterion (a scenario's THEN) in this change's spec deltas. Levels:
**unit** (one module, its collaborators mocked), **integration** (a real local service: the
Supabase database through pgTAP, or a full Next build), **end-to-end** (a real browser against the
dev server: Gate 3 and recorded scenarios). Requirement IDs are this change's (`proposal.md`); a
MODIFIED block of an existing capability names its own ID in brackets. A criterion carried over
unchanged inside a MODIFIED block is closed by its existing test, which must keep passing; those
rows say "existing".

## work-ordering

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| FR-1 | Existing works keep their order after the migration | `work_ordering.test.sql`: rows inserted before the backfill statement come out newest first per container (poems per collection and free, collections per author) | integration |
| FR-1 | New poem and new collection go first | `work_ordering.test.sql`: an insert with no position gets one before every other row of its container, for poems (free) and collections; `create-poem` / `create-collection` action tests (existing) still pass; Gate 3: create each and see it first | integration, end-to-end |
| FR-1 | A delete keeps the rest in order | `work_ordering.test.sql`: delete the middle poem, the rest keep `order by position, id` | integration |
| FR-1 | Deleting a collection frees its poems first, in their order | `work_ordering.test.sql`: `delete_my_collection` leaves the freed poems before the old free poems, in collection order | integration |
| FR-2 | Move a poem up inside a collection; order survives reload and shows on the public page | `arrange-drop` model test (within-list move); `work_ordering.test.sql`: `move_my_poem` same container; Gate 3: drag, reload `/account/poems` and `/authors/<id>` | unit, integration, end-to-end |
| FR-2 | Dropped on its own place sends nothing | `arrange-drop` test: same index → no change and no call; island test: the action mock is not called | unit |
| FR-3 | Move into the middle of another collection | `arrange-drop` test (cross-list); `work_ordering.test.sql`: both containers renumbered, membership single; Gate 3 | unit, integration, end-to-end |
| FR-3 | Move into an empty collection; guest then sees it | `arrange-drop` test: empty target; `work_ordering.test.sql` plus anon read of the now non-empty collection; Gate 3 guest reload | unit, integration, end-to-end |
| FR-3 | The last poem leaves a collection: stays on the owner's page, hidden publicly | island/content test: the empty collection renders its title only; `work_ordering.test.sql`: anon no longer reads it | unit, integration |
| FR-4 | Free poem into a collection; poem out of a collection; reorder the free poems | `arrange-drop` tests for the three shapes; `work_ordering.test.sql`: `move_my_poem` with and without a target collection; Gate 3 | unit, integration, end-to-end |
| FR-4 | Free-poems drop area appears while dragging when no free poem exists | island test: `onDragStart` with no free poem renders the area with its text; drop on it → free | unit |
| FR-5 | Move a collection to the top; its poems stay; guest sees the order | `arrange-drop` test (collection move keeps nested poems); `work_ordering.test.sql`: `move_my_collection`; Gate 3 guest reload | unit, integration, end-to-end |
| FR-5 | A collection cannot nest | island test: a collection dropped over a poem list stands at the collection place the in-drag arrangement showed, and returns only when none was shown (outside the board); Gate 3 | unit, end-to-end |
| FR-6 | A successful drop: shown at once, no message, persists after reload | island test: optimistic order shown while the action mock pends, no alert after `ok:true`; Gate 3 reload | unit, end-to-end |
| FR-6 | The server refuses: item returns, alert with focus | island test: `ok:false` → props order back, alert text, focus on alert | unit |
| FR-6 | Over the limit: nothing stored, rate message | action test: `consume_write_allowance` denied → no RPC, reason `rate-limited`; island test: the over-limit text | unit |
| FR-6 | The connection drops: same alert, never the error screen | island test: the action mock rejects → failed alert, no thrown render | unit |
| FR-6 | Session expired → `/login` with the existing message | action test: no session → `redirect("/login")` with the expired-session marker, no RPC | unit |
| FR-6 | Offline: the existing offline notice on the board | board test: `useConnection` offline → notice with `role="status"` | unit |
| FR-6 | Offline or slow: no handle can start a drag; active again only when online and not slow; a drag already in progress is not cancelled | board test: `useConnection` offline, then slow, then online → handles disabled, disabled, enabled; a drag started before going offline can still be dropped | unit |
| FR-7 | Keyboard move inside a list, announced, focus on the handle | spike (task 5.1, `@dnd-kit`) result recorded; island test with keyboard events: lift, arrows, drop → new order, announce calls, focus on handle; Gate 3 keyboard pass | unit, end-to-end |
| FR-7 | Cancel returns the item and announces it | island test: Escape → old order, no action call, announcement text | unit |
| FR-7 | Keyboard move between collections | spike result; `board-places.test.ts`: `nextPlace` crosses from the end of one list into the next; island test or Gate 3 keyboard pass: item ends in the other collection | unit, end-to-end |
| FR-7 | Keyboard move into an empty collection | `board-places.test.ts`: an empty collection has one place; Gate 3 keyboard pass: item ends in «Пустой», focus on its handle | unit, end-to-end |
| FR-7 | Announcement wording: «помещено в …» only when a poem's list changes; the position phrase otherwise and for every collection; n and total from the target list | `board-announcements.test.ts` (pure `announcementFor`, one case per phrase of the proposal's table) | unit |
| FR-7 | ArrowUp/ArrowDown step through places in reading order; a collection steps among collections only; ArrowLeft/ArrowRight do nothing; ArrowUp at the first place and ArrowDown at the last do nothing, silently, with no wrap | `board-places.test.ts` (pure functions, exhaustive: ends of the board returning no next place, free poems, one collection) | unit |
| FR-7 | Scroll on touch does not start a drag | Gate 3 with touch emulation: swipe on a title scrolls; handle-only drag props asserted in an island test | end-to-end, unit |
| FR-8 | A guest follows a move after reload | action test: `moved` → `updateTag(authorWorksTag(authorId))`; Gate 3: guest reload | unit, end-to-end |
| FR-8 | A refused move changes nothing public | action tests: rate-limited, failed, invalid → no `updateTag`; stale → `refresh()` without `updateTag` | unit |
| FR-9 | Owner and guest see the same order | DAL tests: every read orders by `position` then `id` (`author-poems`, public collections, own collections, collection poems, board reads); Gate 3 compares both pages | unit, end-to-end |
| FR-10 | Save the collection's poems: added first (checklist order), removed first among the free ones (collection order) | `work_ordering.test.sql` / `collection_poems.test.sql`: `save_my_collection_poems` result order | integration |
| FR-11 | A poem deleted in another tab: nothing stored, board refreshed, alert | `work_ordering.test.sql`: `stale` / `not-found` with nothing written; action test: stale → `refresh()`, reason `stale`; island test: stale text with focus; Gate 3 two-tab pass | integration, unit, end-to-end |
| FR-11 | Another author's poem answers like an unknown id | `work_ordering.test.sql`: both answer `not-found`; action test: same reason | integration, unit |
| NFR-1 | Direct writes to `position` are refused for every role | `work_ordering.test.sql`: update as `authenticated` and `anon` fails | integration |
| NFR-1 | Another author's poem → `not-found`, nothing changes | `work_ordering.test.sql` | integration |
| NFR-1 | Place below the start → first; beyond the end → last | `work_ordering.test.sql`: indexes -5 and 99 | integration |
| NFR-1 | A guest reads the order of a public author's rows | `work_ordering.test.sql`: anon `select … order by position, id`; a non-public author's rows unreadable | integration |
| NFR-2 | The thirty-first move is refused | `work_ordering.test.sql`: the `order_move` scope counts 30 per minute; action test: the 31st answer maps to `rate-limited` | integration, unit |
| NFR-3 | No sibling imports; only the route imports the feature | `work-ordering/tests/boundaries.test.ts`; boundary tests of `poem-management` and `collection-management` (existing, extended) | unit |
| NFR-4 | List structure and handle names | island test: `ul > li > ul`, `button` handles with the accessible names, the board's own `aria-live="polite"` region (written once per event; the library's region silent), `role="alert"` | unit |
| NFR-5 | No colour literal or arbitrary value | style lint / token test over the feature's CSS and class names (existing style checks) | unit |
| NFR-6 | Every copy string lives in the messages module | messages copy test: each string of the proposal table is exported; no literal in components | unit |
| NFR-7 | A failed move or read logs operation and kind only | action and DAL tests: spy on the logger, assert no title or id in the line | unit |
| NFR-8 | Build without env, route marker kept | `npm run build` with no env (group 7.2) | integration |
| NFR-8 | The library is absent from other routes' chunks | build output inspection in group 7.2: grep the `/authors/[id]` chunks | integration |

## public-collections

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| FR-8 (modifies FR-2) | Collections and poems listed in the author's order | `PublicCollectionsSection` test: input order kept (collections and nested poems); `nest-public-collections` test | unit |
| FR-8 (modifies FR-2) | The author's order beats the creation date | public collections DAL test: query orders by `position` then `id`; `work_ordering.test.sql` | unit, integration |
| FR-8 (modifies FR-5) | The collection page lists poems in the author's order | `PublicCollectionContent` test: order kept; DAL order test | unit |
| FR-8 | Carried-over criteria of FR-2 and FR-5 (no visible collection, following a title, description paragraphs, 404s, error, skeleton) | existing tests, must keep passing | existing |

## author-poems

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| FR-8 (modifies FR-1) | Free poems listed in the author's order | `AuthorPoemsEntry` test: order kept; `uncollected-poems` test | unit |
| FR-1 (modifies add-poem-creation FR-9) | Stored poems never reordered still list newest first | `author-poems` DAL test: query orders by `position` then `id`; `work_ordering.test.sql` backfill case | unit, integration |
| FR-8 | Carried-over criteria (empty, unavailable, every poem collected, publication date, no mock poems) | existing tests | existing |

## collection-management

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| FR-9 (modifies FR-6) | The owner's collection page lists poems in the author's order | `CollectionContent` / `CollectionPoemList` test: order kept; own collection-poems DAL order test | unit |
| FR-10 (modifies add-poems-to-collections FR-4) | A poem added goes first | `work_ordering.test.sql` / `collection_poems.test.sql`; Gate 3: add on «Произведения сборника», see it first | integration, end-to-end |
| FR-10 | A poem taken out goes first among the free poems | same | integration, end-to-end |
| FR-10 | The checklist stays newest first | `CollectionPoemsForm` test and `my_collection_poem_choices` pgTAP case (existing) | existing |
| FR-10 | Carried-over criteria of FR-6 and FR-4 | existing tests | existing |

## poem-management

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| FR-9 (modifies FR-2) | The page shows the board in place of the two lists | `MyPoemsPage` test: the `board` slot renders where the section and the free list were; route file test | unit |
| FR-9 | A new poem is first among the free poems | `work_ordering.test.sql`; Gate 3 | integration, end-to-end |
| FR-9 | Collections read fails → one alert, no board, no poem link | `WorkBoardContent` test row 1 of the failure matrix; `MyPoemsPage` test | unit |
| FR-9 | Poems read fails → the poems alert, no board, no poem link | `WorkBoardContent` test rows 2–3 | unit |
| FR-9 | Carried-over criteria (author with poems, without poems, with collections, only own poems, every poem collected) | existing tests, updated where the markup moved into the board | existing |
