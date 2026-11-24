# home-sections Specification

## Purpose
TBD - created by archiving change home-page-sections. Update Purpose after archive.
## Requirements
### Requirement: Hero (FR-1)
The home page SHALL open with a hero: a background image that spans the full width of the viewport, edge to edge (wider than the page's text column, as the owner's brief says «на всю ширину экрана»), a title as the page's only `h1`, a text beneath it, and two links styled as buttons: «Читать произведения» to `/authors` and «Стать автором» to `/signup`. The title, text and image come from the Contentful Home banner (`home-banner` FR-B4); when it cannot be loaded, the hero SHALL show the site name as the `h1`, the static site description and the photo shipped with the site, and both buttons SHALL still work (`home-banner` FR-B5). The centred layout and the 50% overlay are owned by `home-banner` (FR-B6, FR-B7).

#### Scenario: Hero with the CMS greeting
- **GIVEN** the Home banner loads with title "Welcome", a description and an image
- **WHEN** a visitor opens `/`
- **THEN** the page's only `h1` reads "Welcome" and the description is shown beneath it, over the banner's image
- **AND** a link «Читать произведения» leads to `/authors` and a link «Стать автором» leads to `/signup`

#### Scenario: Hero when the CMS is unavailable
- **GIVEN** the Home banner fails with any failure kind
- **WHEN** a visitor opens `/`
- **THEN** the `h1` reads "Поэтический Хаб", the static description and the shipped photo are shown, and both buttons are present

### Requirement: Featured poems (FR-2)
The page SHALL show a section of the poems the admin chose, at most 4, in the admin's order. Each card SHALL show a cover (the poem's illustration, else a neutral placeholder of the same proportions), the poem's title and its author's name, and SHALL link to the poem's page. The section SHALL be left out when no poem is chosen. It SHALL NOT contain a «Все произведения» link.

#### Scenario: Four chosen poems
- **GIVEN** the admin chose 4 poems, one of them without an illustration
- **WHEN** a visitor opens `/`
- **THEN** 4 cards are shown in the chosen order, each with title and author name and a link to its poem page
- **AND** the poem without an illustration shows the placeholder cover

#### Scenario: Nothing chosen
- **GIVEN** no poem is chosen
- **WHEN** a visitor opens `/`
- **THEN** the featured section and its heading are absent

#### Scenario: Fewer than four chosen
- **GIVEN** the admin chose 2 poems
- **WHEN** a visitor opens `/`
- **THEN** exactly 2 cards are shown and no empty slot

### Requirement: About the project (FR-3)
The page SHALL show a section with a heading, a short text on the project's idea and values, and a link «Подробнее о проекте» to `/about`. The heading and text come from the Greeting entry with key `about_project_home` (its title and message, as plain text); when it cannot be loaded, the section SHALL show the project's static heading and text and stay in place. The link is not editable in Contentful.

#### Scenario: About section
- **GIVEN** the greeting `about_project_home` loads with title "О нас" and a message
- **WHEN** a visitor opens `/`
- **THEN** the section shows "О нас" as its heading and the message beneath, and its link leads to `/about`

#### Scenario: About section when the CMS is unavailable
- **GIVEN** the greeting `about_project_home` fails with any failure kind
- **WHEN** a visitor opens `/`
- **THEN** the section shows its static heading and text, and its link leads to `/about`

### Requirement: Project authors (FR-4)
The page SHALL show a section of the authors the admin chose, at most 4, in the admin's order. Each card SHALL show the author's photo (else an avatar placeholder), their name and a short plain-text description taken from the author's «О себе», at most 120 characters (no description when it is empty), and SHALL link to the author's page. Markup in «О себе» SHALL NOT be shown as markup. The section SHALL be left out when no author is chosen, and SHALL NOT contain a «Все авторы» link beyond the header's existing link.

#### Scenario: Chosen authors
- **GIVEN** the admin chose 3 authors, one with an empty «О себе»
- **WHEN** a visitor opens `/`
- **THEN** 3 cards are shown in order, each with photo or avatar, name and a link to the author page
- **AND** the card of the author with an empty «О себе» shows no description

#### Scenario: Long about text is shortened
- **GIVEN** a chosen author whose «О себе» is longer than 120 characters and holds Markdown
- **WHEN** a visitor opens `/`
- **THEN** the card shows a plain-text excerpt of at most 120 characters ending with «…» and no Markdown symbols

#### Scenario: No author chosen
- **GIVEN** no author is chosen
- **WHEN** a visitor opens `/`
- **THEN** the authors section is absent

### Requirement: Latest publications (FR-5)
The page SHALL show the 4 newest poems of public authors, ordered by creation date from newest to oldest, each with the poem's title and its author's name and a link to the poem's page. The section SHALL be left out when there is no poem. A poem that is also featured SHALL still appear here. It SHALL NOT contain a «Все публикации» link.

#### Scenario: Newest four
- **GIVEN** 6 poems of public authors with different creation dates
- **WHEN** a visitor opens `/`
- **THEN** the 4 newest are listed, newest first, each with title, author name and a link

#### Scenario: Poem of a removed author
- **GIVEN** the newest poem belongs to an author who is no longer public
- **WHEN** a visitor opens `/`
- **THEN** that poem is not listed and the section shows the other poems among the 4 newest, so it may hold fewer than 4 until the latest read's cache lifetime ends

#### Scenario: No poems at all
- **GIVEN** there is no poem of a public author
- **WHEN** a visitor opens `/`
- **THEN** the latest-publications section is absent

### Requirement: Closing invitation (FR-6)
The page SHALL end, for a visitor who is not signed in, with a section holding a heading, a short motivating text and one button «Присоединиться к проекту» leading to `/signup`. The heading and text come from the Greeting entry with key `call_to_action_signup` (its title and message, as plain text); when it cannot be loaded, the section SHALL show its static heading and text. A signed-in reader, an admin included, SHALL NOT see this section: it invites people to join, and they already have. The button is not editable in Contentful.

#### Scenario: Closing section for a guest
- **GIVEN** a visitor who is not signed in and the greeting `call_to_action_signup` loads with title "Join us" and a message
- **WHEN** they open `/`
- **THEN** the last section shows "Join us" and the message, and its button leads to `/signup`

#### Scenario: Closing section when the CMS is unavailable
- **GIVEN** a visitor who is not signed in and the greeting `call_to_action_signup` fails
- **WHEN** they open `/`
- **THEN** the last section shows its static heading and text, and its button leads to `/signup`

#### Scenario: No closing section for a signed-in reader
- **GIVEN** a signed-in reader
- **WHEN** they open `/`
- **THEN** the closing invitation and its button are absent, the other five sections render, and no read of the closing greeting is made for them

#### Scenario: No closing section for an admin
- **GIVEN** a signed-in admin
- **WHEN** they open `/`
- **THEN** the closing invitation is absent

### Requirement: Sections fail independently (FR-7)
Each data-backed section (featured poems, project authors, latest publications) SHALL read its data on its own. When one read fails, that section SHALL be left out and every other section SHALL render. A failed read SHALL be logged on the server by kind only, never with a title, a name or a row. The page SHALL NOT turn into the error screen for such a failure. The three sections share one source of author names (the public author list): when that read fails, all three SHALL be left out together, since a poem card without its author's name is not shown, and the hero, about and closing sections SHALL still render.

#### Scenario: One read fails
- **GIVEN** the latest-publications read fails
- **WHEN** a visitor opens `/`
- **THEN** the hero, featured, about, authors and closing sections render and the latest section is absent
- **AND** one log line names the failure kind and contains no poem or author data

#### Scenario: The author list fails
- **GIVEN** the public author list read fails and the poem reads succeed
- **WHEN** a visitor opens `/`
- **THEN** the featured, authors and latest sections are all absent and the hero, about and closing sections render

#### Scenario: All reads fail
- **GIVEN** every Supabase read fails
- **WHEN** a visitor opens `/`
- **THEN** the hero, about and closing sections render and the page is not the error screen

### Requirement: A failed read is not kept (FR-12)
A failed section read SHALL NOT stay in the cache for the lifetime of a successful one: the read itself SHALL be retried after seconds, and because the page is cached for its named lifetime of a minute, a recovered section SHALL be shown again within that minute (a failure never outlasts the page's own lifetime). The latest-publications list SHALL follow new poems within its named cache lifetime, and the page's chosen entries SHALL follow the admin's change on the next request (see `home-curation`).

#### Scenario: Recovery after an outage
- **GIVEN** the latest-publications read failed on one request
- **WHEN** the database is back and a visitor opens `/` after the page's lifetime of a minute has ended
- **THEN** the latest section is shown again

### Requirement: Cached, session-free sections (NFR-1)
The home page's sections SHALL stay cached and prerenderable: nothing inside their cache scope SHALL read cookies, headers or the session, so the hero, featured, about, authors and latest sections are the same for every visitor. The one session-dependent part, the closing invitation (FR-6), SHALL be read on the server in its own boundary outside that cache scope, with an empty fallback, so it never enters the shared cache and a signed-in reader never receives it.

#### Scenario: Same cached sections for a signed-in reader
- **GIVEN** a signed-in reader
- **WHEN** they open `/`
- **THEN** the five cached sections are the ones a guest sees, and no session read happens in their cache scope

### Requirement: Responsive layout (NFR-2)
The page SHALL lay out on desktop, tablet and mobile widths without horizontal scrolling from a 360 px viewport upward, with cards reflowing to fewer columns on narrower screens.

#### Scenario: Narrow viewport
- **GIVEN** a 360 px wide viewport
- **WHEN** a visitor opens `/`
- **THEN** the page's width equals the viewport's and every section's cards are readable in one column

### Requirement: Images (NFR-3)
Images SHALL be served through the framework's image component with a `sizes` hint; the hero image SHALL be loaded with priority; card covers SHALL have a fixed aspect ratio so the page does not shift while they load.

#### Scenario: Cover without layout shift
- **GIVEN** a featured poem's illustration loads late
- **WHEN** the page renders
- **THEN** the card's cover box already has its final proportions

### Requirement: Design tokens and type (NFR-4)
Spacing, colours and font sizes SHALL come from the design tokens, and section headings SHALL use the project's serif display font.

#### Scenario: Tokens only
- **WHEN** the section styles are checked
- **THEN** they hold no raw colour value, and the headings use the serif display family

### Requirement: Accessible structure (NFR-5)
The page SHALL have exactly one `h1` (the hero's), section headings as `h2`, an accessible name for every link, and an empty `alt` on every image: the hero background, the poem covers and the author photos are decorative, because each card's link already names the title and the author.

#### Scenario: Heading outline
- **WHEN** a visitor opens `/`
- **THEN** there is one `h1`, each section's heading is an `h2`, and no heading level is skipped

#### Scenario: Decorative images
- **WHEN** a visitor opens `/` with featured poems and authors
- **THEN** the hero image, every cover and every author photo have an empty `alt`

#### Scenario: Card link names
- **GIVEN** a featured card with title "Осень" by an author
- **WHEN** the links are listed by name
- **THEN** the card's link name contains the title and the author's name

