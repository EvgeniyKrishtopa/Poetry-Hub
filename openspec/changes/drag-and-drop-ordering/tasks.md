# Tasks

Order: group 1 opens the database (nothing in the app reads it yet). Group 2 makes every read order by
position and every create put its item first, with no visible change (every existing item starts in
today's order). Group 3 changes the collection poems save. Group 4 adds the move actions and their DAL
(no screen calls them yet). Group 5 proves the drag library on a throwaway page before any screen is
built (Risk R1, R2, R4); `@hello-pangea/dnd` failed it on 2026-11-11, so the group is redone for `@dnd-kit`
(design D5). Group 6 is the board, built from the approved Claude Design artboards
(`proposal.md` Mockups; no UI group starts before the approved link arrives, `docs/claude-design.md`).
Group 7 puts the board on `/account/poems` and deletes the pieces it replaces. Group 8 is docs and
verification. Each group exports only what it already consumes (tests count as consumers for knip), so
`npm run knip` stays green per group PR, and each group lands its own tests.

## 1. Database: positions and the move functions <!-- judgement-heavy -->

- [x] 1.1 (NFR-1, FR-1) New migration `supabase/migrations/<timestamp>_work_ordering.sql` (design D1, D2):
  `collections.position` and `poems.position` added nullable, backfilled by `row_number()` over the
  newest-first order per container, then `not null`; the two indexes replacing the created-at ones; the
  select grants on both columns for `anon` and `authenticated`; the header comment and the documented
  down migration.
- [x] 1.2 (NFR-1, FR-2 – FR-5, FR-11) The same migration: `move_my_poem` and `move_my_collection`
  (security definer, owner from the session, public-profile check, lock order, `stale` / `not-found`,
  clamped index, one transaction, `author_id` on `moved`), granted to `authenticated` only.
- [x] 1.3 (FR-1, FR-10, NFR-2) The same migration: the `before insert` triggers on `poems` and `collections`
  (first position under the per-author advisory lock); the advisory lock in the four writers (`move_my_poem`, `move_my_collection`, `save_my_collection_poems`, `delete_my_collection`);
  `save_my_collection_poems` places added poems first in the collection and removed ones first among the free
  poems; `delete_my_collection` places the freed poems first among the free poems in their order; the
  `order_move` scope (30 per minute) in `write_rate_limits` and `consume_write_allowance`;
  `my_collected_poems` orders by position.
- [x] 1.4 (NFR-1, FR-1) pgTAP `supabase/tests/work_ordering.test.sql`: backfill keeps newest-first; new poem
  and new collection first; a delete keeps the rest; the two move functions (within, across, into an empty
  collection, out to the free poems, beyond the end, same place, another author's, unknown, `stale`,
  non-public profile); direct updates of `position` fail for every role; `anon` reads the order of a public
  author's rows and nothing of a non-public one's; the scope's limit counts; deleting a collection frees its poems first, in order; a direct insert with no
  position gets the first one; `save_my_collection_poems` puts the added poems first in the collection
  (checklist order) and the removed ones first among the free poems (their collection order).
- [x] 1.5 (NFR-1) Update the existing pgTAP files whose expectations change (`poems`, `collections`,
  `collection_poems`, `write_rate_limits`); run `supabase db reset` (the seed) and the whole pgTAP suite to
  prove the direct-insert fixtures still pass with no change.
- [x] 1.6 (NFR-1) Docs: ADR `docs/decisions/0014-author-set-order.md` (the order model, who writes it, the
  limit); `docs/environment.md`'s deploy checklist: the new migration after the public collections one,
  before the app.

## 2. Every read orders by position; every create goes first (no visible change) <!-- isolated -->

- [x] 2.1 (FR-9, FR-8) `poems`' `listAuthorPoems`: select `position`, `order by position, id`; the public
  collections read (`collections`): order by `position, id`; update fixtures and tests. The four model
  copies keep "the order given": comments updated, tests assert the order is preserved.
  - Verify with `poems/tests/dal/author-poems.test.ts`, `collections/tests/dal/*`, and the four model tests.
- [x] 2.2 (FR-9) `collection-management`: `listOwnCollections`, `listCollectedPoems` and the collection page's
  poems read order by position; `my_collection_poem_choices` stays newest first (the checklist).
  - Verify with `collection-management/tests/dal/*`.
- [x] 2.3 (FR-1) The create actions need no code change (the insert triggers set the position); assert in
  their tests that the RPC result is unchanged. Gate 3 later checks that a new poem and collection appear first.

## 3. Choosing a collection's poems keeps the order sensible <!-- isolated -->

- [x] 3.1 (FR-10) `save-collection-poems` action and DAL: no change of arguments; tests assert that the
  result and the cache expiry are unchanged; the new ordering is verified in pgTAP (1.4) and by Gate 3.

## 4. Move actions and their DAL (nothing calls them yet) <!-- judgement-heavy -->

- [x] 4.1 (FR-6, FR-11, NFR-2, NFR-7) `src/features/work-ordering/`: `model` (move argument schemas, result
  unions, constants incl. the 30-per-minute limit, messages with the Russian copy), `dal` (the two RPC calls,
  the write allowance, a write log that logs the operation and failure kind only), `actions`
  (`movePoemAction`, `moveCollectionAction`: validate → session → limit → RPC; `moved` → own
  `expireAuthorWorksTag` + `refresh()`; `stale`/`not-found`/not-public → `refresh()` only).
  - Verify with unit tests per action: refused, rate-limited, and failed paths expire nothing, `moved` expires
    the tag with the returned author and refreshes, `stale`/`not-found` refresh without expiring, invalid
    arguments and a missing session are refused, logs carry no ids.
- [x] 4.2 (NFR-3) `work-ordering/tests/boundaries.test.ts`: imports neither `poem-management` nor `collection-management` (it may import `auth`, `authors`, `shared`); nothing but the route
  file imports it; its public API exports only what the route consumes.

## 5. Spike: the drag library (`@dnd-kit`) on a throwaway page <!-- judgement-heavy -->

- [ ] <!-- deferred: docs/deferred.md --> 5.1 (FR-7, NFR-4) The user replaces `@hello-pangea/dnd` (its first spike failed R1, see
  `docs/deferred.md`) with `@dnd-kit/core` and `@dnd-kit/sortable` (exact pins). In the scratchpad (never in
  `src/`), prove under the project's Next, React 19, Compiler and Strict Mode config, in a real browser:
  collections as sortable items holding nested sortable poem lists; a `<button>` handle; touch started from
  the handle only (a scroll or a press on the title never drags); disabling the handle that started a drag
  leaves that drag running (FR-6, offline mid-drag); keyboard lift/move/drop/cancel inside a
  list, **between stacked lists** with ArrowUp/ArrowDown through the places of design D8, into an empty
  list, and for collections; the instructions through `accessibility`; our own polite live region with the
  library's announcements silent (nothing read twice); focus on the handle after a drop and a cancel.
  Record the result in `PROGRESS.md`. A failure is a stop: decide with the user again (design R1).

## 6. The board (needs the approved Claude Design link) <!-- judgement-heavy -->

- [ ] 6.1 (FR-2 – FR-5, FR-7, NFR-4, NFR-5) `WorkBoardIsland` (`"use client"`), the collection and poem items,
  the handles, the drop areas, the alert and the polite live region; `useBoardDrag` (the `KeyboardSensor`
  coordinate getter, the in-drag arrangement) and `useMoveSubmit` of design D4/D8; tokens and shared primitives only; reduced motion respected. A
  `<button>` handle, `TouchSensor` with a press delay, `touch-action` on the handle only.
  - Verify with component tests: the arrangement function for each move kind and the new pure functions
    (`boardPlaces`, `nextPlace`, `announcementFor`; unit tested exhaustively: empty lists, the ends of the
    board, a collection stepping among collections only, «помещено в …» only when a poem's list changes),
    the handle names, the structure
    (`ul > li > ul`), the live region is `aria-live="polite"` and written once per event, no literals.
- [ ] 6.2 (FR-6, FR-11, NFR-6) The island's `useOptimistic` + transition flow: the dropped place shows at
  once, a refusal returns the item and shows its alert with focus, stale refreshes, a drop that changes
  nothing sends nothing, the session-expired redirect, the offline and slow notice.
  - Verify with island tests that mock the two actions, and a copy test: every string of the proposal's UI
    copy table is exported from the messages module and no component holds a literal of it (NFR-6).
- [ ] 6.3 (FR-8, FR-9, NFR-7) `WorkBoardContent` (Server Component) reads and nests the author's collections and
  poems under the cookie client with the explicit author filter; the failure matrix of design D4 (either read
  failing → its alert, no board, no poem link); the skeleton.
  - Verify with DAL and content tests, one per row of the matrix, and that a failed read logs one line with the
    operation and the kind only (NFR-7).

## 7. Compose the board; delete what it replaces <!-- judgement-heavy -->

- [ ] 7.1 (FR-9, NFR-3) `MyPoemsPage` gets the `board` slot replacing `beforeList` and its own free list; the
  route passes `<WorkBoard />`; remove `OwnCollectionsSection`, `OwnCollectionItem`, `nestCollectedPoems`,
  the `readCollectedPoems` prop, `selectFreePoems`, the free list component, and whatever knip then reports,
  with their tests; keep `listCollectedPoems` only if something still reads it.
  - Verify with updated `MyPoemsPage` tests and the route file's test; `npm run knip` green.
- [ ] 7.2 (NFR-8) `npm run build` with no env: `/account/poems` keeps its render marker; the library's code is
  absent from the client chunks of `/authors/[id]`.

## 8. Docs and verification <!-- judgement-heavy -->

- [ ] 8.1 (FR-1) `CONTEXT.md`: Collection and Free poem keep their meaning; no mention of "newest first".
- [ ] 8.2 (FR-8, FR-9) `docs/deferred.md`: close the "four copies" public-collections 7.2 entry and note the board's read on the "owner's pages read uncached" one; record every task of
  this change that ends blocked, skipped, or obsolete.
- [ ] 8.3 (FR-2 – FR-8, FR-11) Gate 3 (web-qa) as the author and as a guest: reorder inside a collection,
  move across collections, free ↔ collection, reorder collections, keyboard and touch (emulated), a refused
  drop, a stale drop from two tabs, the public pages' order after each move. Record "author reorders a
  collection and a guest sees it" as a scenario under `tests/web-qa-scenarios`.
