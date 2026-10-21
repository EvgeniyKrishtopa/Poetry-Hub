# Tasks

## 1. Shared groundwork: the about path and the paragraph splitter <!-- isolated -->

- [x] 1.1 (NFR-5) Add `ABOUT_PATH = "/about"` to `src/shared/config/constants.ts` next to
  `HOME_PATH`, and set `FOOTER_LINK_PATHS.about` in
  `src/features/site-footer/model/site-footer.constants.ts` to `ABOUT_PATH` (design D6). Update
  that file's doc comment: `/about` now has a page.
  - Remove the scaffold's temporary `knip.jsonc` ignore for `src/shared/config/constants.ts`.
  - Verify: the existing `SiteFooter` tests pass unchanged (FR-3 of `site-footer` still holds),
    and `npm run knip` passes without that ignore.
- [x] 1.2 (FR-1) Add `src/shared/lib/split-paragraphs.ts` exporting `splitParagraphs(text)` with
  the regex `/\n\s*\n/` (design D5), and switch `features/home`'s `HomeGreeting` to it,
  removing its local `PARAGRAPH_SEPARATOR`. Remove `src/shared/lib/split-paragraphs.ts` from the
  scaffold's temporary `knip.jsonc` `ignoreFiles`.
  - Verify with `src/shared/lib/tests/split-paragraphs.test.ts`: one blank line, several blank
    lines, a whitespace-only line between paragraphs, a single line break stays inside one
    paragraph, text with no separator is one paragraph. `HomeGreeting`'s tests pass unchanged.

## 2. The about data access (`src/features/about/`, server only) <!-- judgement-heavy -->

- [x] 2.1 (FR-1, R5) Check that the `about_page` entry exists and is published: run the
  `AboutPage` query (design D1) in Contentful's GraphiQL, or against the local dev server's
  environment, and confirm one item with a non-blank title and message. If it is missing, mark
  this task blocked and ask the user.
- [x] 2.2 (FR-1, FR-2) Implement `model/about-page.schema.ts` (Zod for the `greetingCollection`
  response, `key`/`title`/`message` each `z.string().trim().min(1)`; `AboutPageEntry` via
  `z.infer`) and `model/about-page.types.ts` (`AboutPageFailureReason =
  ContentfulErrorKind | "validation" | "not-found"`, `AboutPageResult` as
  `{ ok: true; entry } | { ok: false; reason }`).
  - Verify with `tests/model/about-page.schema.test.ts`: a valid payload parses with
    whitespace trimmed; a missing, empty, or whitespace-only `title` or `message` fails; a
    missing collection fails.
- [x] 2.3 (FR-2, FR-3, NFR-1, NFR-2, NFR-5) Implement `dal/about-page.ts` per design D1 and D2:
  `import "server-only"`; `ABOUT_PAGE_KEY = "about_page"`; `readAboutPage()` maps
  `ContentfulError` kinds, `validation`, and `not-found` to failure values with one log line
  each (`[contentful] about page failed`, status only for `auth`/`http`) and rethrows any other
  error; `getAboutPage()` opens `"use cache"`, calls `cacheTag(CONTENTFUL_CACHE_TAG)`, and
  `cacheLife("minutes")` on success or `cacheLife("seconds")` on failure.
  - Verify with `tests/dal/about-page.test.ts` (mocked `contentfulQuery`, spies on the global
    `next/cache` mock): success returns the trimmed entry; each of `config`, `network`, `auth`,
    `graphql`, `http` returns its reason and logs exactly once, with a status only for `auth`
    and `http`, and no log argument holds the payload; an invalid payload is `validation`; empty
    `items` is `not-found`; a non-Contentful error rethrows; `cacheTag` is always called with
    `CONTENTFUL_CACHE_TAG`; `cacheLife` gets `"minutes"` on success and `"seconds"` on every
    failure.

- [x] 2.4 (FR-1, R5) Write `tests/dal/about-page.integration.test.ts` per design D7: a real
  request to Contentful (no `fetch` or module mocks) that expects `{ ok: true }` with a
  non-blank title and message, skipped with `describe.skipIf` when `CONTENTFUL_SPACE_ID` or
  `CONTENTFUL_ACCESS_TOKEN` is unset.
  - Verify: Vitest does not load `.env.local` itself, so run the file with Node loading it:
    `node --env-file=.env.local ./node_modules/vitest/vitest.mjs run <file>` passes (not
    skipped); plain `npx vitest run <file>` and `npm run test:coverage` report it as skipped.

## 3. The about page UI and its breadcrumb <!-- judgement-heavy -->

- [ ] 3.1 (FR-1, NFR-3, NFR-4) Implement `components/AboutArticle/AboutArticle.tsx` (+
  `AboutArticle.types.ts`) per design D5 and the approved mockup: `<article>`, `<h1>` with the
  title, one `whitespace-pre-line` paragraph per `splitParagraphs` item, token utilities only.
  - Verify with `tests/components/AboutArticle.test.tsx`: FR-1's scenario (one heading, two
    paragraphs, the line break kept) and NFR-3's (markup characters render as text, no `<b>`
    or `<strong>`).
- [ ] 3.2 (FR-2) Implement `components/AboutContent/AboutContent.tsx` per design D4 (awaits
  `getAboutPage()`, throws `Error(ABOUT_CONTENT_UNAVAILABLE)` on failure, renders
  `AboutArticle` on success), `components/AboutPlaceholder/AboutPlaceholder.tsx` per the
  mockup (`aria-hidden`, token colours), and `components/AboutPage/AboutPage.tsx` (Suspense
  with the placeholder as fallback, design D3). Export only `AboutPage` from `index.ts`.
  Remove the scaffold's last temporary `knip.jsonc` entries (`src/features/about/**` and the
  `ignoreFiles` key with its comment); `npm run knip` must pass without them.
  - Verify with `tests/components/AboutContent.test.tsx` (mocked DAL): on success
    `await AboutContent()` resolves to an element that renders the title; for each failure
    reason it rejects, and the error message contains neither the reason nor any entry text.
- [ ] 3.3 (FR-1, FR-4, FR-5, NFR-5) Add `src/app/(public)/about/page.tsx` (a `<main>` with the
  `/authors` page's wrapper classes plus `items-start`, per the mockup, rendering
  `<AboutPage />`) and
  `src/app/@breadcrumbs/about/page.tsx` (`<Breadcrumbs segments={Promise.resolve(["about"])} />`).
  Add `about: "О проекте"` to `breadcrumbs-messages.ts` and the
  `{ path: ABOUT_PATH, label: BREADCRUMB_LABELS.about }` row to `STATIC_ROUTES` (design D6).
  - Verify: `app/tests/breadcrumbs-slot.test.ts` passes with the new pair of pages; breadcrumbs'
    `matchRoute`/`buildTrail` tests gain `["about"]` → «Главная» (link to `/`), «О проекте»
    (current).

## 4. Documentation and verification <!-- judgement-heavy -->

- [ ] 4.1 (NFR-6) Update `docs/architecture.md` and `docs/state-management.md` per design D8.
- [ ] 4.2 (NFR-1, NFR-2, NFR-4, NFR-5) Verify statically and run the chain.
  - `grep -rn '"use client"' src/features/about` prints nothing, and `dal/about-page.ts` starts
    with `import "server-only"` (NFR-1).
  - The NFR-4 search over `src/features/about` (excluding `tests/`) for colour literals,
    and arbitrary-value classes holding a colour (regex `-\[(#|rgb|hsl|oklch|var\(--color|color:)`)
    prints nothing.
  - A search of `src/` (excluding `tests/` folders) for the literal `"/about"` finds only
    `ABOUT_PATH`'s definition (NFR-5).
  - `npm run typecheck && npm run lint && npm run test:coverage && npm run build && npm run knip`
    all pass.
  - `CONTENTFUL_SPACE_ID= CONTENTFUL_ACCESS_TOKEN= npm run build` succeeds (variables already
    in the process environment win over `.env.local`, so empty values reproduce CI's `config`
    failure without touching any `.env` file), its output contains the
    `[contentful] about page failed` line with reason `config`, and the route table does not
    mark `/about` as `ƒ` (NFR-2, design R1). A failure here stops the
    group and goes to `opsx-update-review` (R1's fallback), not a workaround.
- [ ] 4.3 (FR-1, FR-2, FR-3, FR-4, FR-5, NFR-1) Gate 3 (`web-qa`) in both colour schemes:
  - FR-1: `/about` shows the entry's title as the only `h1` and its paragraphs, matching the
    approved mockup at 375 px and 1280 px in structure: the same block order, type scale,
    spacing tokens, and colour roles; a few pixels or a different line wrap is not a mismatch
    (user decision, 2026-10-21);
  - FR-4: the trail reads «Главная» (link to `/`) › «О проекте» (`aria-current="page"`);
  - FR-5: clicking the footer's «О проекте» shows the about page, and clicking «Политика
    конфиденциальности» shows «Страница не найдена»; a direct document load of `/about` and
    `/privacy` (address bar or `curl`) answers 200 and 404;
  - NFR-1: the network list for `/about` has no request to a `contentful.com` host;
  - FR-2: with `CONTENTFUL_ACCESS_TOKEN` set to an invalid value in the dev server's
    environment, `/about` shows «Что-то пошло не так» and «Повторить» with the header, the trail
    «Главная › О проекте», and the footer,
    and every `[contentful] about page failed` line in the server log carries reason `auth`
    and status 401 only (one per failed read; reloads may add more), with no token;
  - FR-3, against `npm run build && npm start` with real settings (design R6), not the dev
    server: edit and publish the entry's title, `curl -X POST` `/api/revalidate` with the
    local secret, reload `/about`, and see the new title; then publish another edit with no
    notification, wait 3 minutes, reload twice, and see it on the second reload (then restore
    the original title);
  - no console errors or uncaught exceptions on the success path; replay the recorded
    scenarios.
