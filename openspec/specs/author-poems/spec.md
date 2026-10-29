# author-poems Specification

## Purpose
TBD - created by archiving change add-author-poems. Update Purpose after archive.
## Requirements
### Requirement: Poem page (FR-4)
`/authors/<id>/poems/<poemId>` SHALL show, in order: the poem's illustration with alt text «Иллюстрация: <title>» when the poem has one (nothing in its place otherwise, so the page starts with the title) at full column width in a 16:9 frame that it fills, cropped at its edges when its own proportions differ (Claude Design artboard 14), the title as the level-1 heading, the poem's text, and a footer with the publication date and, when the poem has a genre that Contentful still lists, the line «Жанр: <genre name>». The text SHALL be rendered as safe Markdown (add-poem-creation NFR-5) with every line break inside a paragraph kept (add-poem-creation FR-10). The date SHALL be shown in Russian long form inside a `<time>` element whose `datetime` attribute is the ISO date.

#### Scenario: Full poem
- **GIVEN** a poem «Осенний сад» of author `<id>` with an illustration, genre «Лирика», published 2026-03-12, whose text has two stanzas of four lines separated by a blank line
- **WHEN** a visitor opens `/authors/<id>/poems/<poemId>`
- **THEN** an image with alt «Иллюстрация: Осенний сад» comes first, then the level-1 heading «Осенний сад», then two paragraphs, each showing its four lines on separate lines
- **AND** the footer after the text shows a `<time datetime="2026-03-12">` reading «12 марта 2026 г.» and the text «Жанр: Лирика»

#### Scenario: No illustration
- **GIVEN** a poem without an illustration
- **WHEN** its page renders
- **THEN** the level-1 heading is the first element of the poem, and the poem holds no image

#### Scenario: No genre
- **GIVEN** a poem saved with «Без жанра», or whose genre tag no longer exists in Contentful
- **WHEN** its page renders
- **THEN** the footer shows the date and no «Жанр:» line

#### Scenario: Genre renamed
- **GIVEN** a poem with the genre tag «Лирика», renamed in Contentful to «Лирическое»
- **WHEN** its page renders after the Contentful cache refreshes
- **THEN** the footer reads «Жанр: Лирическое»

#### Scenario: Epigraph, separator, and indent
- **GIVEN** a poem text that starts with "> Эпиграф", has a "* * *" line between two stanzas, and a line starting with an indent step (two em spaces)
- **WHEN** its page renders
- **THEN** the epigraph block sits at the right edge and each of its lines is right-aligned (a ragged left edge), smaller, muted, and italic above the first stanza; a centred «* * *» separator (a `separator` role) stands between the stanzas; and the indented line is shifted right while the others start at the left edge

#### Scenario: Markdown is rendered
- **GIVEN** a poem whose text is "**Bold** line\nsecond line"
- **WHEN** its page renders
- **THEN** "Bold" is in a bold element, and "second line" is on its own line in the same paragraph

#### Scenario: Markup is not interpreted
- **GIVEN** a poem whose text is "<b>tag</b> plain"
- **WHEN** its page renders
- **THEN** no `b` element is rendered, and "plain" is shown

#### Scenario: Date does not depend on the server's time zone
- **GIVEN** a poem published 2026-01-01 and a server whose time zone is behind UTC
- **WHEN** its page renders
- **THEN** the date reads «1 января 2026 г.»

### Requirement: Not found and unavailable (FR-5)
`/authors/<id>/poems`, for any `<id>`, SHALL respond with HTTP 404 and the 404 page («Страница не найдена»), with no breadcrumb trail and no redirect: the route no longer exists (refine-author-page-and-contact FR-6). On `/authors/<id>/poems/<poemId>`, an author id that is not a UUID or names no public author SHALL render the 404 page (its UI; the streamed status may be 200), and a `poemId` that is not one of that author's poems, unknown, malformed, or another author's, SHALL render the 404 page. The `poemId` SHALL match a poem's id exactly, case included: any other spelling, such as an uppercase one, is unknown. When the author or the poems can't be read because the service is unavailable, the poem page SHALL show the generic error screen.

#### Scenario: Former poem list URL
- **GIVEN** a public author `<id>` with poems, the id "not-a-uuid", or a UUID with no public profile
- **WHEN** `/authors/<id>/poems` is requested directly
- **THEN** the response status is 404, the page shows «Страница не найдена», and no trail is shown

#### Scenario: Unknown or malformed author
- **GIVEN** the id "not-a-uuid", or a UUID with no public profile
- **WHEN** `/authors/<id>/poems/<any poem id>` is requested
- **THEN** the 404 page renders

#### Scenario: Poem that isn't the author's
- **GIVEN** a public author with one poem, and another author's poem id, the id "no-such-poem", a random UUID, or the uppercase spelling of that author's own poem id
- **WHEN** `/authors/<id>/poems/<that id>` is requested
- **THEN** the 404 page renders

#### Scenario: Author service unavailable
- **GIVEN** the author service can't be reached
- **WHEN** a visitor opens `/authors/<a valid id>/poems/<a poem id>`
- **THEN** the generic error screen «Что-то пошло не так» is shown

#### Scenario: Poem read unavailable
- **GIVEN** a public author whose poems can't be read because the database is unreachable
- **WHEN** a visitor opens `/authors/<id>/poems/<a poem id>`
- **THEN** the generic error screen «Что-то пошло не так» is shown

### Requirement: Public access (FR-6)
The poem page and the author page's poems section SHALL render without signing in, SHALL NOT redirect to `/login`, and SHALL show identical content to every visitor.

#### Scenario: Guest and signed-in reader see the same poem page
- **GIVEN** a signed-out visitor and a signed-in reader who doesn't own the author's profile
- **WHEN** each opens the same `/authors/<id>/poems/<poemId>`
- **THEN** neither is redirected, and both see the same illustration, heading, text, date, and genre

### Requirement: Server-rendered and session-free (NFR-1)
The poem page, the author page's poems section, and the poems feature SHALL contain no `"use client"` module, and the poems feature SHALL import nothing from `@/features/auth`, `@/shared/lib/supabase/server`, or `@/shared/lib/supabase/session`: it reads poems only through the cookie-less public client (`@/shared/lib/supabase/public`), as the anon role (add-poem-creation design D3). It SHALL read authors only through `@/features/authors`' public API.

#### Scenario: Static check
- **GIVEN** the change is complete
- **WHEN** `src/features/poems/` is searched for `"use client"` and for imports of `@/features/auth`, `@/shared/lib/supabase/server`, and `@/shared/lib/supabase/session`
- **THEN** there are no matches

### Requirement: No dependency cycle (NFR-2)
`src/features/authors/` SHALL import nothing from `@/features/poems`; the author route file SHALL compose the poems entry into the author page.

#### Scenario: Static check
- **GIVEN** the change is complete
- **WHEN** `src/features/authors/` is searched for `@/features/poems`
- **THEN** there are no matches

### Requirement: Swappable data source (NFR-3)
Pages and components SHALL read poems only through the poems DAL's functions; only the poems DAL SHALL query the poems table for reading, so a later change of the data source (pagination, search) changes only `src/features/poems/dal/`.

#### Scenario: Static check
- **GIVEN** the change is complete
- **WHEN** `src/` is searched for reads of the `poems` table
- **THEN** the only reader is `src/features/poems/dal/`, and no mock poem module exists

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
On `/authors/<id>` for a public author, below the profile (after the about section, or after the photo when there is no about), the page SHALL show a section with the level-2 heading «Произведения» followed by exactly one of: a list with one item per poem of that author, newest first, each item showing only the poem's title as a link to `/authors/<id>/poems/<poemId>`; or, when the author has no poems, the text «У автора пока ещё нет публикаций.» and no list (refine-author-page-and-contact FR-5); or, when the poems can't be read, the text «Произведения сейчас недоступны.» and no list, while the rest of the page still renders (add-poem-creation FR-11). The section SHALL keep the former list page's look (title links in the regular text colour, accent on hover, and the same spacing). It SHALL be the same for every visitor: signed out, signed in as another reader, or signed in as the owner. The page SHALL show no link to `/authors/<id>/poems`.

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

#### Scenario: Poems unavailable
- **GIVEN** a public author whose profile reads fine and whose poems can't be read
- **WHEN** a visitor opens `/authors/<id>`
- **THEN** the profile is shown, and the «Произведения» section shows «Произведения сейчас недоступны.» and no list

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

### Requirement: Poems from the database (add-poem-creation FR-9)
An author's poems SHALL be the rows stored for that author's profile: each with a UUID id, a title, a Markdown text, an optional illustration, an optional genre (a Contentful genre tag), and a publication date equal to the UTC date of its creation. They SHALL be listed newest created first. Only poems of a public author SHALL be readable.

#### Scenario: Stored poems are listed
- **GIVEN** a public author with stored poems «Осенний сад» (created 2026-10-01) and «Ночной вокзал» (created 2026-10-02)
- **WHEN** a visitor opens `/authors/<id>`
- **THEN** the «Произведения» section lists «Ночной вокзал» then «Осенний сад»

#### Scenario: Publication date from creation time
- **GIVEN** a poem created at 2026-10-01T23:30:00Z
- **WHEN** its page renders on a server in any time zone
- **THEN** the footer shows `<time datetime="2026-10-01">` reading «1 октября 2026 г.»

#### Scenario: No mock poems
- **GIVEN** a public author with no stored poems
- **WHEN** a visitor opens `/authors/<id>`
- **THEN** the section shows «У автора пока ещё нет публикаций.», whatever the author's id

### Requirement: One cached read per author (add-poem-creation NFR-4)
An author's poems SHALL be read through one cached entry per author, tagged with that author's poems tag, shared by the public author page, the public poem page, and the author's management pages. A successful read SHALL be kept for hours, a failed one for seconds only. Creating a poem SHALL expire that author's tag and no other.

#### Scenario: One entry serves both areas
- **GIVEN** an author's public page was just rendered from a fresh read
- **WHEN** the author opens `/account/poems` within the cache lifetime
- **THEN** no second database read of that author's poems happens

#### Scenario: Failure is short-lived
- **GIVEN** a poem read that failed because the database was unreachable, and the database is back
- **WHEN** the page is requested again after a few seconds
- **THEN** the poems are shown

### Requirement: New poem on the public pages (add-poem-creation FR-12)
After the author creates a poem, the next server request for their public author page and for the new poem's public page SHALL show it, with no wait for a server cache lifetime (add-poem-creation FR-12 states the client-side limits).

#### Scenario: Public page after a create
- **GIVEN** a cached public author page
- **WHEN** its author creates «Первый снег» and a guest then opens `/authors/<id>`
- **THEN** «Первый снег» is the first item of the «Произведения» list, and its link opens the poem

### Requirement: Safe Markdown in poems (add-poem-creation NFR-5)
A poem's rendered text SHALL contain no raw HTML from the source. Only paragraphs, strong, emphasis, blockquotes (shown as an epigraph), thematic breaks (shown as a centred «* * *»), and line breaks SHALL be rendered as elements; headings and lists typed by hand SHALL be rendered as their plain text, and so SHALL links and images (the rule of author-profiles NFR-1, narrowed for poems).

#### Scenario: Script tag
- **GIVEN** a poem text containing `<script>alert(1)</script>`
- **WHEN** its page renders
- **THEN** the output contains no `script` element

#### Scenario: Heading and list typed by hand
- **GIVEN** a poem text "## Часть\n\n- строка"
- **WHEN** its page renders
- **THEN** no heading or list element is rendered, and the words "Часть" and "строка" are shown

#### Scenario: Link becomes text
- **GIVEN** a poem text `[site](https://evil.example)`
- **WHEN** its page renders
- **THEN** the text "site" is shown and the poem holds no `a` element

