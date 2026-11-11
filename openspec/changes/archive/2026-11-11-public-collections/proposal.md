# Proposal

## Why

Collections were built as the author's private groups (`add-poem-collections`, ADR 0011, ADR 0012):
a guest sees one flat list of the author's poems and nothing about collections. That was a gap in
the original request, not the intent (user decision, 2026-11-10): an author groups poems into
collections so that readers see them grouped. Everything a collection shows — its title, its
description, its poems, and which poems belong to it — is public; only managing it (create, edit,
delete, choosing its poems) stays the author's own.

This change comes before drag-and-drop ordering (user decision, 2026-11-10: "сначала публичные
сборники"), which will then reorder what readers already see grouped.

## What Changes

- **Collections become public.** A collection of a public author that holds at least one poem is
  visible to every visitor, signed in or not: its title, description, and poems. An empty
  collection stays hidden from everyone but its author (user decision, 2026-11-10: "гостю
  показываем только непустые"). Which collection a poem belongs to becomes public with it.
  **BREAKING** for the privacy rule of `add-poem-collections` / `add-poems-to-collections` (ADR 0011
  for collections, ADR 0012): superseded by a new ADR.
- **Author page `/authors/<id>`** mirrors the author's own `/account/poems` (user decision,
  2026-11-10: "публичный список должен полностью повторять отображение у автора"):
  - first the level-2 section «Сборники произведений»: every non-empty collection, newest first,
    its title as a link to the collection's public page, and under it its poems, newest first,
    each its title as a link to the poem's public page; with no non-empty collection, no section;
  - then the existing level-2 section «Произведения», now listing only the free poems, newest
    first. With no poems at all, it keeps «У автора пока ещё нет публикаций.»; when every poem is
    in a collection, the section is not rendered;
  - when the poems can't be read, «Произведения» shows «Произведения сейчас недоступны.» and the
    collections section is not rendered; when only the collections can't be read and the author
    has poems in collections, the collections section shows «Сборники сейчас недоступны.» and the
    free poems are still listed.
- **New public collection page `/authors/<id>/collections/<collectionId>`** (user decision,
  2026-11-10): the collection's title as the level-1 heading, its description in paragraphs (as on
  the author's own collection page), then the level-2 heading «Произведения» and the collection's
  poems, newest first, each its title as a link to the poem's public page. No buttons. An unknown,
  malformed, or another author's id, an empty collection, or an author who isn't public renders
  the 404 page; a failed read shows the error screen; a skeleton while loading. Same for every
  visitor.
- **Breadcrumbs** of the new page: «Главная» › «Наши авторы» › `<author name>` › `<collection
  title>`, the author's name linking to `/authors/<id>`.
- **Freshness.** After the author edits or deletes a collection, saves a collection's poems, or
  creates, edits, or deletes a poem, the next request for the public author page and the public
  collection page shows the result, with no wait for a cache lifetime. Deleting a collection
  refreshes the public pages always, even while the author's profile isn't public (user decision,
  2026-11-10, after Gate 1). Creating a collection changes nothing public: it starts empty.
- **Unchanged:** the public poem page (user decision, 2026-11-10: no collection line), every
  account page, every write and its limits, and who may write. Guests still can't reach any
  `/account/...` page.
- Out of scope: ordering by drag-and-drop (the next change); a public list of all collections
  across authors; collections in search; a collection line on the poem page; switching the
  author's own pages to the new public reads.

## Capabilities

### New Capabilities

- `public-collections`: what a visitor sees of an author's collections — the author page's
  collections section, the public collection page and its 404 / error / loading states, which
  collections are visible, and their freshness after a write.

### Modified Capabilities

- `author-poems`: the author page's «Произведения» section lists free poems only, sits after the
  collections section, and is left out when every poem is in a collection (FR-1); the poems read
  carries each poem's collection (add-poem-creation FR-9); the one cached read per author also
  covers collections and is expired by collection writes (add-poem-creation NFR-4).
- `collection-management`: membership is no longer private (add-poems-to-collections FR-1); the
  database rule lets anyone read a public author's non-empty collections and poem membership,
  writes unchanged (NFR-1, add-poems-to-collections NFR-1); every collection write keeps the public
  pages fresh (FR-15); the boundary rule allows the shared per-author cache tag (NFR-3).
- `poem-management`: the database rule makes a poem's collection readable with the poem
  (NFR-1); the cache tag moves to `shared/config` (no behaviour change).
- `breadcrumbs`: the trail of the public collection page.

## UI copy

| Key | Text |
| --- | --- |
| Author page: collections section heading | `Сборники произведений` (the existing text of `/account/poems`) |
| Author page: collections unavailable | `Сборники сейчас недоступны.` |
| Author page: free poems heading, empty, unavailable | `Произведения`, `У автора пока ещё нет публикаций.`, `Произведения сейчас недоступны.` (the existing texts) |
| Collection page: poems heading | `Произведения` (the existing text) |
| Collection page: breadcrumb's last item | the collection's title |
| 404 and error screens | the existing ones |

## Mockups

Approved Claude Design canvas (2026-11-10): https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#page-dcb81aee8d83,
artboards 38–39, each in light and dark at 1280 px and 375 px. Every text matches the UI copy table
above, and the artboards use only existing tokens and primitives; the collections section repeats
artboard 37's look (`/account/poems`), as FR-2 requires.

| Screen | Artboard |
| --- | --- |
| Author page 1–3: collections and free poems, collections only, free poems only | 38 · `/authors/[id]` — сборники произведений (`AuthorPublicCollections.dc.html`) |
| Author page 4–6: no poems, collections unavailable, poems unavailable | 38 · `/authors/[id]` — нет публикаций, недоступно (`AuthorPublicStates.dc.html`) |
| Collection page 1–3: with description, without description, loading | 39 · `/authors/[id]/collections/[collectionId]` (`CollectionPublic.dc.html`) |

The 404 and error screens are the existing ones (artboards 13 and 15).

## Requirements

Each requirement is specified with its scenarios in the delta specs. Summary:

| ID | Requirement | Spec |
| --- | --- | --- |
| FR-1 | A public author's non-empty collections, their poems, and membership are public; empty ones are not (modifies add-poems-to-collections FR-1) | public-collections, collection-management |
| FR-2 | Author page: the «Сборники произведений» section with each non-empty collection and its poems | public-collections |
| FR-3 | Author page: «Произведения» lists free poems only, after the collections; left out when every poem is in a collection (modifies author-poems FR-1) | author-poems |
| FR-4 | Author page: a failed poems or collections read | public-collections, author-poems |
| FR-5 | Public collection page: heading, description, poems; 404, error, loading | public-collections |
| FR-6 | Breadcrumb trail of the public collection page | breadcrumbs |
| FR-7 | Public pages fresh after every collection and poem write (modifies collection-management FR-15) | public-collections, collection-management |
| FR-8 | Same content for every visitor, no sign-in, no redirect | public-collections |
| NFR-1 | Database: anyone reads a public author's non-empty collections and poem membership; writes unchanged (modifies collection-management NFR-1, add-poems-to-collections NFR-1, poem-management NFR-1) | collection-management, poem-management |
| NFR-2 | One cached read per author covers poems and collections, one tag, expired by every write of either (modifies add-poem-creation NFR-4) | author-poems, public-collections |
| NFR-3 | Module boundaries: a new public `collections` feature; no cycle; `collection-management` still imports neither `poems` nor `poem-management` (modifies collection-management NFR-3) | public-collections, collection-management |
| NFR-4 | Server-rendered and session-free public pages | public-collections |
| NFR-5 | Rendering modes: the new route is partially prerendered like the poem page; the build needs no env | public-collections |
| NFR-6 | Accessible headings, nested lists, and links | public-collections |
| NFR-7 | Design tokens only | public-collections |
| NFR-8 | Russian UI copy verbatim | public-collections |
| NFR-9 | Logs carry no titles or ids | public-collections |

## Impact

- **Database**: a new migration — an RLS select policy on `collections` for `anon` and
  `authenticated` (a public author's collection that holds a poem), the column grant on
  `collections` extended to `anon`, a select grant on `poems.collection_id` for `anon` and
  `authenticated`, and `delete_my_collection` also returning the deleted row's author. Write functions, limits, and the owner's read functions unchanged. pgTAP updated
  (`collections.test.sql`, `collection_poems.test.sql`).
- **Code**: new feature `src/features/collections/` (the public reads, the author page's
  collections section, the public collection page, its skeleton); `src/features/poems/` (the poem
  read selects `collection_id`, `Poem.collectionId`, «Произведения» lists free poems);
  `src/features/collection-management/` (every successful write also expires the author's public
  tag); `src/features/poem-management/` (imports the tag from its new home);
  `src/shared/config/` (the per-author cache tag); `src/features/breadcrumbs/` (one trail); a new
  route file and breadcrumb slot page under `src/app/(public)/` and `src/app/@breadcrumbs/`; the
  author route composes the collections section.
- **Docs**: new ADR superseding ADR 0012 and amending ADR 0011 for collections;
  `CONTEXT.md` (Collection and Free poem no longer private); `docs/architecture.md`;
  `docs/state-management.md`.
- **Deploy**: `npx supabase db push` for the new migration (`docs/environment.md`'s deploy
  checklist).
- **Mockups**: a Claude Design brief after Gate 2 and the test plan.
