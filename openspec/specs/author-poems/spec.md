# author-poems Specification

## Purpose
TBD - created by archiving change add-author-poems. Update Purpose after archive.
## Requirements
### Requirement: Poem page (FR-4)
`/authors/<id>/poems/<poemId>` SHALL show, in order: the poem's illustration with alt text «Иллюстрация: <title>», the title as the level-1 heading, the poem's text, and a footer with the publication date and the line «Жанр: <genre>». The text SHALL be plain text: each block separated by one or more blank lines renders as its own paragraph, every line break inside a block is kept, and Markdown or HTML in it appears literally. The date SHALL be shown in Russian long form inside a `<time>` element whose `datetime` attribute is the ISO date.

#### Scenario: Full poem
- **GIVEN** a poem «Осенний сад» of author `<id>`, genre «Лирика», published 2026-03-12, whose text has two stanzas of four lines
- **WHEN** a visitor opens `/authors/<id>/poems/<poemId>`
- **THEN** an image with alt «Иллюстрация: Осенний сад» comes first, then the level-1 heading «Осенний сад», then two paragraphs, each showing its four lines on separate lines
- **AND** the footer after the text shows a `<time datetime="2026-03-12">` reading «12 марта 2026 г.» and the text «Жанр: Лирика»

#### Scenario: Markup is not interpreted
- **GIVEN** a poem whose text is "**Bold** <b>tag</b>"
- **WHEN** its page renders
- **THEN** the text "**Bold** <b>tag</b>" appears literally and no bold element is rendered

#### Scenario: Date does not depend on the server's time zone
- **GIVEN** a poem published 2026-01-01 and a server whose time zone is behind UTC
- **WHEN** its page renders
- **THEN** the date reads «1 января 2026 г.»

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

### Requirement: Mock poems (FR-7)
Poems SHALL come from a fixed in-code set of four mock poems, each with a stable lowercase-slug id, a title, a text, a local illustration, a publication date, and a genre. Each public author SHALL get the first N poems of the set, where N, from 0 to 4, is computed from the author's id alone: the same id gives the same N on every request, build, and machine, and each of the five values of N is reachable by some UUID.

#### Scenario: Stable share
- **GIVEN** a public author id `<id>`
- **WHEN** the author's poems are read twice, on separate requests
- **THEN** both reads return the same poems in the same order

#### Scenario: Every share size occurs
- **GIVEN** the mock set
- **WHEN** poems are read for suitably chosen UUIDs
- **THEN** there are UUIDs whose authors get 0, 1, 2, 3, and 4 poems

### Requirement: Server-rendered and session-free (NFR-1)
The poem page, the author page's poems section, and the poems feature SHALL contain no `"use client"` module, and the poems feature SHALL import nothing from `@/features/auth` or `@/shared/lib/supabase`; it SHALL read authors only through `@/features/authors`' public API.

#### Scenario: Static check
- **GIVEN** the change is complete
- **WHEN** `src/features/poems/` is searched for `"use client"` and for imports of `@/features/auth` and `@/shared/lib/supabase`
- **THEN** there are no matches

### Requirement: No dependency cycle (NFR-2)
`src/features/authors/` SHALL import nothing from `@/features/poems`; the author route file SHALL compose the poems entry into the author page.

#### Scenario: Static check
- **GIVEN** the change is complete
- **WHEN** `src/features/authors/` is searched for `@/features/poems`
- **THEN** there are no matches

### Requirement: Swappable data source (NFR-3)
Pages and components SHALL read poems only through the poems DAL's functions; the mock set SHALL be imported only by the DAL module that reads it, so replacing it with a database read changes only `src/features/poems/dal/`.

#### Scenario: Static check
- **GIVEN** the change is complete
- **WHEN** `src/` is searched for imports of the mock-set module
- **THEN** the only importer is `src/features/poems/dal/author-poems.ts`

### Requirement: Rendering modes (NFR-4)
`npm run build` SHALL succeed with no Supabase or Contentful environment variables. Its route list SHALL include `/authors/[id]/poems/[poemId]`, partially prerendered like `/authors/[id]`, and SHALL NOT include `/authors/[id]/poems` (refine-author-page-and-contact NFR-3). No route that wasn't fully dynamic before SHALL become so.

#### Scenario: Build without env
- **GIVEN** no `NEXT_PUBLIC_SUPABASE_*` and no `CONTENTFUL_*` variables are set
- **WHEN** `npm run build` runs
- **THEN** it exits 0, its route list equals `main`'s before refine-author-page-and-contact minus `/authors/[id]/poems`, and `/authors/[id]/poems/[poemId]` carries the same render-mode marker as `/authors/[id]`

### Requirement: Design tokens only (NFR-5)
New and changed styles SHALL use named design-token utilities only: no colour literals and no Tailwind arbitrary-value colour classes.

#### Scenario: Literal search
- **GIVEN** the change is complete
- **WHEN** the new and changed component files are searched for hex, `rgb(`, `hsl(` literals and `text-[`, `bg-[`, `border-[` classes
- **THEN** there are no matches

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

