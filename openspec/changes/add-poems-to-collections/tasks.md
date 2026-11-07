# Tasks

Order: group 1 is the database and its decision record. Group 2 is the server side (model, DAL,
actions) with no visuals. Group 3 moves the leave guard inside the feature with no visible change.
Groups 4, 5, and 6 add the screens and wait for the approved Claude Design link
(`docs/claude-design.md`): group 4 the collection page, group 5 the collection poems page, group 6
the section on `/account/poems`. Group 7 is the integration check.
Each group exports only what it already consumes (tests count as consumers for knip), so
`npm run knip` stays green per group PR, and each group lands its own tests and docs.

## 1. Membership in the database <!-- judgement-heavy -->

- [x] 1.1 (NFR-1, FR-1) Add `supabase/migrations/<ts>_collection_poems.sql`: the `(id, author_id)`
  unique constraint on `collections`, `poems.collection_id` with the composite foreign key `on
  delete set null (collection_id)`, the partial index, no grant; the down migration in the header
  (design D2).
- [x] 1.2 (NFR-1, FR-4, FR-11) In the same migration: `my_collection_poem_choices(collection_id)` and
  `my_collected_poems()` (definer, own rows only, ordered `created_at desc, id`) (design D2).
- [x] 1.3 (NFR-1, FR-6, FR-8) In the same migration: `save_my_collection_poems(collection_id, added,
  removed)` with the input guard (22023), the public-profile and own-collection check, row locks in
  id order, the `stale` check after the locks, and the two updates (design D2).
- [x] 1.4 (FR-7) In the same migration: widen `write_rate_limits.scope`'s check with
  `collection_poems_save` and replace `consume_write_allowance` with `('collection_poems_save', 10,
  interval '1 minute')` added.
- [x] 1.5 (NFR-1, FR-1, FR-7) Add `supabase/tests/collection_poems.test.sql` and extend
  `write_rate_limits.test.sql` with the cases in design D13.
  - Verify: `npx supabase db reset` and `npx supabase test db` pass.
- [x] 1.6 (NFR-1, FR-1) Docs: new ADR 0012 (a private column on a public table: no grant, read and
  written only through definer functions whose caller filter is the last defence; it explicitly
  amends ADR 0011 §1 and ADR 0005 §1 for this case, and both get a "see ADR 0012" note; design D2), ADR 0007's scope list gains
  `collection_poems_save`, `CONTEXT.md` gains «Free poem» (a poem in no collection),
  `docs/environment.md`'s deploy checklist gains the migration's `npx supabase db push`.
  - Verify: the four files name the migration and the decision; `npm run lint` passes.

## 2. Selection model, reads, and actions (no visible change) <!-- judgement-heavy -->

- [x] 2.1 (FR-5, FR-6) `model/`: `COLLECTION_POEMS_SEGMENT`, the check and save statuses,
  `MAX_POEMS_PER_SAVE`; the new types; `collection-poems.schema.ts` (UUIDs, no duplicates, no
  overlap, not both empty, caps); `collection-poems-selection.ts` (`storedSelection`,
  `isSelectionChanged`, `selectionDiff`); `collectionPoemsPath`, `ownPoemPagePath`; the proposal's
  new copy in the messages module (design D1, D5, D12).
  - Verify with `tests/model/` tests: set equality both ways, diff ignores ids not in the choices,
    every schema rejection (1000 ids pass, 1001 fail), both paths.
- [x] 2.2 (FR-2, FR-4, FR-11, NFR-5) `dal/collection-poems.ts`: `getCollectionPoemChoices` and
  `listCollectedPoems` (design D3).
  - Verify with `tests/dal/collection-poems.test.ts`: parses, empty result, errors → `{ ok: false }`,
    log content carries no ids or titles.
- [x] 2.3 (FR-6, FR-7, FR-8, NFR-5) `dal/collection-poems-writes.ts` and
  `dal/collection-poems-allowance.ts`: the RPC and the `collection_poems_save` scope, Zod-parsed,
  failures classified with the response status (design D2, D6).
  - Verify with DAL tests: `saved`, `stale`, `not-found`, a 5xx → `unavailable`, a rejected JWT →
    `unauthenticated`, a bad shape → `unknown`.
- [x] 2.4 (FR-3, FR-6, FR-7, FR-8, FR-12) `checkCollectionPoemsAction` and
  `saveCollectionPoemsAction` in the order of design D4 and D6; `refresh()` only on `saved` and
  `stale`.
  - Verify with `tests/actions/` tests: the order (no read or RPC on a malformed id or invalid
    input; nothing counted before the limit step), every result, `refresh()` exactly on `saved` and
    `stale`, the check counts nothing.

## 3. One leave guard for the feature (no visible change) <!-- isolated -->

- [x] 3.1 (FR-10, NFR-3) Move `EditCollectionForm/use-leave-guard.ts` to `hooks/use-leave-guard.ts`
  and its test from `tests/components/` to `tests/hooks/`; `onBlocked` receives the clicked link's
  `pathname + search + hash`; the edit form's prompt ignores it. Update the expected `beforeunload`
  path in both `poem-management/tests/boundaries.test.ts` and
  `collection-management/tests/boundaries.test.ts`, and `docs/architecture.md`'s note on the guard
  copies (design D7).
  - Verify: the moved guard's tests plus a case asserting the relative path passed to `onBlocked`; every
    `EditCollectionForm` test passes unchanged; `npm run typecheck && npm run lint && npm run knip`.

## 4. The collection page <!-- isolated -->

- [ ] 4.1 (FR-2) `CollectionPoemList` and `CollectionContent` reading `getCollectionPoemChoices`;
  the choices failure throws (design D4).
  - Verify with `CollectionPoemList.test.tsx` (order, links to `/account/poems/<id>`, nothing when
    empty) and `CollectionContent.test.tsx` (list placement, button shown exactly when choices are
    non-empty, choices failure throws, existing cases unchanged).
- [ ] 4.2 (FR-3, FR-9, NFR-4) `CollectionActions` with named slots and the manage button's error
  below the row; `ManageCollectionPoemsButton` (design D4).
  - Verify with `ManageCollectionPoemsButton.test.tsx` and `CollectionActions.test.tsx`: each check
    outcome (push, the three alerts under the row, `/login`), focus kept on the button, the alert
    cleared on the next press, `aria-disabled` while offline, slow, or pending, button order edit →
    manage → delete; the delete button's existing tests pass.
- [ ] 4.3 (NFR-2, NFR-3) Docs: `docs/architecture.md` (the collection page's new pieces, the
  check action, `ownPoemPagePath` named next to its twin `ownPoemPath`).

## 5. The collection poems page <!-- judgement-heavy -->

- [ ] 5.1 (FR-4, FR-13, FR-14) `CollectionPoemsPage`, `CollectionPoemsContent`,
  `CollectionPoemsSkeleton`; the route file; `matchOwnCollectionRoute`'s `own-collection-poems`
  match, its trail, and the slot page (design D5, D11; `app/tests/breadcrumbs-slot.test.ts` requires
  a slot page for every new page).
  - Verify with `CollectionPoemsContent.test.tsx` (`requireSession()` first, `unknown` →
    `SessionUnavailableAlert`, `notFound()`, the throw, the hint with the title) and the `matchRoute` / trail tests for the new path and the not-found case.
- [ ] 5.2 (FR-5, FR-6, FR-8, FR-9, NFR-4) `CollectionPoemsForm`, `use-collection-poems-form.ts`
  (design D5, D6).
  - Verify with `use-collection-poems-form.test.ts` and `CollectionPoemsForm.test.tsx`: change
    detection, the empty state with the back link (also after a `stale` save, below the alert), the saved state (disabled button, notice, link) and its reset on the next change,
    each outcome's alert, focus, navigation and store, `draft` following the stored set after
    `saved` and `stale` (reset inside the action's transition), the offline and slow freeze, the dropped-connection rejection.
- [ ] 5.3 (FR-10, NFR-4) `use-collection-poems-leave-prompt.ts` and `CollectionPoemsLeaveDialog`,
  wired to the moved guard (design D7).
  - Verify with prompt and dialog tests: the three buttons in both forms, save-then-navigate and
    save-then-sign-out, a failed save closing the dialog with the alert on the page, offline focus
    on «Остаться», `stay`/`dismissed` answers, the guard off before `router.push`, and the sign-out
    form answering `leave` before the draft resets (the draft reset before the dialog's `close`
    event still yields exactly one sign-out; design D7, Gate 1 C1).
- [ ] 5.4 (NFR-2) Docs: `docs/architecture.md` (the new page and route) and
  `docs/state-management.md` (the form's `draft | null` selection that follows the stored set after
  `refresh()`).

## 6. Poems under each collection on `/account/poems` <!-- isolated -->

- [ ] 6.1 (FR-11) `OwnCollectionsSection` reads `listCollectedPoems` in parallel and renders the
  nested lists (design D10).
  - Verify with `OwnCollectionsSection.test.tsx`: nested order, title-only collection, either read
    failing → the section alert, existing cases unchanged.

## 7. Verification <!-- judgement-heavy -->

- [ ] 7.1 (NFR-2, NFR-3, NFR-5, NFR-6) Static checks: the `collection-management` boundaries
  test's client-module list gains the new client modules and the moved guard; no import of `poems`
  or `poem-management`; `beforeunload` only in the feature's one guard; no colour literals.
- [ ] 7.2 (FR-1 – FR-14) Gate 3 (web-qa): the flows in design D13, plus no flash of the old
  selection after a save; record open → add → save →
  remove → save as a scenario under `tests/web-qa-scenarios` with a cleanup step.
- [ ] 7.3 (NFR-7, NFR-8) Drop the scaffold's `knip.jsonc` entries for this change's files (any export knip then reports unused is removed, not ignored); compare the messages module with the proposal's copy table; run
  `npm run typecheck && npm run lint && npm run test:coverage && npm run build && npm run knip` and
  confirm the build lists `/account/poems/collections/[collectionId]/poems` as partially prerendered
  and keeps every other marker.
