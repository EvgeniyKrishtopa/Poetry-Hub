# Tasks

Order: group 1 opens the database (no app change reads it yet). Group 2 moves the cache tag and adds
membership to the poems read, with no visible change. Group 3 makes collection writes expire the
public tag. Group 4 adds the public collections reads. Groups 5 and 6 are the two UI surfaces,
built from the approved Claude Design artboards 38–39 (`proposal.md`, Mockups). Group 7 is docs and verification. Each group exports only what it already
consumes (tests count as consumers for knip), so `npm run knip` stays green per group PR, and each
group lands its own tests.

## 1. Database: public collections and membership <!-- judgement-heavy -->

- [x] 1.1 (NFR-1, FR-1) New migration `supabase/migrations/<timestamp>_public_collections.sql` (design
  D2): the policy "anyone reads public authors' non-empty collections" for `anon, authenticated`;
  `grant select (id, author_id, title, description, created_at) on collections to anon`; `grant
  select (collection_id) on poems to anon, authenticated`; `delete_my_collection` recreated to also
  return `author_id` on `deleted`; the header comment and the documented down migration.
- [x] 1.2 (NFR-1, FR-1) pgTAP `supabase/tests/collections.test.sql`: anon and another author read a
  public author's non-empty collection; not an empty one, not one whose only poem was deleted, not a
  non-public author's; the owner still reads own empty and own while not public; direct writes still
  fail for every role; `delete_my_collection` returns `author_id` on `deleted` and `not-found` for
  another author's or a missing id.
- [x] 1.3 (NFR-1) pgTAP `supabase/tests/collection_poems.test.sql`: anon, another author, and the
  owner select `collection_id` of a public author's poem; nobody but the owner reads a non-public
  author's poem; direct updates of `collection_id` still fail; the save and owner read functions'
  existing cases unchanged.
- [x] 1.4 (NFR-1) Pin the owner's reads: `collection-management/tests/dal/own-collections.test.ts`
  asserts `listOwnCollections` and `getOwnCollection` filter by the own author id, so the wider policy
  can't add another author's collections to `/account/poems` (design D2).
- [x] 1.5 (NFR-1, FR-1) Docs: ADR `docs/decisions/0013-public-collections.md` (supersedes 0012;
  amends 0011 §1, §4, §5 for collections; Gate 1 accepted-decisions note); set 0012's status to
  "Superseded by 0013" and add "Amended by 0013" to 0011; `CONTEXT.md`: Collection — visible to everyone once it
  holds a poem and its author is public, managed only by its author; Free poem — only its last clause
  changes: which collection a poem is in is visible to everyone for a public author, not only to the
  author;
  `docs/environment.md`'s deploy checklist: the new migration, after the collection poems one, before
  the app.

## 2. One public tag per author; the poems read carries membership (no visible change) <!-- isolated -->

- [x] 2.1 (NFR-2, NFR-3) `src/shared/config/cache-tags.ts`: `authorWorksTag(authorId)` →
  `author-works:<authorId>` (design D4); remove `poemsTag` from `poems`' model and index; `poems`'
  read tags with `authorWorksTag`; `poem-management`'s `expire-poems-tag.ts` becomes
  `expire-author-works-tag.ts` (`expireAuthorWorksTag`) importing from `shared/config`.
  - Verify with `shared/config/tests/cache-tags.test.ts`, `poems/tests/dal/author-poems.test.ts`
    (tag), and poem-management's three action tests (the new tag).
- [x] 2.2 (FR-1, FR-3, NFR-2) `POEM_COLUMNS` gains `collection_id`; `poemRowSchema` gains
  `collection_id: lowercaseUuidSchema.nullable()`; `Poem.collectionId`; `toPoem` maps it (design D3).
  - Verify with `poems/tests/dal/author-poems.test.ts`: a row with and without `collection_id` maps
    to `collectionId`; a malformed one fails the parse as `unavailable`; fixtures updated.
- [x] 2.3 (NFR-3) Boundaries: `poems/tests/boundaries.test.ts` bans `@/features/collections`;
  `collection-management/tests/boundaries.test.ts` still bans `poems` and `poem-management`.

## 3. Collection writes keep the public pages fresh <!-- judgement-heavy -->

- [ ] 3.1 (FR-7, NFR-2) Next 16 API check: Confirm with context7 (library `next`) that `updateTag` and `refresh()`
  may both run in one Server Action; record the answer in the group's PR body. If they can't, stop
  and ask before changing the design.
- [ ] 3.2 (FR-7, NFR-2) `collection-management/actions/expire-author-works-tag.ts`: the feature's own
  copy, logged `[collection-management] expire author works tag failed: <kind>`, never throwing
  (design D4).
- [ ] 3.3 (FR-7) `updateCollectionAction` (on `updated`) and `saveCollectionPoemsAction` (on `saved`,
  not `stale`) expire with the author id from the `getOwnPublicAuthor()` they already read before the
  write; `createCollectionAction` unchanged (design D4 table).
  - Verify with their action tests: tag expired after `updated` / `saved`; not after `stale`,
    `not-found`, a refusal, or a failure; not after `created` (`createCollectionAction`'s test); a
    throwing `updateTag` still reports success.
- [ ] 3.4 (FR-7) `deleteOwnCollection` parses `author_id`; `deleteCollectionAction` expires
  `authorWorksTag(author_id)` on every `deleted` before `refresh()` (design D4, Gate 1 C1).
  - Verify with `tests/dal/collection-writes.test.ts` (parse; a missing `author_id` is `unknown`, never
    a guessed success) and `delete-collection.actions` test: expired on `deleted`, including for an
    owner whose profile is no longer public; not on `not-found` or failure.
## 4. Public collections reads (new feature, no UI yet) <!-- judgement-heavy -->

- [ ] 4.1 (NFR-3, NFR-4) Create `src/features/collections/` with `index.ts` exporting only what the
  group's tests use; types, row schema, copy constants, paths (`PUBLIC_COLLECTIONS_SEGMENT`,
  `publicCollectionPath`) (design D5, D7).
- [ ] 4.2 (FR-1, NFR-2, NFR-9) `dal/public-collections.ts`: `listPublicCollections` (cached,
  `authorWorksTag`, hours / seconds, UUID guard, lowercase), `listAuthorCollections`,
  `getPublicCollection` in React's `cache` (design D5).
  - Verify with `collections/tests/dal/public-collections.test.ts` (its own fake public client):
    order, parse failure as `unavailable`, one log line with no id or title, UUID guard opens no
    scope, nesting with both reads, either read failing, `getPublicCollection` not-found for a
    malformed, uppercase, unknown, or emptied collection.
- [ ] 4.3 (FR-1, FR-2) `model/nest-public-collections.ts`: poems by `collectionId`, the poems list's
  order, empty collections dropped, `hasCollectedPoems` (design D5, D6).
  - Verify with `tests/model/nest-public-collections.test.ts`.
- [ ] 4.4 (NFR-3, NFR-4) `collections/tests/boundaries.test.ts`: no `"use client"`; no `auth`,
  `collection-management`, `poem-management`, cookie or session Supabase client; `authors/` and
  `poems/` don't import `collections`.

## 5. Author page: collections section and free poems <!-- UI: mockups approved, artboards 38–39 --> <!-- judgement-heavy -->

- [ ] 5.1 (FR-3, FR-4) `poems/model/uncollected-poems.ts` and `AuthorPoemsEntry` lists free poems
  only, renders nothing when every poem is collected (design D3 table).
  - Verify with `poems/tests/model/uncollected-poems.test.ts` and
    `poems/tests/components/AuthorPoemsEntry.test.tsx`: every row of D3's table.
- [ ] 5.2 (FR-2, FR-4, NFR-6, NFR-7, NFR-8) `collections/components/PublicCollectionsSection`
  (design D6), markup and classes exactly as `OwnCollectionItem` on `/account/poems` (FR-2; user
  decision 2026-11-10, spec-clarify: the mockup repeats that look, and any difference is a separate
  change).
  - Verify with `collections/tests/components/PublicCollectionsSection.test.tsx`: every row of D6's
    table, order, hrefs, nested list inside the item, `lang="ru"`, copy verbatim.
- [ ] 5.3 (FR-2, FR-8, NFR-3) `src/app/(public)/authors/[id]/page.tsx` composes
  `PublicCollectionsSection` and `AuthorPoemsEntry` into `AuthorPage`'s `poems` slot (design D6).
  - Verify with the route test / `npm run typecheck`; `authors/` unchanged.

## 6. Public collection page and its trail <!-- UI: mockups approved, artboards 38–39 --> <!-- judgement-heavy -->

- [ ] 6.1 (FR-5, FR-8, NFR-4, NFR-6, NFR-7, NFR-8) `PublicCollectionPage`, `PublicCollectionContent`,
  `PublicCollectionSkeleton`; `poems` exports `authorPoemPath` (design D7).
  - Verify with component tests: author not-found → `notFound`, unavailable → throws; collection
    not-found → `notFound`, unavailable → throws; render with and without description (paragraphs,
    line breaks), poem hrefs, no buttons, skeleton, copy verbatim.
- [ ] 6.2 (FR-5, NFR-5) Route `src/app/(public)/authors/[id]/collections/[collectionId]/page.tsx`.
- [ ] 6.3 (FR-6) Breadcrumbs: `author-collection` match and trail; slot page
  `src/app/@breadcrumbs/authors/[id]/collections/[collectionId]/page.tsx` (design D8).
  - Verify with `breadcrumbs/tests/model/match-route.test.ts` and `build-trail.test.ts` (every rule
    of the breadcrumbs delta) and `app/tests/breadcrumbs-slot.test.ts`.

## 7. Docs and verification <!-- isolated -->

- [ ] 7.1 (NFR-3) `docs/architecture.md`: the `collections` feature, its imports, the allowed-imports
  list (line 95), `shared/config/cache-tags.ts`, the new routes; `docs/state-management.md`: one
  public tag per author covering poems and collections, collection writes expire it, the owner's
  pages still read uncached.
- [ ] 7.2 (NFR-3; Non-goals, Gate 1 P5) `docs/deferred.md`: the four copies of the free-poem and ordering
  rules for the drag-and-drop change; the optional switch of the owner's pages to the public reads.
- [ ] 7.3 (FR-1 – FR-8) Gate 3 (web-qa) as a guest, a signed-in reader, and the owner: author page
  sections in every state reachable in dev (collections, free only, all collected, no poems); the
  collection page, its trail, 404 for an empty and another author's collection; after the author
  saves a collection's poems, edits, and deletes a collection, the guest's reload follows. Record
  "guest sees a collection and opens its page" as a scenario under `tests/web-qa-scenarios`.
- [ ] 7.4 (NFR-5) `npm run build` with no env: the new route listed with `/authors/[id]/poems/[poemId]`'s
  marker, `/authors/[id]/collections` absent, no other marker changed.
- [ ] 7.5 (FR-1 – FR-8, NFR-1 – NFR-9) Run `npm run typecheck && npm run lint && npm run test:coverage && npm run build && npm run knip`.
