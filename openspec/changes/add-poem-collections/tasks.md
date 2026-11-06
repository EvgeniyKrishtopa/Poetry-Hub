# Tasks

Order: group 1 is the database. Group 2 adds the slot props on `/account/poems` with no visible
change; `poem-management` gets nothing else (design D1: repeat, don't extract). Group 3 is the feature's server side (model, DAL, actions) with
no visuals. Groups 4, 5, and 6 add the screens and wait for the approved Claude Design link
(`docs/claude-design.md`): group 4 the create page and the section on `/account/poems`, group 5 the
collection page and delete, group 6 the edit page. Group 7 is breadcrumbs; group 8 is docs and
verification.
Each group exports only what it already consumes (tests count as consumers for knip), so
`npm run knip` stays green per group PR.

## 1. Collections in the database <!-- judgement-heavy -->

- [x] 1.1 (NFR-1, FR-3) Add `supabase/migrations/<ts>_collections.sql`: `public.collections` with
  its checks, index, RLS owner-only select policy for `authenticated`, no `anon` access, select-only
  column grant, no write grant; the down migration in the header (design D2).
- [x] 1.2 (FR-4, FR-5) In the same migration: `collection_creations`, the `log_collection_creation`
  trigger with pruning, `collection_create_limits()` (30 days, 50), `collection_create_status()`,
  and `create_my_collection(title, description)` with the per-author advisory lock (design D2,
  ADR 0010's shape).
- [x] 1.3 (FR-9, FR-11, FR-13) In the same migration: `update_my_collection(collection_id, title,
  description)` (public own profile required, only title and description set) and
  `delete_my_collection(collection_id)` (returns the stored title); execute for `authenticated`
  only.
- [x] 1.4 (FR-10) In the same migration: widen `write_rate_limits.scope`'s check with
  `collection_edit` and replace `consume_write_allowance` with `('collection_edit', 10, interval
  '1 minute')` added to its limits.
- [x] 1.5 (NFR-1, FR-5, FR-10) Add `supabase/tests/collections.test.sql` and extend
  `write_rate_limits.test.sql` with the cases in design D13.
  - Verify: `npx supabase db reset` and `npx supabase test db` pass.
- [x] 1.6 (NFR-3) Glossary first, so later groups load the right meaning (Gate 2 finding 4):
  `CONTEXT.md` gains «Collection (сборник)» — an author's own named group of their poems, not a
  reader's saved poems — and `openspec/config.yaml`'s context line is corrected to match.

## 2. Slots on `/account/poems` (no visible change) <!-- isolated -->

- [x] 2.1 (FR-1, FR-2, NFR-3) `MyPoemsPage` gains the optional `notices`, `actions`, and
  `beforeList` slot props (`MyPoemsPage.types.ts`); `MyPoemsContent` renders `actions` in a wrapping
  button row after «Добавить новое произведение» and `beforeList` before the poem list, on the
  public-profile branch only (design D3). No caller passes them yet.
  - Verify with `MyPoemsContent.test.tsx` and a `MyPoemsPage` test: `actions` and `beforeList`
    rendered in place and absent on the not-public branch; `notices` rendered outside the
    Suspense on every branch; every existing case passes unchanged.

## 3. Collection model, DAL, and actions (no visible change) <!-- judgement-heavy -->

- [x] 3.1 (FR-3, FR-8) `model/`: constants, types, messages (the proposal's copy table), paths,
  `collectionFormSchema` and the three action inputs (lowercase-hex UUID guard),
  `collection-form-values.ts` with `isCollectionFormChanged` (design D1, D5, D6).
  - Verify with `tests/model/` tests: trimming, blank description → none, both limits, the UUID
    guard, change detection on trimmed values.
- [x] 3.2 (FR-6, FR-7, FR-2, NFR-5) `dal/own-collections.ts`: `listOwnCollections`,
  `getOwnCollection` (React `cache`), `getOwnCollectionTitle` (design D4).
  - Verify with `tests/dal/own-collections.test.ts`: order, malformed id without a query,
    not-public → `not-found`, read errors → `unavailable`, log content.
- [x] 3.3 (FR-4, FR-9, FR-10, FR-13, NFR-5) `dal/write-log.ts` (the feature's copy, prefix
  `[collection-management]`, `SupabaseFailure`), `dal/collection-writes.ts`, and
  `dal/collection-edit-allowance.ts`: the three RPCs and the `collection_edit` scope, Zod-parsed,
  failures classified with the response status (design D2, D5–D7).
  - Verify with DAL tests: every status, a 5xx → `unavailable`, a rejected JWT →
    `unauthenticated`, a bad shape → `unknown`.
- [x] 3.4 (FR-4, FR-5, FR-9 – FR-11, FR-13, FR-15) The three actions in the order of design D5,
  D6, D7, each calling `refresh()` only on success (design D10).
  - Verify with `tests/actions/` tests: the order (no RPC on invalid input or a malformed id;
    nothing counted before the limit step on edit), every result, `refresh()` only on success.

## 4. Create page and the section on `/account/poems` <!-- judgement-heavy -->

- [x] 4.1 (NFR-4, NFR-6) Add `shared/ui/TextAreaField` on `TextField`'s classes and wiring, and drop
  the scaffold's `src/shared/ui/TextAreaField/**` entry from `knip.jsonc`.
  - Verify with `shared/ui/tests/TextAreaField.test.tsx`: label, error, `aria-*`.
- [x] 4.2 (FR-3, FR-14) `hooks/use-collection-form.ts` and `CollectionFormFields` (design D5).
  - Verify with `tests/hooks/use-collection-form.test.ts`: drafts, checks, focus order, `reset()`.
- [x] 4.3 (FR-3, FR-4, FR-5, FR-14, FR-16, FR-17) `NewCollectionPage`, `NewCollectionContent`,
  `NewCollectionForm`, `CollectionFormSkeleton`, `CollectionNotPublicNotice`; the route file
  (design D5). Also the create page's breadcrumb part of 7.1, its `STATIC_ROUTES` row and slot
  page: `app/tests/breadcrumbs-slot.test.ts` requires a slot page for every new page (user
  decision, 2026-11-06).
  - Verify with `NewCollectionForm.test.tsx`: each outcome's store and navigation, alert position
    and focus, sending state, offline and slow disabling, the offline rejection; and
    `NewCollectionContent.test.tsx`: the not-public notice instead of the form, the profile read
    failure, `requireSession()` called first and `unknown` → `SessionUnavailableAlert`.
- [x] 4.4 (FR-1, FR-2, FR-4, FR-13) `CreateCollectionLink`, `OwnCollectionsSection`,
  `CollectionListNotice` and its store; `app/(authorized)/account/poems/page.tsx` passes them into
  `MyPoemsPage`'s slots (design D3, D8).
  - Verify with `OwnCollectionsSection.test.tsx` (order, hidden when empty, failure alert),
    `CollectionListNotice.test.tsx` (three texts, once), and a route-file test (the three slots
    filled with the collection components).

## 5. Collection page and delete <!-- judgement-heavy -->

- [ ] 5.1 (FR-6, FR-14, FR-16) `CollectionPage`, `CollectionContent`, `CollectionActions`, `EditCollectionButton`,
  `SavedCollectionNotice` and its store; the route file (design D4, D8).
  - Verify with `CollectionContent.test.tsx`: title, paragraphs, no empty paragraph, 404 and
    error paths, the button order, the offline notice, `requireSession()` called first and `unknown`
    → `SessionUnavailableAlert`.
- [ ] 5.2 (FR-13, FR-14, NFR-4) `DeleteCollectionButton` (design D7).
  - Verify with `DeleteCollectionButton.test.tsx`: open/cancel focus, sending state, each
    outcome's store and navigation, the failure in the dialog, offline disabling (the opener
    `aria-disabled` and focusable, the confirm natively disabled, the notice inside the dialog).

## 6. Edit page <!-- judgement-heavy -->

- [ ] 6.1 (FR-12, NFR-4) The feature's copies of the leave guard and the leave dialog:
  `EditCollectionForm/use-leave-guard.ts`, `use-leave-prompt.ts`, `CollectionLeaveDialog`, the
  dialog's texts and `LEAVE_DIALOG_REASON` in the feature's model; registered with the shared
  leave-block store (design D12). Add the guard file to `poem-management/tests/boundaries.test.ts`'s
  expected `beforeunload` list.
  - Verify with the poem guard's and dialog's tests repeated for the collection paths (allowed and
    blocked paths, modifier clicks, `beforeunload`, the «Выйти» question and its pending answer).
- [ ] 6.2 (FR-7, FR-8, FR-9, FR-11, FR-12, FR-14, FR-16) `EditCollectionPage`, `EditCollectionContent`
  (keyed form), `EditCollectionForm` and `use-edit-collection-form.ts` with the guard from 6.1; the
  route file (design D6).
  - Verify with `EditCollectionForm.test.tsx`: back link vs save and discard, discard restoring
    both fields with focus, each outcome, alert position and focus, offline and slow, guard
    activation (changed, sending, off after `saved`) and its allowed paths; and
    `EditCollectionContent.test.tsx`: `requireSession()` first, `unknown` →
    `SessionUnavailableAlert`, `notFound()` and the throw.

## 7. Breadcrumbs <!-- isolated -->

- [ ] 7.1 (FR-17) `matchOwnCollectionRoute`, trails, and the collection and edit pages' slot
  pages (design D11). The create page's `STATIC_ROUTES` row and slot page landed in 4.3.
  - Verify with `matchRoute` and trail tests for the three paths and the not-found case;
    `app/tests/breadcrumbs-slot.test.ts` passes.

## 8. Docs and verification <!-- judgement-heavy -->
- [ ] 8.1 (NFR-2, NFR-3, NFR-5, NFR-6) Static checks: a `boundaries` test for
  `collection-management` (client-module list; no import of `poems` or `poem-management`; no
  import of `collection-management` from `poem-management`; no `navigator.onLine`; `beforeunload`
  only in its guard), no colour literals.
- [ ] 8.2 (NFR-3) Docs: `docs/architecture.md` (the new feature, its routes, the slot props on
  `MyPoemsPage`, and its copies of the leave guard, dialog, and write-log named next to the poem
  originals),
  `docs/state-management.md` (the two notice stores; uncached private reads with `refresh()`),
  ADR 0007's scope list,
  ADR 0009's note on later row-creating features, new ADR 0011 (private reader data read uncached
  under RLS, kept fresh with `refresh()`; design D4, D10), and `docs/environment.md`'s deploy checklist
  (`npx supabase db push` for the collections migration).
- [ ] 8.3 (FR-1 – FR-17) Gate 3 (web-qa): the flows in design D13; record the create → edit →
  delete path as a scenario under `tests/web-qa-scenarios` with a cleanup step.
- [ ] 8.4 (NFR-7, NFR-8) Drop the scaffold's `src/features/collection-management/**` entry from
  `knip.jsonc` (any export knip then reports unused is removed, not ignored); compare the messages
  module with the proposal's copy table; run
  `npm run typecheck && npm run lint && npm run test:coverage && npm run build && npm run knip` and
  confirm the build lists the three collection routes as partially prerendered and keeps every
  other marker.
