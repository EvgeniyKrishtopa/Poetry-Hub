# Test Plan

One row per acceptance criterion (a scenario's THEN) in this change's spec deltas. Levels:
**unit** (one module, its collaborators mocked), **integration** (a real local service: the
Supabase database through pgTAP, or a full Next build), **end-to-end** (a real browser against the
dev server: Gate 3 and recorded scenarios). Requirement IDs are this change's (`proposal.md`); a
MODIFIED block of an existing capability names its own ID in brackets. A criterion carried over
unchanged inside a MODIFIED block is closed by its existing test, which must keep passing; those
rows say "existing".

## public-collections

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| FR-1 | Empty collection stays hidden: «Осенний цикл» listed, «Весна» not | `collections.test.sql`: anon reads the non-empty one, not the empty one; `nest-public-collections` test: an empty collection is dropped | integration, unit |
| FR-1 | Empty collection's public address → 404 | `PublicCollectionContent` test: `getPublicCollection` not-found → `notFound()`; `public-collections` DAL test: a collection absent from the read is not-found | unit |
| FR-1 | Collection becomes visible with its first poem | `collections.test.sql`: after a save adds a poem, anon reads the collection; Gate 3: guest reload after the save | integration, end-to-end |
| FR-1 | Hidden again when its last poem leaves (removed or deleted) | `collections.test.sql`: after a remove and after a poem delete, anon reads nothing; `nest-public-collections` test: a stale entry whose poem is gone drops the collection | integration, unit |
| FR-1 | Author not public → 404 | `collections.test.sql`: anon reads nothing of a non-public author; `PublicCollectionContent` test: author not-found → `notFound()` | integration, unit |
| FR-2 | Collections with their poems: order, nesting, hrefs | `PublicCollectionsSection` test: two collections newest first, poems newest first nested in the item's `<ul>`, collection and poem hrefs; `public-collections` DAL test: `order created_at desc, id asc` | unit |
| FR-2 | No visible collection → no section, free poems listed | `PublicCollectionsSection` test: ok + `[]` → `null`; `AuthorPoemsEntry` test: free list shown | unit |
| FR-2 | Following a collection title opens its page | Gate 3: click the title on `/authors/<id>`; recorded scenario "guest sees a collection and opens its page" | end-to-end |
| FR-4 | Collections unavailable, poems in collections: heading + «Сборники сейчас недоступны.», free list still shown | `PublicCollectionsSection` test: `collections-unavailable` + `hasCollectedPoems: true`; `AuthorPoemsEntry` test: free list independent of the collections read | unit |
| FR-4 | Collections unavailable, nothing in a collection → no section, every poem listed | `PublicCollectionsSection` test: `collections-unavailable` + `hasCollectedPoems: false` → `null` | unit |
| FR-4 | Poems unavailable → no section, «Произведения сейчас недоступны.» | `PublicCollectionsSection` test: `poems-unavailable` → `null`; `AuthorPoemsEntry` test (existing unavailable case) | unit |
| FR-5 | Visible collection: h1, two paragraphs with line break, h2 «Произведения», links in order, no management controls | `PublicCollectionContent` test: heading levels, paragraphs and `whitespace-pre-line`, link order and hrefs, no button or account link | unit |
| FR-5 | No description → no empty paragraph | `PublicCollectionContent` test: `description: null` | unit |
| FR-5 | Another author's collection → 404 | `public-collections` DAL test: the id is not in author A's read → not-found; `collections.test.sql`: the read filters by `author_id` | unit, integration |
| FR-5 | Read fails → error screen | `PublicCollectionContent` test: unavailable (author or collection) → throws | unit |
| FR-5 | Following a poem opens its unchanged public page | Gate 3: click a poem title on the collection page | end-to-end |
| FR-5 | Malformed, uppercase, or unknown id → 404; `/authors/<id>/collections` → 404 | `public-collections` DAL test: UUID guard and lowercase rule; NFR-5 build check (no `/authors/[id]/collections` route) | unit, integration |
| FR-5 | Skeleton while loading | `PublicCollectionSkeleton` test: renders the bars; `PublicCollectionPage` test: Suspense fallback is the skeleton | unit |
| FR-7 | Poems moved between a collection and the free list after a save | `save-collection-poems` action test: `updateTag(authorWorksTag(id))` on `saved`; Gate 3: guest reload follows | unit, end-to-end |
| FR-7 | Description edited → new description after reload | `update-collection` action test: tag expired on `updated`; Gate 3 | unit, end-to-end |
| FR-7 | Poem renamed → collection list shows the new title | `poem-management` update action test: `updateTag(authorWorksTag(id))`; `public-collections` DAL test: the collections entry carries `authorWorksTag` | unit |
| FR-7 | Delete while the profile isn't public still refreshes the public pages | `delete-collection` action test: `deleted` with a non-public owner → tag expired with the returned `author_id`; `collection-writes` DAL test: `author_id` parsed | unit |
| FR-7 | Refused save changes nothing public | `save-collection-poems` action test: over the limit, not-public, not-found, `stale`, failure → no `updateTag` | unit |
| FR-8 | Guest, reader, and owner see the same pages, no redirect | `boundaries` test (no session read in `collections`); Gate 3: same page as a guest, another reader, and the owner | unit, end-to-end |
| NFR-2 | One read of each table for page and trail | `public-collections` DAL test: `getPublicCollection` called twice in one request reads once (React `cache` memo); Gate 3 / dev log probe in the scratchpad | unit, end-to-end |
| NFR-2 | Failure is short-lived | `public-collections` DAL test: failure → `cacheLife("seconds")`, success → `"hours"`, tag set either way | unit |
| NFR-3 | No forbidden imports in `collections`; `poems` and `authors` don't import it | `collections/tests/boundaries.test.ts`; `poems/tests/boundaries.test.ts` | unit |
| NFR-4 | No `"use client"`, no cookie or session client | `collections/tests/boundaries.test.ts` | unit |
| NFR-5 | Build without env: new route with the poem route's marker, no `/authors/[id]/collections`, every other marker as on `main` | `npm run build` with no env, route list compared with `main`'s (task 7.4) | integration |
| NFR-6 | Keyboard order, focus outline, nested list announced | `PublicCollectionsSection` test: nested `<ul>` inside the `<li>`, `focus-visible:outline` classes, `lang="ru"`; Gate 3: tab through the section | unit, end-to-end |
| NFR-7 | No raw colours in `collections` | `collections/tests/boundaries.test.ts`: no hex, `rgb(`, or arbitrary colour classes | unit |
| NFR-8 | Copy verbatim | `public-collections-messages` test against the proposal's UI copy table | unit |
| NFR-9 | One failure log line, no id, title, or description | `public-collections` DAL test: `console.error` called once with `[collections] read public collections failed: <kind>` and no id or title | unit |

## author-poems

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| FR-3 [FR-1] | Author with free poems: heading, two links in order, no extra content | `AuthorPoemsEntry` test (existing case, fixtures with `collectionId: null`) | unit |
| FR-3 [FR-1] | Free poems only; collections section before «Произведения» | `uncollected-poems` test; `AuthorPoemsEntry` test: collected poem not listed; author route test or Gate 3: section order | unit, end-to-end |
| FR-3 [FR-1] | Every poem in a collection → «Произведения» not rendered | `AuthorPoemsEntry` test: all `collectionId` set → `null` | unit |
| FR-3 [FR-1] | Author without poems: heading + empty text, no collections section | `AuthorPoemsEntry` test (existing); `PublicCollectionsSection` test: ok + `[]` → `null` | unit |
| FR-4 [FR-1] | Poems unavailable: unavailable text, no collections section | `AuthorPoemsEntry` test (existing); `PublicCollectionsSection` test: `poems-unavailable` → `null` | unit |
| FR-3 [FR-1] | Placement without about; following a title; same for owner and readers | existing `AuthorPageContent` / `AuthorPoemsEntry` / public-access tests | unit |
| NFR-2 [NFR-4] | One entry serves both areas; failure short-lived; public pages after a poem delete | existing `author-poems` DAL tests, tag renamed to `authorWorksTag` | unit |
| NFR-2 [NFR-4] | After a collection poems save, the guest sees the new grouping | `save-collection-poems` action test (tag on `saved`); `author-poems` and `public-collections` DAL tests (both entries carry `authorWorksTag`); Gate 3 | unit, end-to-end |
| NFR-2 [NFR-4] | Create collection does not expire the tag | `create-collection` action test: no `updateTag` on `created` | unit |
| FR-1 | Poems read maps `collection_id` | `author-poems` DAL test: with and without `collection_id`; malformed → `unavailable` | unit |

## collection-management

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| FR-1 [add-poems-to-collections FR-1] | Deleting a collection frees its poems; deleting a poem; new poem is free | existing tests and pgTAP | unit, integration |
| FR-1 [add-poems-to-collections FR-1] | Public pages show membership | `PublicCollectionsSection` test; Gate 3 | unit, end-to-end |
| FR-1 [add-poems-to-collections FR-1] | Poem's own public page unchanged | existing `PoemPageContent` tests unchanged; Gate 3 | unit, end-to-end |
| NFR-1 [NFR-1] | Direct calls: anon and another author see only non-empty collections of a public owner; owner also sees empty; writes fail; update/delete `not-found` | `collections.test.sql` | integration |
| NFR-1 [NFR-1] | Hidden collections: empty, emptied by a poem delete, non-public owner | `collections.test.sql` | integration |
| NFR-1 [NFR-1] | Owner pages never list another author's collections | `own-collections` DAL test: `.eq("author_id", own)` on both reads (task 1.4) | unit |
| NFR-1 [add-poems-to-collections NFR-1] | Every role reads `collection_id` of a public author's poems; direct updates fail; save and owner reads unchanged | `collection_poems.test.sql` | integration |
| NFR-1 [add-poems-to-collections NFR-1] | Malformed save input → 22023 | existing `collection_poems.test.sql` cases | integration |
| NFR-1 | `delete_my_collection` returns `author_id` on `deleted`, `not-found` otherwise | `collections.test.sql` | integration |
| FR-7 [FR-15] | Back after a delete (owner pages) | existing tests and recorded scenario | unit, end-to-end |
| FR-7 [FR-15] | Public page after a delete: collection gone, poems free, address 404 | `delete-collection` action test (tag); Gate 3 | unit, end-to-end |
| FR-7 [FR-15] | Public page after an edit: new heading | `update-collection` action test (tag); Gate 3 | unit, end-to-end |
| NFR-3 [NFR-3] | Static check: no `poems`, `poem-management`, `collections`, `navigator.onLine` in `collection-management`; `beforeunload` once | `collection-management/tests/boundaries.test.ts` (adds `@/features/collections`) | unit |
| NFR-3 [NFR-3] | One membership read per `/account/poems` request | existing test | unit |
| FR-7 | A throwing `updateTag` is logged and the write still succeeds | `expire-author-works-tag` test; one action test with `updateTag` throwing | unit |

## poem-management

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| NFR-1 [NFR-1] | Collection of a non-public author's poem not readable | `collection_poems.test.sql` / `poems.test.sql` | integration |
| NFR-1 [NFR-1] | Collection of a public author's poem readable by every caller; other columns unchanged | `collection_poems.test.sql` | integration |
| NFR-1 [NFR-1] | Collection not changeable directly | `collection_poems.test.sql` | integration |
| NFR-1 [NFR-1] | Every other scenario of the block (insert, update, delete, illustrations, hidden author, editing keeps the collection) | existing `poems.test.sql` and `collection_poems.test.sql` | integration |
| NFR-2 | Poem writes expire `authorWorksTag` | poem-management's three action tests, tag renamed | unit |

## breadcrumbs

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| FR-6 | Collection trail: four items, author linked, title current | `match-route` test (`author-collection`); `build-trail` test; `Breadcrumbs` render test | unit |
| FR-6 | Hidden or unknown collection → 404, no trail | `build-trail` test: not-found → no trail | unit |
| FR-6 | Author read unavailable → «Автор» current, error screen | `build-trail` test; `PublicCollectionContent` test (throws) | unit |
| FR-6 | Collection read unavailable → author name current | `build-trail` test | unit |
| FR-6 | `/authors/<id>/collections` → no trail | `match-route` test: two segments → no match | unit |
| FR-6 | Slot page exists | `app/tests/breadcrumbs-slot.test.ts` | unit |
