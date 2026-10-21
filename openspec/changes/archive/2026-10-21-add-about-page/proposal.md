# Proposal

## Why

The footer's «О проекте» link points at `/about`, but no page answers there yet: a reader who
follows it lands on the not-found screen (`site-footer` FR-4). The project description should
be edited by the editorial side without a deploy, so its text lives in Contentful, like the
home greeting.

## What Changes

- A new public page at `/about`. It shows the title and the body text of the Contentful entry
  with key `about_page`. The body is several paragraphs.
- The entry uses the existing `greeting` content type (fields `key`, `title`, `message`;
  user decision, 2026-10-21). Paragraphs in `message` are separated by a blank line, as on the
  home page. No new content type and no Contentful setup are needed.
- The data is read on the server only, through the new feature's `dal/` module and the
  existing Contentful client. The browser receives the finished page and never calls
  Contentful.
- The existing publish webhook (`POST /api/revalidate`) already expires every cached
  Contentful read. The new page's cache carries the same tag, so a publish in Contentful
  updates `/about` on the next request. No new endpoint.
- When the content can't be shown (Contentful unreachable or misconfigured, the entry missing,
  or a field blank), the page shows the app's existing error screen with its retry button.
  No fallback text (user decision, 2026-10-21; the home page keeps its own fallback).
- The breadcrumb trail on `/about` reads «Главная › О проекте».
- The footer's «О проекте» link now opens a real page. «Политика конфиденциальности» and
  «Связаться с нами» still lead to the not-found screen.
- A new feature folder, `src/features/about/`. The `/about` path becomes a shared named
  constant that the footer and the breadcrumbs both use. The blank-line paragraph split moves
  from the home greeting into `shared/lib`, so the two pages split text the same way.

## UI copy

Every new user-facing string, verbatim. The page's title and paragraphs come from Contentful
and are not copy.

| Key | Text |
| --- | --- |
| Breadcrumb, current item on `/about` | `О проекте` |
| Loading status, screen readers only (`role="status"`, visually hidden) | `Загрузка…` (the same text as `app/loading.tsx`) |

The error screen reuses `app/error.tsx`'s existing copy («Что-то пошло не так», «Повторить»)
unchanged.

## Requirements

- **FR-1** — `/about` shows the `about_page` entry: its `title` as the page's only level-1
  heading, then its `message` as paragraphs, in order. A paragraph boundary is one or more
  blank lines (a line holding only whitespace counts as blank); a single line break inside a
  paragraph is kept as a line break. Leading and trailing whitespace of `title` and `message`
  is trimmed before display.
- **FR-2** — When the entry can't be shown, `/about` shows the app's error screen (heading
  «Что-то пошло не так», button «Повторить») in place of the page content, with the header,
  the breadcrumb trail (FR-4), and the footer still present, and no text from Contentful. "Can't be shown" covers every
  failure reason the Contentful client reports (`config`, `network`, `auth`, `graphql`,
  `http`), plus `validation` (a missing field, or a `title` or `message` that is empty or
  whitespace only) and `not-found` (no entry with key `about_page`). Each failed read (a call
  that misses the cache and fails) writes exactly one server log line with the reason and, for `auth` and `http`, the HTTP status, and nothing
  else (no payload, no token, no secret).
- **FR-3** — After Contentful sends an accepted publish notification to `POST /api/revalidate`,
  the next request to `/about` shows the published `title` and `message`. With no notification,
  a published change SHALL show within 3 minutes of publishing; the first reload after the
  cache lifetime may still serve the previous text once while it refreshes, so the check is a
  reload at least 3 minutes after publishing, repeated once (user decision, 2026-10-21).
- **FR-4** — The breadcrumb trail on `/about` lists «Главная» (a link to `/`) then
  «О проекте» (the current item: not a link, `aria-current="page"`).
- **FR-5** — The footer's «О проекте» link opens the `/about` page with HTTP 200. The other two
  footer links keep `site-footer` FR-4 behaviour (not-found screen, HTTP 404).
- **NFR-1** — Server-only rendering: no file under `src/features/about/` has `"use client"`;
  the DAL module starts with `import "server-only"`; the browser makes no request to
  Contentful.
- **NFR-2** — Caching follows the result-dependent pattern of `authors`' public reads
  (design D2): the about DAL owns a `"use cache"` scope tagged `CONTENTFUL_CACHE_TAG`, with
  `cacheLife("minutes")` for a successful read and `cacheLife("seconds")` for a failure. As a
  result, `npm run build` succeeds with no Contentful environment variables set, and `/about`
  is not reported as fully dynamic (`ƒ`).
- **NFR-3** — The title and paragraphs render as plain text: nothing is parsed as Markdown or
  HTML; React escapes the text.
- **NFR-4** — Styling uses named design-token utilities only (`text-muted`, `bg-surface`, …).
  No colour literals, and no Tailwind arbitrary-value colour class at all (`text-[…]`,
  `bg-[…]`, `border-[…]`, …), even one that wraps a token variable such as
  `text-[var(--color-muted)]` (user decision, 2026-10-21).
- **NFR-5** — Named constants: the entry key `about_page` is a constant in the about DAL; the
  path `/about` is `ABOUT_PATH` in `shared/config/constants.ts`, and both the footer's link
  table and the breadcrumbs' route table reference it instead of a literal.
- **NFR-6** — Documentation: `docs/architecture.md` lists `features/about/`, the
  `(public)/about` route, and its breadcrumbs slot page; `docs/state-management.md` states
  that a Contentful DAL may own a result-dependent cache scope when a failure must not be
  frozen into the build (the about page), as an exception to "a Contentful DAL function adds
  no cache scope of its own".

## Acceptance Criteria

- **FR-1:** GIVEN Contentful returns the `about_page` entry with title `  О проекте  ` and
  message `Первый абзац.\nВторая строка.\n\n  \nВторой абзац.`, WHEN `/about` is rendered,
  THEN the only level-1 heading reads `О проекте`, and the content holds exactly two
  paragraphs: the first `Первый абзац.` + line break + `Вторая строка.`, the second
  `Второй абзац.`.
- **FR-2:** GIVEN the about DAL returns a failure with any reason from FR-2's list, WHEN the
  about content renders, THEN it throws, so the nearest error boundary (`app/error.tsx`) shows
  «Что-то пошло не так» and «Повторить». GIVEN the app runs with an invalid Contentful access
  token, WHEN a browser opens `/about`, THEN the heading «Что-то пошло не так» and the button
  «Повторить» are shown, the header, the trail «Главная › О проекте», and the footer
  are present, and every
  `[contentful] about page failed` line the about DAL logged carries reason `auth` and status
  401 and nothing else (reloads and retries may add more lines, one per failed read), and no
  log line contains the token.
- **FR-3:** GIVEN `/about` has been rendered and cached with title A, and the entry's title
  has since been changed to B and published, WHEN a valid notification is accepted by
  `/api/revalidate` and then `/about` is requested, THEN that request shows title B. GIVEN the same edit is published and no notification is
  sent, WHEN `/about` is reloaded twice, at least 3 minutes after publishing, THEN the second
  reload shows title B.
- **FR-4:** GIVEN any visitor, WHEN they open `/about`, THEN, whether the content loads or the error screen is
  shown (FR-2), the navigation landmark «Навигационная цепочка» lists «Главная» (link to `/`) then «О проекте» (not a link,
  `aria-current="page"`).
- **FR-5:** GIVEN the app is running with valid Contentful settings, WHEN the reader activates
  «О проекте» in the footer, THEN the about title is shown; WHEN they activate «Политика
  конфиденциальности», THEN «Страница не найдена» is shown. Status codes are checked on a
  direct document load, not on the click's own request (user decision, 2026-10-21): GIVEN the
  same app, WHEN `/about` and `/privacy` are requested directly (address bar or `curl`), THEN
  they answer HTTP 200 and 404.
- **NFR-1:** GIVEN the change is complete, WHEN `src/features/about/` is searched for
  `"use client"`, THEN there are no matches, and `dal/about-page.ts` starts with
  `import "server-only"`. GIVEN a browser opens `/about`, WHEN its network requests are
  listed, THEN none goes to a `contentful.com` host.
- **NFR-2:** GIVEN no `CONTENTFUL_*` variable is set, WHEN `npm run build` runs, THEN it
  succeeds and the route table does not mark `/about` as `ƒ`. GIVEN the DAL's read succeeds /
  fails, WHEN its cache scope closes, THEN `cacheLife` was called with `"minutes"` /
  `"seconds"` and `cacheTag` with `CONTENTFUL_CACHE_TAG`.
- **NFR-3:** GIVEN the message holds `<b>жирный</b>` and `**жирный**`, WHEN `/about` renders,
  THEN the paragraph text contains those characters literally and the DOM has no `<b>` or
  `<strong>` element inside the content.
- **NFR-4:** GIVEN the change is complete, WHEN `src/features/about/` (excluding `tests/`) is
  searched for hex, `rgb(`, `hsl(` literals and for an arbitrary-value class holding a colour
  (the regex `-\[(#|rgb|hsl|oklch|var\(--color|color:)`), THEN there are no matches. Arbitrary
  non-colour values (a size, a spacing) are outside NFR-4.
- **NFR-5:** GIVEN the change is complete, WHEN `src/` (excluding `tests/` folders) is searched
  for the string literal `"/about"`, THEN its only match is `ABOUT_PATH`'s definition.
- **NFR-6:** GIVEN the change is complete, WHEN the two docs are read, THEN `architecture.md`
  lists `features/about/`, `(public)/about/page.tsx`, and `@breadcrumbs/about/page.tsx`, and
  `state-management.md`'s Server caching section names the about DAL's result-dependent scope
  as the exception.

## Capabilities

### New Capabilities

- `about-page`: the `/about` page, its Contentful content, failure behaviour, and freshness.

### Modified Capabilities

- `breadcrumbs`: FR-2's route list gains `/about` → Главная › О проекте.
- `site-footer`: FR-4 now covers only the links whose pages don't exist yet; «О проекте» opens
  a real page.

## Out of Scope

- The «Политика конфиденциальности» and «Связаться с нами» pages.
- Rich text, images, or links inside the about text (plain paragraphs only).
- A per-page browser-tab title (`metadata`): no page sets one today.
- Changing the home page's fallback behaviour, or the `greeting` content type.
- Configuring the deployed Contentful webhook: it is the existing deploy item in `PROGRESS.md`
  (add-contentful-home-greeting rollout steps 3 and 5).

## Impact

- `src/features/about/` (new): `dal/about-page.ts`, `model/about-page.schema.ts`,
  `model/about-page.types.ts`, `components/AboutPage/`, `components/AboutContent/`,
  `components/AboutArticle/`, `components/AboutPlaceholder/`, `tests/`, `index.ts`.
- `src/app/(public)/about/page.tsx` and `src/app/@breadcrumbs/about/page.tsx` (new).
- `src/shared/config/constants.ts`: `ABOUT_PATH`.
- `src/shared/lib/split-paragraphs.ts` (new, with a test); `features/home`'s `HomeGreeting`
  uses it instead of its own regex (behaviour unchanged).
- `src/features/site-footer/model/site-footer.constants.ts`: `about` uses `ABOUT_PATH`.
- `src/features/breadcrumbs/model/`: an `/about` row and the «О проекте» label.
- `docs/architecture.md`, `docs/state-management.md`.
- No dependency, schema, environment variable, or endpoint changes.

## Mockups

| Screen | Link |
| --- | --- |
| `/about`: content, loading skeleton, and error states; light and dark, 1280 px and 375 px; trail «Главная › О проекте» in every state | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#page-dcb81aee8d83, artboard «8 · /about — О проекте» (`project/About.dc.html`) |
