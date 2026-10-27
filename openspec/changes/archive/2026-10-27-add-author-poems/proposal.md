# Proposal

## Why

A reader who opens an author's page sees a name, a photo, and an about text, but nothing the
author wrote: there is no way to read an author's poems on the site. The home page still shows
the starter template's search box and three hard-coded classic poems, which belong to no author
on the site and lead nowhere (user request, 2026-10-24).

## What Changes

- Every public author page (`/authors/<id>`) gets a poems entry under the profile: a link
  «Произведения автора» to the author's poem list, or the text «У автора пока ещё нет
  публикаций.» when the author has none.
- New page `/authors/<id>/poems`: the author's poem list. For now each item is the poem's title,
  a link to the poem page.
- New page `/authors/<id>/poems/<poemId>`: a published poem with its illustration, title, text,
  and, at the bottom, its publication date and genre.
- Both pages are public: guests and every signed-in reader see the same thing.
- Poems are in-code mock data for now (user decision, 2026-10-24): a fixed set of four mock
  poems, and each author gets between zero and four of them, chosen from the author's id so
  the same author always gets the same poems. Pages read poems only through the poems
  feature's server-only DAL, so a later database read replaces the mock without touching the
  pages.
- The breadcrumb trail covers the two new pages.
- **BREAKING (internal)**: the home page drops the poem search and the mock poem list. The
  `poems` feature's client code goes with them (`PoemSearch`, `PoemList`, `PoemCard`, the
  search store, the TanStack Query fetcher and options); its public API is replaced by the
  new server-only pieces.
- The home greeting becomes a simple welcome banner: the same CMS title and message (with the
  same static fallback), drawn as a framed block.
- The error screen's «Повторить» button runs one attempt at a time: it is disabled until the
  attempt finishes, so repeated clicks can't race each other (user request, 2026-10-24). The
  screen is shared by every page, so the lock applies site-wide; the new poem pages reach it
  when the author service is unavailable.
- The page and its breadcrumb trail share one author read per request (and, on the poem
  page, one poem read), so they can never disagree: no trail with the author's name above an
  error screen, or «Автор» above a loaded page. This covers the author page too.
- Fast clicking stays consistent: when a visitor follows one author or poem link and then
  another before the first page arrives, the last click wins for both the page and the trail.
- Author reads with no cache entry behave predictably on the author directory, the author page,
  and the two poem pages: the visitor sees the loading state, one read serves everyone waiting,
  and a failure shows the error state and is kept for seconds only, so a request after that
  short window tries again. Failed reads keep their existing seconds-long lifetime
  (`author-profiles` NFR-7): a 2026-10-24 probe showed that not storing a failure at all fails
  an env-less build and does not keep the last good data when a refresh fails (user decision,
  2026-10-24).
- Creating, editing, and deleting poems is out of scope: a separate change.

## UI copy

Every new user-facing string, verbatim.

| Key | Text |
| --- | --- |
| Author page: link to the poem list | `Произведения автора` |
| Author page and poem list: author has no poems | `У автора пока ещё нет публикаций.` |
| Poem list: page heading | `Произведения` |
| Breadcrumb item for the poem list | `Произведения` |
| Poem page: illustration alt text | `Иллюстрация: <poem title>` |
| Poem page: genre line | `Жанр: <genre>` |
| Poem page: publication date | the date in Russian long form, e.g. `12 марта 2026 г.` |

The four mock poems' titles, texts, and genres are Russian placeholder content written for this
change (no third-party text); their genres are `Лирика`, `Сонет`, `Элегия`, `Верлибр`.

## Mockups

Approved Claude Design canvas (2026-10-24): https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#page-dcb81aee8d83, artboards 11–15, each in light and dark at
1280 px and 375 px.

| Screen | Artboard |
| --- | --- |
| Home `/`: welcome banner, CMS and fallback copy | 11 · `/` — Главная (приветствие) (`Home.dc.html`) |
| Author page `/authors/<id>`: poems entry, with poems and without | 12 · `/authors/[id]` — вход в «Произведения автора» (`AuthorPoemsEntry.dc.html`) |
| Poem list `/authors/<id>/poems`: list, empty, loading, not found, error | 13 · `/authors/[id]/poems` (`PoemList.dc.html`) |
| Poem page `/authors/<id>/poems/<poemId>`: poem, loading, not found, error | 14 · `/authors/[id]/poems/[poemId]` (`Poem.dc.html`) |
| Author directory error and the shared error screen, including retrying | 15 · Ошибки (`Errors.dc.html`) |

The error screen is drawn without the «Код ошибки» line; the existing rule stays (route-states
FR-3: the digest shows only when Next provides one), the mockup simply shows a case without it.

## Requirements

- **FR-1** — Poems entry on the author page. On `/authors/<id>` for a public author, below the
  profile (after the about section, or after the photo when there is no about), the page shows
  exactly one of: a link «Произведения автора» to `/authors/<id>/poems` when the author has at
  least one poem, or the text «У автора пока ещё нет публикаций.» (no link) when the author
  has none. The entry is the same for every visitor: signed out, signed in as another reader,
  or signed in as the owner.
- **FR-2** — Poem list page. `/authors/<id>/poems` for a public author shows the level-1 heading
  «Произведения», then a list with one item per poem of that author, newest publication date
  first. Each item shows only the poem's title, as a link to `/authors/<id>/poems/<poemId>`.
- **FR-3** — Empty poem list. For a public author with no poems, `/authors/<id>/poems` shows the
  heading «Произведения» and the text «У автора пока ещё нет публикаций.», and no list.
- **FR-4** — Poem page. `/authors/<id>/poems/<poemId>` shows, in order: the poem's illustration
  (alt text «Иллюстрация: <title>»), the title as the level-1 heading, the poem's text, and a
  footer with the publication date and the line «Жанр: <genre>». The text is plain text:
  each block separated by a blank line is its own paragraph, every line break inside a block
  is kept, and Markdown or HTML in it is shown literally. The date is shown in Russian long
  form («12 марта 2026 г.») inside a `<time>` element whose `datetime` is the ISO date
  (`2026-03-12`).
- **FR-5** — Not found and unavailable. On both new routes, an author id that is not a UUID or
  names no public author renders the 404 page (its UI; the streamed status may be 200, as on
  `/authors/<id>`). On the poem page, a `poemId` that is not one of that author's poems
  (unknown, or another author's) renders the 404 page too. The poem id must match exactly,
  case included: an uppercase spelling is unknown (user decision, 2026-10-24). When the author can't be read
  because the service is unavailable, both routes show the generic error screen
  (`app/error.tsx`), as `/authors/<id>` does.
- **FR-6** — Public access. Both new pages and the FR-1 entry render without signing in, never
  redirect to `/login`, and show identical content to every visitor.
- **FR-7** — Mock poems. Poems come from a fixed in-code set of four mock poems, each with a
  stable id (a lowercase slug), title, text, illustration (a local image), publication date,
  and genre. Each public author gets the first N poems of the set, where N, from 0 to 4, is
  computed from the author's id alone: the same id gives the same N on every request, build,
  and machine, and each of the five values of N is reachable by some UUID.
- **FR-8** — Breadcrumbs. `/authors/<id>/poems` → Главная › Наши авторы › <author name> ›
  Произведения; `/authors/<id>/poems/<poemId>` → Главная › Наши авторы › <author name> ›
  Произведения › <poem title>. «<author name>» links to `/authors/<id>`, and «Произведения»
  links to `/authors/<id>/poems` on the poem page. When the author's name can't be read
  because the service is unavailable, that item reads «Автор» and stays a link. When the
  author doesn't exist or isn't public, or the poem isn't one of the author's, no trail is
  shown — except when the author read is unavailable: then the page shows the error screen, and
  the trail is always shown, matching it (FR-12). If the poem is not one of the author's in
  that case, the trail ends at «Автор» as its current item: Главная › Наши авторы › Автор
  (user decision, 2026-10-24).
- **FR-9** — Welcome banner. The home page's main content is only the greeting banner: a framed
  block (surface background, border, rounded corners) holding the greeting's title as the
  page's level-1 heading and its message beneath, exactly as `home-greeting` FR-6 and FR-7
  define (CMS content, plain-text paragraphs, static fallback). No search box, no «Очистить»
  button, and no poem list remain on the home page.
- **FR-10** — Removed home code. Nothing in `src/` or `docs/` renders, references, or describes the poem search, its
  store, the home poem list, its loading, error, and empty texts, or the three classic mock
  poems; the recorded browser scenario for the search is deleted and the home scenario no
  longer expects a list.
- **FR-11** — Retry without races. On the error screen (`app/error.tsx`), activating «Повторить»
  starts one retry attempt, which re-requests the whole current route, the page and its
  breadcrumb trail together, so after recovery they agree (FR-12); from then until the attempt finishes, the button is disabled and
  further clicks or key presses start nothing. When the attempt finishes, either the page
  recovers and replaces the error screen, or the error screen stays with the button enabled
  again for the next attempt. The button's text stays «Повторить» throughout (user decision,
  2026-10-24).
- **FR-12** — Page and trail agree. Within one request, the author page, the poem list page, the
  poem page, and their breadcrumb trails each read the author once, through one shared result:
  the author item in the trail is the name exactly when the page shows the author's content,
  «Автор» exactly when the page shows the error screen, and no trail exactly when the page
  shows the 404 page. On the poem page, the page and the trail likewise share one poem read.
- **FR-13** — Last navigation wins. When a visitor follows a link from the author directory, an
  author page, or a poem list, and then follows another such link before the first page has
  rendered, the screen ends on the second link's page and trail. "Before it has rendered"
  covers both cases (user decision, 2026-10-24): the second click comes before the URL changes
  (two clicks in a row on the source page), or after the first page's skeleton shows but before
  its content arrives (Back, then the other link). In both, the result is the same: never the first page, never the
  first page's trail with the second page, and never a mix of the two.
- **FR-14** — No cache yet. When a public author read (the directory list, or one author) has
  no cache entry: the page shows its loading state until the read finishes; concurrent requests
  for the same read on one server instance share one read; a successful read is cached (directory and author: hours;
  not-found: minutes); a failed read (`unavailable`) shows the error state (the directory's
  «Список авторов сейчас недоступен.», or the error screen on the author and poem pages) and is
  cached for seconds only (`author-profiles` NFR-7, unchanged): a request or «Повторить» about
  one second later (the `"seconds"` profile's revalidate time, with Next's default cache) reads
  again (user decision, 2026-10-24). The failure is never frozen into a prerendered page: a
  build with no database still exits 0 and the page renders the failure at request time.
- FR-15 is withdrawn (2026-10-24): the task 1.3 probe showed that a stale `"use cache"` entry is
  not served once its refresh fails, so "keep the last good data" is not achievable with
  Next's default cache. The identifier is not reused.
- **NFR-1** — Server-rendered and session-free. The new pages, the FR-1 entry, and the poems
  feature contain no `"use client"` module, and the poems feature imports nothing from
  `@/features/auth` or `@/shared/lib/supabase`; it reads authors only through
  `@/features/authors`' public API, server-side.
- **NFR-2** — No dependency cycle. `features/authors` imports nothing from `features/poems`; the
  route file composes the FR-1 entry into the author page.
- **NFR-3** — Swappable data source. Pages and components read poems only through the poems
  DAL's functions; the mock set is imported by the DAL alone, so replacing it with a database
  read changes only `features/poems/dal/`.
- **NFR-4** — Rendering modes. `npm run build` succeeds with no Supabase or Contentful
  environment variables; its route list adds exactly `/authors/[id]/poems` and
  `/authors/[id]/poems/[poemId]`, both partially prerendered like `/authors/[id]`, and no
  route that wasn't fully dynamic before becomes so.
- **NFR-5** — Design tokens only. New and changed styles use named design-token utilities: no
  colour literals and no Tailwind arbitrary-value colour classes.
- **NFR-6** — Accessible pages. Each new page has exactly one level-1 heading; the poem list is
  a `ul` of links; the illustration has the FR-4 alt text; the date is a `<time>` element.
- **NFR-7** — Russian UI copy. Every user-facing string is the UI copy table's text, verbatim.

## Capabilities

### New Capabilities

- `author-poems`: an author's poem list, the poem page, the author page's poems entry, the mock
  data source, and their access, not-found, and rendering rules.

### Modified Capabilities

- `breadcrumbs`: FR-2 gains the two new routes, FR-4 covers the author name on them, new
  requirements make the trail agree with its page (FR-12) and follow the last of several quick
  navigations (FR-13), and the
  one-time route-list NFR-5 is replaced by its lasting part, one slot page per real page.
- `home-greeting`: FR-6 draws the greeting as a banner; FR-7's fallback no longer mentions the
  poem list; a new requirement (FR-10) keeps the removed search and list out of code and docs.
- `route-groups`: FR-7's home page no longer holds the poems list, and its "route paths
  identical to `main`" clause goes (this change adds routes on purpose; NFR-4 states the new
  list).
- `route-states`: FR-4's retry runs one attempt at a time (FR-11).
- `author-profiles`: NFR-7 keeps its lifetimes (unavailable: seconds) and gains the loading
  state, the shared read, and the request-time-only failure (FR-14).
- `feedback-tones`: FR-4 is replaced by a form-only requirement of the same number; its
  `PoemList` scenario goes with `PoemList`.

## Impact

- `src/features/poems/`: rewritten (its `getAuthorPoem` is `React.cache`-memoized, FR-12). Removed: `api/`, `PoemSearch`, `PoemList`, `PoemCard`,
  `filter-poems`, `poems-ui.store`, and their tests. Added: `dal/` (mock set and reads),
  `model/` (types, paths, copy, date format, count rule), components for the list page, the
  poem page, and the author page entry.
- `src/features/authors/`: `getPublicAuthor` is memoized per request with `React.cache` (FR-12);
  `AuthorPage` → `AuthorPageContent` → `AuthorProfileView` pass a new
  `poems` slot through; `authorPagePath` is exported.
- `src/features/breadcrumbs/`: two dynamic routes; it now also reads `@/features/poems`.
- `src/features/home/`: `HomeGreeting` restyled as a banner.
- `src/app/error.tsx`: the retry button holds a transition and is disabled while it is pending.
- `src/app/`: two new pages under `(public)/authors/[id]/poems/`, two breadcrumb slot pages, the
  author route passes the poems entry, the home page loses the TanStack prefetch.
- `public/mock-poems/`: four SVG illustrations.
- `tests/web-qa-scenarios/`: `home-search-filter.spec.ts` deleted, `home-renders.spec.ts`
  updated.
- Docs: `docs/decisions/0008-*.md` (new ADR: a public read shared by a page and its trail is
  memoized per request), `docs/architecture.md`, `docs/state-management.md` (its TanStack example
  no longer exists in code; the Supabase public reads section gains the per-request memo rule),
  `docs/design-system.md` (`PoemCard` gone, new components).
- No new dependency, no schema change, no environment variable. `PROGRESS.md` follow-up 28's
  home overflow at 375 px goes away with the search row.
