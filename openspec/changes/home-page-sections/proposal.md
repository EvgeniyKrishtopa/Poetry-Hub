## Why

The home page today is one welcome banner (the Contentful greeting) and nothing else. A first-time visitor sees a title and a few lines, with no poem, no author and no reason to sign up, while the site's value is its poems and authors. The owner wants a literary landing page that introduces the project, shows chosen and recent work, and invites people to become authors. The poems the home page features must be chosen by hand by the admin, so the change also needs a small curation tool in the admin area.

## What Changes

- The home page (`/`) becomes six sections, top to bottom:
  1. **Hero**: a full-width background image (a static mock image now), the greeting's title and message (the existing Contentful `home_greeting`, with the static fallback) and two buttons: «Читать произведения» to `/authors` and «Стать автором» to `/signup`.
  2. **Featured poems**: up to 4 cards (cover, title, author name) chosen by the admin, each linking to the poem page.
  3. **About the project**: a heading, a short text on the idea and values, and a link to `/about`.
  4. **Project authors**: up to 4 cards (photo, name, a short description of their work) chosen by the admin, each linking to the author page.
  5. **Latest publications**: the 4 newest poems (title and author name), newest first, each linking to the poem page.
  6. **Closing invitation**: a heading, a motivating line and the button «Присоединиться к проекту» to `/signup`.
- A new admin tool decides the featured poems and the project authors. An admin presses «Показать на главной» on a public poem page or a public author page (the same placement as the violations list's «add» control, passed in by the route file), and a new closed page `/admin/home` lists the chosen poems and authors, where the admin changes their order and removes them. At most 4 poems and at most 4 authors can be chosen.
- Two new tables hold the chosen poems and the chosen authors, each with their order. Every write goes through guarded SQL functions that start with `assert_admin()`, never a service-role key (ADR 0015).
- A chosen poem or author that is deleted or no longer public disappears from the home page; a deleted one also leaves the list, and one that is merely not public stays on `/admin/home` marked as not shown until an admin removes it.
- **Not in this change** (owner decision, 2026-11-21): the links «Все произведения» and «Все публикации». The site has no page listing every poem, so a catalog page is a separate change and the two links come with it. Recorded in `docs/deferred.md` when group 1 ends.
- **Not in this change**: loading the hero image from Contentful (the brief says «сначала мок, потом Contentful»; the follow-up swaps the constant for a Contentful asset), and the brief's empty section «Дополнительная функциональность» (an open question below).

## Requirements

Full scenarios are in the two new specs and the modified one.

- **FR-1** Hero: background image, the greeting as the page's one `h1` with its message, and the two buttons with the targets above; the greeting's static fallback keeps working inside the hero.
- **FR-2** Featured poems: up to 4 cards in the admin's order, each with cover (the poem's illustration, else a neutral placeholder), title and author name, linking to the poem page; the section is left out when nothing is chosen.
- **FR-3** About: a heading, a short text and a link to `/about`.
- **FR-4** Project authors: up to 4 cards in the admin's order, each with photo (else an avatar placeholder), name and a short plain-text description from the author's «О себе» (or none), linking to the author page; left out when nothing is chosen.
- **FR-5** Latest publications: the 4 newest poems of public authors by creation date, newest first, each with title and author name, linking to the poem page; left out when there are none.
- **FR-6** Closing invitation: heading, text and the button to `/signup`.
- **FR-7** Independent sections: a failed read of one section's data leaves that section out and does not stop the others; the hero never fails.
- **FR-8** Choosing: an admin can add any public poem or public author to the home page from its page, **the admin's own poem and own author page included** (the moderation controls hide on an admin's own content because `may_moderate_author` excludes it, so this control checks `is_admin()` only, never that function); adding past the limit of 4 is refused with a message and changes nothing; adding what is already chosen changes nothing and says so.
- **FR-9** The `/admin/home` page lists the chosen poems and authors in order, and an admin can reorder and remove entries there.
- **FR-10** Guarded writes: only an admin's session can add, reorder or remove entries; the tables accept no direct write from the client roles.
- **FR-11** Consistency: a poem or author that no longer exists, or whose author is no longer public, never shows on the home page; an entry whose poem or profile is deleted is removed with it, and one whose author is only not public stays on `/admin/home` marked as not shown.
- **FR-12** Freshness of reads: a failed section read is retried within seconds, and the latest-publications list follows new poems within its named cache lifetime.
- **FR-13** An admin's change shows on the next request for `/`.
- **NFR-1** The home page stays a cached, prerenderable page: nothing in its cache scope reads cookies or the session.
- **NFR-2** The layout works on desktop, tablet and mobile with no horizontal scroll from 360 px wide.
- **NFR-3** Images go through `next/image` with `sizes`; the hero image is loaded with priority; layout shift from cards is avoided by fixed aspect ratios.
- **NFR-4** Headings use the project's serif display font and the design tokens only (`docs/design-system.md`); spacing, colours and sizes come from tokens, with no new magic values.
- **NFR-5** One `h1` on the page, headings in order, every image decorative with an empty alt (each card's link names the title and the author), every link with a readable name.
- **NFR-6** Boundaries and quiet failures: `home` composes the public APIs of `poems` and `authors` and reads the chosen ids through the cookie-less public client; `admin` owns the writes and the `/admin/home` page; `home`, `poems`, `authors` and `collections` never import `admin`, and `admin` never imports `home`; a failed admin write is logged by operation and error kind only, never with a title, a name or an id.

## Acceptance criteria (Given/When/Then, summary)

- **FR-2, FR-8:** Given an admin on a public poem page and 3 poems already chosen, when they press «Показать на главной», then the poem is chosen and the next request for `/` shows 4 featured cards. Given 4 already chosen, when they press it on a fifth poem, then nothing changes and a message says the limit is reached.
- **FR-8 (own content):** Given an admin who has a public author profile and a poem of their own, when they open that poem's page, then «Показать на главной» is shown and works, while the moderation controls (delete, add to the review list) stay hidden.
- **FR-5:** Given 6 poems of public authors, when a visitor opens `/`, then the 4 newest are listed, newest first, with title and author name.
- **FR-10:** Given a signed-in non-admin, when the browser calls the add function, then it is refused and no row is written.
- **FR-11:** Given a chosen poem, when its author or an admin deletes it, then `/` no longer shows it and `/admin/home` no longer lists it.
- **FR-7:** Given the latest-publications read fails, when a visitor opens `/`, then the other five sections render and that one is absent.
- **FR-1:** Given Contentful is unreachable, when a visitor opens `/`, then the hero shows the site name and static description and both buttons still work.

## Capabilities

### New Capabilities

- `home-sections`: what the home page shows (the six sections, their data, empty and failure behaviour, links), apart from the greeting's own retrieval.
- `home-curation`: how an admin chooses, orders and removes the featured poems and project authors, the limits, the guarded writes, and what happens when a chosen item goes away.

### Modified Capabilities

- `home-greeting`: FR-6 (the greeting was the only content of the main region and sat in a framed banner; it now is the hero's title and message among other sections) and FR-7 (the static fallback lives in the hero, not a banner). FR-4, FR-5, FR-3, NFR-2 and FR-10 stay as they are, so the new components must not use the names FR-10 bans (`PoemList`, `PoemCard`, …).

## Open Questions

- specs/home-sections/spec.md — the brief's section «Дополнительная функциональность» is empty: is something meant to go there, or is it a leftover heading — owner: the owner, due: 2026-11-28
- specs/home-sections/spec.md — where the «О проекте» text comes from: fixed copy in the code now (assumed) or the `about_page` Contentful entry — owner: the owner, due: 2026-11-28
- specs/home-sections/spec.md — what the two registration buttons do for a signed-in reader (the home page is cached and cannot know the session; assumed: they link to `/signup`, which already handles a signed-in reader) — owner: the owner, due: 2026-11-28
- specs/home-sections/spec.md — which mock image the hero uses (assumed: one neutral literary image added under `public/`, replaced by Contentful in the follow-up) — owner: the owner, due: 2026-11-28
- specs/home-curation/spec.md — `/admin/home` loading state: the Claude Design mockup shows the page headings above the skeleton rows, while the existing admin pages use a bare skeleton with no title so a page does not announce itself to a non-admin before the admin check answers; assumed: bare rows, as on `/admin` and `/admin/violations` — owner: the owner, due: 2026-11-28

## Impact

- New: a Supabase migration (the `home_featured_poems` and `home_featured_authors` tables, the ids read, the admin functions); `src/features/home/` gains the section components and reads (featured, authors, latest); `src/features/admin/` gains the `/admin/home` page, the add control and the actions; `src/app/(authorized)/admin/home/page.tsx` and its `@breadcrumbs` slot page; one hero image under `public/`.
- Changed: `src/app/(public)/page.tsx` (six sections instead of one banner, its cache tags), the poem and author route files (`renderModeration` gets the new control), the `poems` index (two new public reads: the newest poems and poems by ids); `authors` is unchanged (its `listPublicAuthors` is reused), `docs/architecture.md`, `docs/environment.md` deploy checklist (the new migration), `openspec/specs/home-greeting`.
- Unchanged: the home page's metadata, the sitemap and `robots.txt` (the home URL is already listed); no new dependency.
- Risks: a new public read joined across poems and authors under Cache Components must keep its failure out of the cache and heal itself; the featured table is a second place that names a poem, so it must follow deletion (a ban restricts the account but leaves the content public, so it changes nothing here); a design with images needs the Claude Design brief before any UI group is built (`docs/claude-design.md`); the migration must be pushed before the app ships.

## Mockups

Approved Claude Design canvas (2026-11-21): https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#play-3b593e161c4e. Source of every value in `ui-plan.md` is "Claude Design". Each screen's artboard:

- Home page, everything present, light and dark, three widths: https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-HomePage
- Home page without sections (only hero, about and closing; one section absent at a time; author list failing): https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-HomePageStates
- Hero (short and long message, CMS fallback): https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-HomeHero
- Featured poems (4, 2, no covers, card states): https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-HomeFeatured
- About the project and project authors (4, 3, edge cases): https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-HomeAuthors
- Latest publications and the closing invitation: https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-HomeLatest
- New tokens (serif font, hero scrim, card, section rhythm, button variants): https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-HomeTokens
- Poem page, «Показать на главной» (idle, own poem, pending, success, limit): https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-AdminHomeBtnPoem
- Poem page, messages (already shown, not found, failure, offline): https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-AdminHomeBtnPoem2
- Author page, «Показать на главной»: https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-AdminHomeBtnAuthor
- `/admin/home`, loading, full, partial, saving a move: https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-AdminHomeA
- `/admin/home`, empty, dragging, keyboard: https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-AdminHomeB
- `/admin/home`, refused move, stale list, failed read, offline: https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-AdminHomeC

The mockups add six new tokens and two button variants (design-system gap list in `ui-plan.md`). They ride in this change, in task 6.2, instead of a separate design-system change: nothing else uses them yet, and the home page is their only consumer.
