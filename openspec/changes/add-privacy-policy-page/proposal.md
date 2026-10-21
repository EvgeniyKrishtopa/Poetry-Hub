# Proposal

## Why

The footer's «Политика конфиденциальности» link points at `/privacy`, and no page answers there
yet: a reader who follows it lands on the not-found screen (`site-footer` FR-4). The policy text
should be edited by the editorial side without a deploy, so it lives in Contentful, like the
about page.

The page is the about page with a different entry. `add-about-page` design R7 named a third
Contentful page as the point to stop copying its read, schema, and failure mapping (home, about,
and now privacy). This change builds the privacy page and the about page on one shared feature
(user decision, 2026-10-21).

## What Changes

- A new public page at `/privacy`. It shows the title and the body text of the Contentful entry
  with key `privacy_policy`. The body is several paragraphs.
- The entry uses the existing `greeting` content type (fields `key`, `title`, `message`), like
  `about_page`. Paragraphs in `message` are separated by a blank line. No new content type.
- `src/features/about/` becomes `src/features/content-page/`: one feature that renders "a
  Contentful page by entry key" (title + paragraphs, a loading skeleton, the error screen on any
  failure). `/about` and `/privacy` are two thin route files that pass it their entry key. The
  about page looks and behaves as before; only its failure log line changes (below).
- The data is read on the server only, through the feature's `dal/` module and the existing
  Contentful client. The browser receives the finished page and never calls Contentful.
- Caching is the about page's: a result-dependent `"use cache"` scope in the DAL, tagged
  `CONTENTFUL_CACHE_TAG`, now keyed by the entry key, so each page is cached on its own. The
  existing publish webhook (`POST /api/revalidate`) refreshes both pages. No new endpoint.
- When the content can't be shown (Contentful unreachable or misconfigured, the entry missing,
  or a field blank), the page shows the app's existing error screen with its retry button.
  No fallback text, as on `/about`.
- A failed read logs one line, `[contentful] content page failed`, with the entry key, the
  reason, and (for `auth`/`http`) the status. **BREAKING** for anyone grepping logs: the about
  page's old prefix `[contentful] about page failed` goes away.
- The breadcrumb trail on `/privacy` reads «Главная › Политика конфиденциальности».
- The footer's «Политика конфиденциальности» link now opens a real page. «Связаться с нами»
  still leads to the not-found screen.
- The `/privacy` path becomes a shared named constant, `PRIVACY_PATH`, used by the footer and the
  breadcrumbs, like `ABOUT_PATH`.

## UI copy

Every new user-facing string, verbatim. The page's title and paragraphs come from Contentful
and are not copy.

| Key | Text |
| --- | --- |
| Breadcrumb, current item on `/privacy` | `Политика конфиденциальности` |

The loading status (`Загрузка…`, screen readers only) and the error screen («Что-то пошло не
так», «Повторить») are the about page's existing strings, unchanged, now owned by the
`content-page` feature.

## Requirements

- **FR-1** — `/privacy` shows the `privacy_policy` entry: its `title` as the page's only level-1
  heading, then its `message` as paragraphs, in order. A paragraph boundary is one or more blank
  lines (a line holding only whitespace counts as blank); a single line break inside a paragraph
  is kept as a line break. Leading and trailing whitespace of `title` and `message` is trimmed
  before display.
- **FR-2** — When the entry can't be shown, `/privacy` shows the app's error screen (heading
  «Что-то пошло не так», button «Повторить») in place of the page content, with the header, the
  breadcrumb trail (FR-4), and the footer still present, and no text from Contentful. "Can't be
  shown" covers every failure reason the Contentful client reports (`config`, `network`, `auth`,
  `graphql`, `http`), plus `validation` (a missing field, or a `title` or `message` that is
  empty or whitespace only) and `not-found` (no entry with key `privacy_policy`). Each failed
  read (a call that misses the content-page DAL's own cache scope and fails, including a failure replayed from `contentfulQuery`'s inner 60 s cache, so one outage may log a line per DAL miss) writes exactly one server log line,
  `[contentful] content page failed`, with the entry key, the reason, and, for `auth` and
  `http`, the HTTP status, and nothing else (no payload, no token, no secret).
- **FR-3** — After Contentful sends an accepted publish notification to `POST /api/revalidate`,
  the next request to `/privacy` shows the published `title` and `message`. With no
  notification, a published change SHALL show within 3 minutes of publishing; the first reload
  after the cache lifetime may still serve the previous text once while it refreshes.
- **FR-4** — The breadcrumb trail on `/privacy` lists «Главная» (a link to `/`) then
  «Политика конфиденциальности» (the current item: not a link, `aria-current="page"`).
- **FR-5** — The footer's «Политика конфиденциальности» link opens the `/privacy` page with HTTP
  200. «Связаться с нами» keeps `site-footer` FR-4 behaviour (not-found screen, HTTP 404).
- **FR-6** — `/about` keeps every `about-page` requirement (content, error screen, freshness,
  trail), now served by the shared feature. The one change is its failure log line, which
  becomes FR-2's line with key `about_page`.
- **NFR-1** — Server-only rendering: no file under `src/features/content-page/` has
  `"use client"`; the DAL module starts with `import "server-only"`; the browser makes no
  request to Contentful on `/privacy` or `/about`.
- **NFR-2** — Caching keeps the about page's result-dependent pattern: the DAL function takes
  the entry key and owns a `"use cache"` scope tagged `CONTENTFUL_CACHE_TAG`, with
  `cacheLife("minutes")` for a successful read and `cacheLife("seconds")` for a failure. Each
  key is cached separately (the key is an argument of the cached function). As a result,
  `npm run build` succeeds with no Contentful environment variables set, and neither `/privacy`
  nor `/about` is reported as fully dynamic (`ƒ`).
- **NFR-3** — The title and paragraphs render as plain text: nothing is parsed as Markdown or
  HTML; React escapes the text.
- **NFR-4** — Styling uses named design-token utilities only. No colour literals, and no
  Tailwind arbitrary-value colour class at all (`text-[…]`, `bg-[…]`, `border-[…]`, …), even one
  that wraps a token variable.
- **NFR-5** — Named constants: the entry keys `about_page` and `privacy_policy` are named
  constants in the `content-page` feature (`CONTENT_PAGE_KEYS`); the path `/privacy` is
  `PRIVACY_PATH` in `shared/config/constants.ts`, and both the footer's link table and the
  breadcrumbs' route table reference it instead of a literal.
- **NFR-6** — One implementation: `src/features/about/` no longer exists, and both route files
  render the same `content-page` component with their own key. No second copy of the
  `greeting` query, its schema, or the failure mapping is added.
- **NFR-7** — Documentation: `docs/architecture.md` lists `features/content-page/` (in place of
  `features/about/`), the `(public)/privacy` route, its breadcrumbs slot page, and
  `PRIVACY_PATH`; `docs/state-management.md`'s exception for a result-dependent Contentful scope
  names `features/content-page/dal/content-page.ts` as its example.

## Acceptance Criteria

- **FR-1:** GIVEN Contentful returns the `privacy_policy` entry with title
  `  Политика конфиденциальности  ` and message
  `Первый абзац.\nВторая строка.\n\n  \nВторой абзац.`, WHEN `/privacy` is rendered, THEN the
  only level-1 heading reads `Политика конфиденциальности`, and the content holds exactly two
  paragraphs: the first `Первый абзац.` + line break + `Вторая строка.`, the second
  `Второй абзац.`.
- **FR-2:** GIVEN the content-page DAL returns a failure with any reason from FR-2's list for
  key `privacy_policy`, WHEN the page content renders, THEN it throws, so the nearest error
  boundary (`app/error.tsx`) shows «Что-то пошло не так» and «Повторить». GIVEN the app runs
  with an invalid Contentful access token, WHEN a browser opens `/privacy`, THEN the heading
  «Что-то пошло не так» and the button «Повторить» are shown, the header, the trail «Главная ›
  Политика конфиденциальности», and the footer are present, and every
  `[contentful] content page failed` line logged for key `privacy_policy` carries reason `auth`
  and status 401 and nothing else (reloads and retries may add more lines, one per failed
  read), and no log line contains the token.
- **FR-3:** GIVEN `/privacy` has been rendered and cached with title A, and the entry's title
  has since been changed to B and published, WHEN a valid notification is accepted by
  `/api/revalidate` and then `/privacy` is requested, THEN that request shows title B. GIVEN the
  same edit is published and no notification is sent, WHEN `/privacy` is reloaded twice, at
  least 3 minutes after publishing, THEN the second reload shows title B.
- **FR-4:** GIVEN any visitor, WHEN they open `/privacy`, THEN, whether the content loads or the
  error screen is shown (FR-2), the navigation landmark «Навигационная цепочка» lists «Главная»
  (link to `/`) then «Политика конфиденциальности» (not a link, `aria-current="page"`).
- **FR-5:** GIVEN the app is running with valid Contentful settings, WHEN the reader activates
  «Политика конфиденциальности» in the footer, THEN the privacy policy title is shown; WHEN they
  activate «Связаться с нами», THEN «Страница не найдена» is shown. Status codes are checked on
  a direct document load: GIVEN the same app, WHEN `/privacy` and `/contact` are requested
  directly (address bar or `curl`), THEN they answer HTTP 200 and 404.
- **FR-6:** GIVEN the change is complete and Contentful holds both entries, WHEN `/about` and
  `/privacy` are opened, THEN each shows its own entry's title (the two pages never show each
  other's text), and `/about`'s trail still reads «Главная › О проекте». GIVEN the content-page
  DAL fails for key `about_page`, WHEN `/about` renders, THEN it shows the error screen and the
  log line is `[contentful] content page failed` with key `about_page`.
- **NFR-1:** GIVEN the change is complete, WHEN `src/features/content-page/` is searched for
  `"use client"`, THEN there are no matches, and `dal/content-page.ts` starts with
  `import "server-only"`. GIVEN a browser opens `/privacy`, WHEN its network requests are
  listed, THEN none goes to a `contentful.com` host.
- **NFR-2:** GIVEN no `CONTENTFUL_*` variable is set, WHEN `npm run build` runs, THEN it succeeds
  and the route table marks neither `/privacy` nor `/about` as `ƒ`. GIVEN the DAL's read for a
  key succeeds / fails, WHEN its cache scope closes, THEN `cacheLife` was called with
  `"minutes"` / `"seconds"` and `cacheTag` with `CONTENTFUL_CACHE_TAG`, and the key passed to
  `contentfulQuery` is the one the DAL was called with.
- **NFR-3:** GIVEN the message holds `<b>жирный</b>` and `**жирный**`, WHEN the page renders,
  THEN the paragraph text contains those characters literally and the DOM has no `<b>` or
  `<strong>` element inside the content.
- **NFR-4:** GIVEN the change is complete, WHEN `src/features/content-page/` (excluding
  `tests/`) is searched for hex, `rgb(`, `hsl(` literals and for an arbitrary-value class
  holding a colour (the regex `-\[(#|rgb|hsl|oklch|var\(--color|color:)`), THEN there are no
  matches.
- **NFR-5:** GIVEN the change is complete, WHEN `src/` (excluding `tests/` folders) is searched
  for the string literals `"/privacy"`, `"privacy_policy"`, and `"about_page"`, THEN each has
  exactly one match: `PRIVACY_PATH`'s definition and the two `CONTENT_PAGE_KEYS` entries.
- **NFR-6:** GIVEN the change is complete, WHEN `src/` is listed and searched, THEN
  `src/features/about/` does not exist, a GraphQL query string calling `greetingCollection(`
  appears in exactly two non-test files (home's DAL and `content-page`'s DAL; Zod schemas that
  name the response key `greetingCollection:` don't count), and both route files import from
  `@/features/content-page`.
- **NFR-7:** GIVEN the change is complete, WHEN the two docs are read, THEN `architecture.md`
  lists `features/content-page/`, `(public)/privacy/page.tsx`, `@breadcrumbs/privacy/page.tsx`,
  and `PRIVACY_PATH`, and no longer lists `features/about/`; `state-management.md`'s Server
  caching section names `features/content-page/dal/content-page.ts` as the exception's example.

## Capabilities

### New Capabilities

- `privacy-policy-page`: the `/privacy` page, its Contentful content, failure behaviour, and
  freshness.

### Modified Capabilities

- `about-page`: FR-2's log line becomes `[contentful] content page failed` with the entry key;
  NFR-1/NFR-2 name the shared `content-page` feature instead of an about feature.
- `breadcrumbs`: FR-2's route list gains `/privacy` → Главная › Политика конфиденциальности.
- `site-footer`: FR-4 now covers only «Связаться с нами»; «Политика конфиденциальности» opens a
  real page.

## Out of Scope

- The «Связаться с нами» page.
- Rich text, section headings, lists, links, or a "last updated" date inside the policy text
  (plain paragraphs only, as on `/about`).
- Moving the home greeting onto the shared feature: home falls back instead of throwing, a
  different behaviour.
- A per-page browser-tab title (`metadata`): no page sets one today.
- A new content type, or changing the `greeting` content type.
- Configuring the deployed Contentful webhook: the existing deploy item in `PROGRESS.md`.
- The legal wording of the policy itself: the editorial side writes it in Contentful.

## Impact

- `src/features/content-page/` (new, from `src/features/about/` moved with `git mv` and
  generalized): `dal/content-page.ts`, `model/content-page.schema.ts`,
  `model/content-page.types.ts`, `model/content-page.constants.ts`,
  `model/content-page-messages.ts`, `components/ContentPage/`, `components/ContentPageContent/`,
  `components/ContentPageArticle/`, `components/ContentPagePlaceholder/`, `tests/`, `index.ts`.
- `src/features/about/` (removed).
- `src/app/(public)/about/page.tsx` (switches to `ContentPage`), `src/app/(public)/privacy/page.tsx`
  and `src/app/@breadcrumbs/privacy/page.tsx` (new).
- `src/shared/config/constants.ts`: `PRIVACY_PATH`.
- `src/shared/lib/split-paragraphs.ts`: its doc comment names the content pages (no code
  change).
- `src/features/site-footer/model/site-footer.constants.ts`: `privacy` uses `PRIVACY_PATH`.
- `src/features/breadcrumbs/model/`: a `/privacy` row and the «Политика конфиденциальности»
  label.
- `docs/architecture.md`, `docs/state-management.md`.
- No dependency, schema, environment variable, or endpoint changes.

## Mockups

| Screen | Link |
| --- | --- |
| `/privacy`: content (a nine-paragraph text, one with a single line break), loading skeleton, and error states; light and dark, 1280 px and 375 px; trail «Главная › Политика конфиденциальности» in every state | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#play-7b8a76aaff66, artboard «9 · /privacy — Политика конфиденциальности» (`project/Privacy.dc.html`) |
| `/about`: unchanged | the same canvas, artboard «8 · /about — О проекте» (`project/About.dc.html`) |
