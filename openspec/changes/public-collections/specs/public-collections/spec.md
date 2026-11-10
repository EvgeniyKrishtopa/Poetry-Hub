## Purpose

What a visitor sees of an author's collections: the collections section on the public author page, the public collection page, which collections are visible, and how fast they follow the author's writes.

## ADDED Requirements

### Requirement: Which collections are public (FR-1)
A collection SHALL be visible to every visitor — signed out, signed in as another reader, or signed in as its author — exactly when its author's profile is public and it holds at least one poem (user decision, 2026-11-10). A visible collection SHALL show its title, its description, and its poems; which collection a poem belongs to SHALL be visible with it. An empty collection, and every collection of a profile that isn't public, SHALL NOT be shown on any public page. Creating, editing, deleting a collection and choosing its poems SHALL stay possible only for its author, on the account pages.

#### Scenario: Empty collection stays hidden
- **GIVEN** a public author with the empty collection «Весна» and the collection «Осенний цикл» holding «Ночной вокзал»
- **WHEN** a guest opens `/authors/<id>`
- **THEN** «Осенний цикл» is listed and «Весна» is not
- **AND** opening «Весна»'s public address renders the 404 page

#### Scenario: Collection becomes visible with its first poem
- **GIVEN** the empty collection «Весна» of a public author
- **WHEN** its author adds «Первый снег» to it and a guest then opens `/authors/<id>`
- **THEN** «Весна» is listed with «Первый снег» under it

#### Scenario: Collection hidden again when its last poem leaves
- **GIVEN** «Весна» holds only «Первый снег»
- **WHEN** its author removes «Первый снег» from it, or deletes «Первый снег», and a guest then opens `/authors/<id>`
- **THEN** «Весна» is not listed

#### Scenario: Author not public
- **GIVEN** an author whose profile isn't public, with a non-empty collection
- **WHEN** a guest opens that collection's public address
- **THEN** the 404 page renders

### Requirement: Collections section on the author page (FR-2)
On `/authors/<id>` for a public author with at least one visible collection, below the profile (after the about section, or after the photo when there is no about) and before the «Произведения» section, the page SHALL show a section with the level-2 heading «Сборники произведений» and a list with one item per visible collection, newest created first. Each item SHALL show the collection's title as a link to `/authors/<id>/collections/<collectionId>`, and under it a nested list of the collection's poems, newest created first, each only its title as a link to `/authors/<id>/poems/<poemId>`. No description, date, or count SHALL be shown in the section. With no visible collection, the section SHALL NOT be rendered. The section SHALL look like the collections section of `/account/poems`.

#### Scenario: Collections with their poems
- **GIVEN** a public author with «Осенний цикл» (created 2026-10-01) holding «Ночной вокзал» (created 2026-10-02) and «Осенний сад» (created 2026-10-01), and «Весна» (created 2026-10-05) holding «Первый снег»
- **WHEN** a guest opens `/authors/<id>`
- **THEN** a level-2 heading «Сборники произведений» is followed by «Весна» with «Первый снег» under it, then «Осенний цикл» with «Ночной вокзал», «Осенний сад» under it, in that order
- **AND** «Весна» links to `/authors/<id>/collections/<its id>`, and «Ночной вокзал» links to `/authors/<id>/poems/<its id>`

#### Scenario: No visible collection
- **GIVEN** a public author with free poems and only empty collections
- **WHEN** a guest opens `/authors/<id>`
- **THEN** no «Сборники произведений» heading or list exists, and the «Произведения» section lists the free poems

#### Scenario: Following a collection title
- **GIVEN** a guest on `/authors/<id>` with a visible collection
- **WHEN** they activate the collection's title
- **THEN** the collection's public page opens

### Requirement: Failed reads on the author page (FR-4)
When the author's poems can't be read, the «Сборники произведений» section SHALL NOT be rendered (the «Произведения» section shows its own unavailable text, author-poems FR-1). When the poems read but the collections can't, and at least one of the author's poems is in a collection, the section SHALL show the heading «Сборники произведений» and the text «Сборники сейчас недоступны.» and no list, and the «Произведения» section SHALL still list the free poems; when no poem is in a collection, the section SHALL NOT be rendered. The rest of the page SHALL still render in every case.

#### Scenario: Collections unavailable
- **GIVEN** a public author with the free poem «Первый снег» and «Ночной вокзал» in a collection, and a collections read that fails because the database is unreachable
- **WHEN** a guest opens `/authors/<id>`
- **THEN** the heading «Сборники произведений» and «Сборники сейчас недоступны.» are shown with no list, and the «Произведения» list holds «Первый снег»

#### Scenario: Collections unavailable, nothing collected
- **GIVEN** a public author whose poems are all free, and a collections read that fails
- **WHEN** a guest opens `/authors/<id>`
- **THEN** no «Сборники произведений» heading exists and the «Произведения» list holds every poem

#### Scenario: Poems unavailable
- **GIVEN** a public author with a visible collection, and a poems read that fails
- **WHEN** a guest opens `/authors/<id>`
- **THEN** no «Сборники произведений» heading exists, and «Произведения сейчас недоступны.» is shown

### Requirement: Public collection page (FR-5)
`/authors/<id>/collections/<collectionId>` for a visible collection of that author SHALL show the collection's title as the level-1 heading; its description, when it has one, split into paragraphs on blank lines with a single line break inside a paragraph shown as a line break; then the level-2 heading «Произведения» and a list of the collection's poems, newest created first, each only its title as a link to `/authors/<id>/poems/<poemId>`. The page SHALL show no button and no link to the account pages. An author id that is unknown, malformed, or not public, and a collection id that is unknown, malformed, not lowercase, another author's, or of an empty collection, SHALL render the 404 page. A failed read of the author or the collection SHALL show the generic error screen. While loading, the page SHALL show a skeleton. `/authors/<id>/collections` SHALL render the 404 page.

#### Scenario: Visible collection
- **GIVEN** a public author's collection «Осенний цикл» with the description «Стихи октября\nи ноября\n\nБез посвящений», holding «Ночной вокзал» (created 2026-10-02) and «Осенний сад» (created 2026-10-01)
- **WHEN** a guest opens its public page
- **THEN** the level-1 heading «Осенний цикл» is followed by two paragraphs, the first on two lines «Стихи октября» / «и ноября», the second «Без посвящений»
- **AND** then the level-2 heading «Произведения» and the links «Ночной вокзал», «Осенний сад», in that order, each to `/authors/<id>/poems/<its id>`
- **AND** no «Редактировать сборник», «Произведения сборника», or «Удалить сборник» control exists

#### Scenario: No description
- **GIVEN** a visible collection stored without a description
- **WHEN** a guest opens its public page
- **THEN** the heading is followed directly by «Произведения» and the list, with no empty paragraph

#### Scenario: Another author's collection
- **GIVEN** public authors A and B, and a visible collection of B
- **WHEN** a guest opens `/authors/<A's id>/collections/<B's collection id>`
- **THEN** the 404 page renders

#### Scenario: Read fails
- **GIVEN** the database can't be reached
- **WHEN** a guest opens a collection's public page
- **THEN** the generic error screen is shown

#### Scenario: Following a poem
- **GIVEN** a guest on a visible collection's public page
- **WHEN** they activate a poem title
- **THEN** that poem's public page opens, unchanged by this change

### Requirement: Public pages fresh after a write (FR-7)
After the author edits or deletes a collection, saves a collection's poems, or creates, edits, or deletes a poem, the next server request for the author's public page and for any of their public collection pages SHALL show the result, with no wait for a cache lifetime. A visitor whose browser already shows the old page SHALL see the change after reloading it. A refused or failed write SHALL change nothing on the public pages.

#### Scenario: Poems moved between a collection and the free list
- **GIVEN** a guest showing `/authors/<id>`, where «Первый снег» is free and «Ночной вокзал» is in «Осенний цикл»
- **WHEN** the author saves «Осенний цикл»'s poems with «Первый снег» added and «Ночной вокзал» removed, and the guest reloads
- **THEN** «Осенний цикл» lists «Первый снег», and the «Произведения» list holds «Ночной вокзал»

#### Scenario: Description edited
- **GIVEN** a guest showing a collection's public page
- **WHEN** the author changes its description and the guest reloads
- **THEN** the new description is shown

#### Scenario: Poem renamed
- **GIVEN** a guest showing a collection's public page that lists «Первый снег»
- **WHEN** the author renames that poem «Первый снег.» and the guest reloads
- **THEN** the collection's list shows «Первый снег.»

#### Scenario: Delete while the profile isn't public
- **GIVEN** a guest showing `/authors/<id>` with the visible collection «Осенний цикл», whose author then clears their last name, deletes «Осенний цикл», and fills the last name in again
- **WHEN** the guest reloads
- **THEN** «Осенний цикл» is not listed, its public address renders the 404 page, and its poems are in the «Произведения» list

#### Scenario: Refused save
- **GIVEN** an author over the collection poems save limit
- **WHEN** their save is refused
- **THEN** the public pages show what they showed before

### Requirement: Same for every visitor (FR-8)
The author page's collections section and the public collection page SHALL render without signing in, SHALL NOT redirect to `/login`, and SHALL show identical content to a guest, to a signed-in reader who doesn't own the profile, and to its owner.

#### Scenario: Guest, reader, and owner
- **GIVEN** a visible collection, a signed-out visitor, a signed-in reader who isn't its author, and its author signed in
- **WHEN** each opens the collection's public page and the author's public page
- **THEN** none is redirected, and all three see the same headings, texts, and links in the same order

### Requirement: One cached read of collections per author (NFR-2)
An author's visible collections SHALL be read through one cached entry per author, carrying the same tag as the author's poems entry (author-poems, add-poem-creation NFR-4), shared by the author page, every public collection page, and their trails. A successful read SHALL be kept for hours, a failed one for seconds only. A collection page and its trail SHALL share one result per request, so they can't disagree. An id that isn't a UUID SHALL open no cache entry and read nothing.

#### Scenario: One read for page and trail
- **GIVEN** a cold cache
- **WHEN** a guest opens a collection's public page
- **THEN** the collections table is read once and the poems table once for that request

#### Scenario: Failure is short-lived
- **GIVEN** a collections read that failed because the database was unreachable, and the database is back
- **WHEN** the author page is requested again after a few seconds
- **THEN** the collections section lists the visible collections

### Requirement: Public collections module boundaries (NFR-3)
The public side of collections SHALL be its own feature, imported only through its public API by `breadcrumbs` and the route files. It SHALL read poems only through `poems`' public API and authors only through `authors`' public API, and SHALL import nothing from `auth`, `collection-management`, or `poem-management`. `poems` and `authors` SHALL NOT import it. The one cache tag of an author's public works SHALL live in `shared/config`, used by `poems`, `poem-management`, `collection-management`, and this feature, so that `collection-management` still imports nothing from `poems`. The author route SHALL compose the collections section and the poems section into the author page's existing slot.

#### Scenario: Static check
- **GIVEN** the change is complete
- **WHEN** `src/features/collections/` is searched for `@/features/auth`, `@/features/collection-management`, and `@/features/poem-management`, and `src/features/poems/` and `src/features/authors/` for `@/features/collections`
- **THEN** there are no matches

### Requirement: Server-rendered and session-free (NFR-4)
The public collections feature SHALL contain no `"use client"` module and SHALL import nothing from `@/shared/lib/supabase/server` or `@/shared/lib/supabase/session`: it reads collections only through the cookie-less public client, as the anon role.

#### Scenario: Static check
- **GIVEN** the change is complete
- **WHEN** `src/features/collections/` is searched for `"use client"` and for imports of `@/shared/lib/supabase/server` and `@/shared/lib/supabase/session`
- **THEN** there are no matches

### Requirement: Rendering modes of the public collection route (NFR-5)
`npm run build` SHALL succeed with no Supabase or Contentful environment variables. Its route list SHALL include `/authors/[id]/collections/[collectionId]`, carrying the same render-mode marker as `/authors/[id]/poems/[poemId]`, and SHALL NOT include `/authors/[id]/collections`. Every other route SHALL keep the render-mode marker it has on `main` (spec-clarify, 2026-11-10: any change, `/authors/[id]` included, is a failure to investigate).

#### Scenario: Build without env
- **GIVEN** no `NEXT_PUBLIC_SUPABASE_*` and no `CONTENTFUL_*` variables are set
- **WHEN** `npm run build` runs
- **THEN** it exits 0, its route list equals `main`'s plus `/authors/[id]/collections/[collectionId]`, and that route's marker equals `/authors/[id]/poems/[poemId]`'s

### Requirement: Accessible public collections (NFR-6)
The section and the page SHALL keep a correct heading order (the author's or the collection's level-1 heading, then level-2 headings), the nested poem list SHALL be a list inside its collection's list item, every link's accessible name SHALL be its visible title, the poem and collection text SHALL be marked as Russian, and every link SHALL show a visible focus outline.

#### Scenario: Keyboard and screen reader
- **GIVEN** a guest using only the keyboard on `/authors/<id>` with a visible collection
- **WHEN** they tab through the collections section
- **THEN** focus reaches each collection title and then each of its poem titles in reading order, each with a visible outline, and a screen reader announces the poem list as nested in the collection's item

### Requirement: Design tokens only (NFR-7)
The section, the page, and its skeleton SHALL use only the existing design tokens and UI primitives; no raw colour, spacing, or font value SHALL be added.

#### Scenario: Static check
- **GIVEN** the change is complete
- **WHEN** `src/features/collections/` is searched for hex colours, `rgb(`, and arbitrary Tailwind colour values
- **THEN** there are no matches

### Requirement: Russian UI copy verbatim (NFR-8)
Every user-facing text SHALL match the proposal's UI copy table exactly: «Сборники произведений», «Сборники сейчас недоступны.», «Произведения».

#### Scenario: Copy check
- **GIVEN** the change is complete
- **WHEN** the feature's copy constants are compared with the proposal's UI copy table
- **THEN** every text matches character for character

### Requirement: No titles or ids in logs (NFR-9)
A failed public collections read SHALL log one line with the feature prefix, the operation, and the error kind only — never a collection or poem title, description, or id, and never an author id.

#### Scenario: Failure log
- **GIVEN** a collections read that fails because the database is unreachable
- **WHEN** a guest opens the author page
- **THEN** exactly one line `[collections] read public collections failed: <kind>` is logged, holding no id, title, or description
