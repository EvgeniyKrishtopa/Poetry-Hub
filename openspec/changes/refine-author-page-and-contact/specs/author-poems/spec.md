## RENAMED Requirements

- FROM: `### Requirement: Poems entry on the author page (FR-1)`
- TO: `### Requirement: Poem list on the author page (FR-1)`

## MODIFIED Requirements

### Requirement: Poem list on the author page (FR-1)
On `/authors/<id>` for a public author, below the profile (after the about section, or after the photo when there is no about), the page SHALL show a section with the level-2 heading «Произведения» followed by exactly one of: a list with one item per poem of that author, newest publication date first, each item showing only the poem's title as a link to `/authors/<id>/poems/<poemId>`; or, when the author has no poems, the text «У автора пока ещё нет публикаций.» and no list (refine-author-page-and-contact FR-5). The section SHALL keep the former list page's look (title links in the regular text colour, accent on hover, and the same spacing). It SHALL be the same for every visitor: signed out, signed in as another reader, or signed in as the owner. The page SHALL show no link to `/authors/<id>/poems`.

#### Scenario: Author with poems
- **GIVEN** a public author whose poems are «Осенний сад» (published 2026-03-12) and «Ночной вокзал» (published 2026-07-01)
- **WHEN** an anonymous visitor opens `/authors/<id>`
- **THEN** after the about section, a level-2 heading «Произведения» is followed by a list of two links, in order, «Ночной вокзал» then «Осенний сад», each with `href="/authors/<id>/poems/<that poem's id>"`
- **AND** no poem text, date, genre, or illustration is shown, and no link «Произведения автора» exists

#### Scenario: Author without poems
- **GIVEN** a public author with no poems
- **WHEN** a visitor opens `/authors/<id>`
- **THEN** the level-2 heading «Произведения» and the text «У автора пока ещё нет публикаций.» are shown below the profile
- **AND** the poems section holds no list

#### Scenario: Placement without about
- **GIVEN** a public author with poems and no about
- **WHEN** their page renders
- **THEN** the poems section comes right after the photo or its placeholder

#### Scenario: Following a title
- **GIVEN** a visitor on `/authors/<id>` of an author with poems
- **WHEN** they activate a poem title
- **THEN** that poem's page opens

#### Scenario: Same entry for the owner and other readers
- **GIVEN** a public author with poems, a signed-in reader who owns that profile, and a signed-in reader who doesn't
- **WHEN** each opens `/authors/<id>`
- **THEN** both see the same heading and the same links in the same order

### Requirement: Not found and unavailable (FR-5)
`/authors/<id>/poems`, for any `<id>`, SHALL respond with HTTP 404 and the 404 page («Страница не найдена»), with no breadcrumb trail and no redirect: the route no longer exists (refine-author-page-and-contact FR-6). On `/authors/<id>/poems/<poemId>`, an author id that is not a UUID or names no public author SHALL render the 404 page (its UI; the streamed status may be 200), and a `poemId` that is not one of that author's poems, unknown or another author's, SHALL render the 404 page. The `poemId` SHALL match a poem's id exactly, case included: any other spelling, such as an uppercase one, is unknown. When the author can't be read because the service is unavailable, the poem page SHALL show the generic error screen.

#### Scenario: Former poem list URL
- **GIVEN** a public author `<id>` with poems, the id "not-a-uuid", or a UUID with no public profile
- **WHEN** `/authors/<id>/poems` is requested directly
- **THEN** the response status is 404, the page shows «Страница не найдена», and no trail is shown

#### Scenario: Unknown or malformed author
- **GIVEN** the id "not-a-uuid", or a UUID with no public profile
- **WHEN** `/authors/<id>/poems/<any poem id>` is requested
- **THEN** the 404 page renders

#### Scenario: Poem that isn't the author's
- **GIVEN** a public author with one poem, and a poem id from the mock set past that author's share, the id "no-such-poem", or the uppercase spelling of that author's own poem id
- **WHEN** `/authors/<id>/poems/<that id>` is requested
- **THEN** the 404 page renders

#### Scenario: Author service unavailable
- **GIVEN** the author service can't be reached
- **WHEN** a visitor opens `/authors/<a valid id>/poems/<a poem id>`
- **THEN** the generic error screen «Что-то пошло не так» is shown

### Requirement: Public access (FR-6)
The poem page and the author page's poems section SHALL render without signing in, SHALL NOT redirect to `/login`, and SHALL show identical content to every visitor.

#### Scenario: Guest and signed-in reader see the same poem page
- **GIVEN** a signed-out visitor and a signed-in reader who doesn't own the author's profile
- **WHEN** each opens the same `/authors/<id>/poems/<poemId>`
- **THEN** neither is redirected, and both see the same illustration, heading, text, date, and genre

### Requirement: Rendering modes (NFR-4)
`npm run build` SHALL succeed with no Supabase or Contentful environment variables. Its route list SHALL include `/authors/[id]/poems/[poemId]`, partially prerendered like `/authors/[id]`, and SHALL NOT include `/authors/[id]/poems` (refine-author-page-and-contact NFR-3). No route that wasn't fully dynamic before SHALL become so.

#### Scenario: Build without env
- **GIVEN** no `NEXT_PUBLIC_SUPABASE_*` and no `CONTENTFUL_*` variables are set
- **WHEN** `npm run build` runs
- **THEN** it exits 0, its route list equals `main`'s before refine-author-page-and-contact minus `/authors/[id]/poems`, and `/authors/[id]/poems/[poemId]` carries the same render-mode marker as `/authors/[id]`

### Requirement: Accessible pages (NFR-6)
The poem page SHALL have exactly one level-1 heading; the illustration SHALL carry FR-4's alt text; the date SHALL be a `<time>` element. On the author page, the poems section SHALL have the level-2 heading «Произведения», its list SHALL be a `ul` whose every item holds one link, and the page's `main` region SHALL keep exactly one level-1 heading, the author's name (refine-author-page-and-contact NFR-4).

#### Scenario: Roles on the list page
- **GIVEN** a public author with poems, whose list is now on the author page
- **WHEN** the `main` region of `/authors/<id>` is queried by role (the breadcrumb trail, outside `main`, is excluded)
- **THEN** `main` holds one level-1 heading, a level-2 heading «Произведения», and after it one list whose every item holds one link

### Requirement: Russian UI copy (NFR-7)
Every user-facing string of the poem page and the author page's poems section SHALL be the UI copy table text of add-author-poems or refine-author-page-and-contact, verbatim.

#### Scenario: Copy matches the table
- **GIVEN** the author page's poems section and the poem page
- **WHEN** their link text, headings, empty text, alt text, and genre line are read
- **THEN** each matches the UI copy tables exactly

### Requirement: Server-rendered and session-free (NFR-1)
The poem page, the author page's poems section, and the poems feature SHALL contain no `"use client"` module, and the poems feature SHALL import nothing from `@/features/auth` or `@/shared/lib/supabase`; it SHALL read authors only through `@/features/authors`' public API.

#### Scenario: Static check
- **GIVEN** the change is complete
- **WHEN** `src/features/poems/` is searched for `"use client"` and for imports of `@/features/auth` and `@/shared/lib/supabase`
- **THEN** there are no matches

## REMOVED Requirements

### Requirement: Poem list page (FR-2)
**Reason**: The separate poem list page is removed; the list moved onto the author page (refine-author-page-and-contact FR-5, FR-6; user decision, 2026-10-27).
**Migration**: The list, its order, and its links are now FR-1 on `/authors/<id>`. The old URL answers 404 (FR-5); no redirect.

### Requirement: Empty poem list (FR-3)
**Reason**: The page it described no longer exists.
**Migration**: The empty text «У автора пока ещё нет публикаций.» under the «Произведения» heading is part of FR-1 on the author page.
