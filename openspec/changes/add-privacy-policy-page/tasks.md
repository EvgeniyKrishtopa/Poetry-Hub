# Tasks

## 1. Shared groundwork: the privacy path <!-- isolated -->

- [x] 1.1 (NFR-5) Add `PRIVACY_PATH = "/privacy"` to `src/shared/config/constants.ts` after
  `ABOUT_PATH`, and set `FOOTER_LINK_PATHS.privacy` in
  `src/features/site-footer/model/site-footer.constants.ts` to `PRIVACY_PATH` (design D7). Update
  that file's doc comment: `/about` and `/privacy` have pages, `/contact` not yet.
  - Remove the scaffold's temporary `knip.jsonc` `ignoreIssues` entry for `src/shared/config/constants.ts`.
  - Verify: the existing `SiteFooter` tests pass unchanged, and `npm run knip` passes without that ignore.

## 2. The shared content-page feature (from `features/about`) <!-- judgement-heavy -->

- [ ] 2.1 (FR-1, design R5) Check that the `privacy_policy` entry exists and is published in the
  Contentful space and environment that `.env.local` points at (the deployed environment is the
  Migration Plan's deploy item, not this task): run the about DAL's collection query with key
  `privacy_policy` in Contentful's GraphiQL or against the local dev server's settings, and
  confirm one item with a non-blank title and message. If it is missing there, mark this task
  blocked and ask the user.
- [ ] 2.2 (FR-6, NFR-5, NFR-6) Move `src/features/about/` to `src/features/content-page/` with
  `git mv` and rename per design D1 (`AboutPage` → `ContentPage`, `AboutContent` →
  `ContentPageContent`, `AboutArticle` → `ContentPageArticle`, `AboutPlaceholder` →
  `ContentPagePlaceholder`, `about-page.*` → `content-page.*`, `about-messages.ts` →
  `content-page-messages.ts`). Add `model/content-page.constants.ts` (`CONTENT_PAGE_KEYS`) and
  `ContentPageKey` in `model/content-page.types.ts`. Markup, classes, and cache logic stay as
  they are. Thread the key through in the same task, so the code builds at its end:
  `ContentPage` and `ContentPageContent` take `entryKey: ContentPageKey` (props in
  `ContentPage.types.ts` and `ContentPageContent.types.ts`) and pass it down;
  `getContentPage(key: ContentPageKey)` keeps the `"use cache"` scope, `cacheTag`, and
  result-dependent `cacheLife` of design D2 and reads through `readContentPage(key)`, which
  queries with that key instead of `ABOUT_PAGE_KEY`. Export `ContentPage` and
  `CONTENT_PAGE_KEYS` from `index.ts`. Switch `src/app/(public)/about/page.tsx` to
  `<ContentPage entryKey={CONTENT_PAGE_KEYS.about} />`.
  - Verify: `src/features/about/` no longer exists; the moved schema and placeholder tests pass
    after their renames; the scaffold's remaining temporary `knip.jsonc` entries (the two
    `.types.ts` files in `ignoreFiles`, the `content-page.types.ts` `ignoreIssues` entry, and both
    keys with their comment once empty) are removed; `npm run typecheck` and `npm run knip` pass.
- [ ] 2.3 (FR-2, FR-6, NFR-1, NFR-2, NFR-3) Finish the keyed DAL and loader per design D2, D4,
  and D6: a failure logs `[contentful] content page failed` with `{ key, reason }`, plus
  `status` only for `auth`/`http`; the thrown message is `CONTENT_PAGE_UNAVAILABLE`.
  - Verify with `tests/dal/content-page.test.ts` (mocked `contentfulQuery`, spies on the global
    `next/cache` mock), run for each key in `CONTENT_PAGE_KEYS`: the query receives that key;
    success returns the trimmed entry; each of `config`, `network`, `auth`, `graphql`, `http`
    returns its reason and logs exactly once with the key, with a status only for `auth` and
    `http`, and no payload; invalid payload is `validation`; empty `items` is `not-found`; a
    non-Contentful error rethrows; `cacheTag` always gets `CONTENTFUL_CACHE_TAG`; `cacheLife`
    gets `"minutes"` on success and `"seconds"` on every failure.
  - Verify with `tests/components/ContentPageContent.test.tsx` (mocked DAL): the DAL is called
    with the given `entryKey`; on success it resolves to an element that renders the title; for
    each failure reason it rejects, and the message contains neither the key, the reason, nor
    any entry text.
  - Verify with `tests/components/ContentPageArticle.test.tsx`: FR-1's scenario with the privacy
    title (one heading, two paragraphs, the line break kept) and NFR-3's markup-as-text case.
- [ ] 2.4 (FR-1, FR-6, design R5) Turn the moved integration test into
  `tests/dal/content-page.integration.test.ts`: for every key in `CONTENT_PAGE_KEYS`, a real
  request (no `fetch` or module mocks) expects `{ ok: true }` with a non-blank title and
  message; skipped with `describe.skipIf` when `CONTENTFUL_SPACE_ID` or
  `CONTENTFUL_ACCESS_TOKEN` is unset.
  - Verify: `node --env-file=.env.local ./node_modules/vitest/vitest.mjs run <file>` passes for
    both keys (not skipped); plain `npx vitest run <file>` reports it skipped.

## 3. The privacy page route and its breadcrumb <!-- isolated -->

- [ ] 3.1 (FR-1, FR-4, FR-5, NFR-5) Add `src/app/(public)/privacy/page.tsx` (the `/about` route's
  `<main>` with `<ContentPage entryKey={CONTENT_PAGE_KEYS.privacyPolicy} />`, design D1) and
  `src/app/@breadcrumbs/privacy/page.tsx`
  (`<Breadcrumbs segments={Promise.resolve(["privacy"])} />`). Add
  `privacyPolicy: "Политика конфиденциальности"` to `BREADCRUMB_LABELS` and the
  `{ path: PRIVACY_PATH, label: BREADCRUMB_LABELS.privacyPolicy }` row to `STATIC_ROUTES`
  (design D7).
  - Verify: `app/tests/breadcrumbs-slot.test.ts` passes with the new pair of pages; the
    breadcrumbs `matchRoute`/`buildTrail` tests gain `["privacy"]` → «Главная» (link to `/`),
    «Политика конфиденциальности» (current).

## 4. Documentation and verification <!-- judgement-heavy -->

- [ ] 4.1 (NFR-7) Update `docs/architecture.md` and `docs/state-management.md` per design D9.
- [ ] 4.2 (NFR-1, NFR-2, NFR-4, NFR-5, NFR-6) Verify statically and run the chain.
  - `grep -rn '"use client"' src/features/content-page` prints nothing, and
    `dal/content-page.ts` starts with `import "server-only"` (NFR-1).
  - The NFR-4 search over `src/features/content-page` (excluding `tests/`) for colour literals
    and arbitrary-value classes holding a colour (regex
    `-\[(#|rgb|hsl|oklch|var\(--color|color:)`) prints nothing.
  - A search of `src/` (excluding `tests/` folders) for the literals `"/privacy"`,
    `"privacy_policy"`, and `"about_page"` finds exactly `PRIVACY_PATH`'s definition and the two
    `CONTENT_PAGE_KEYS` entries (NFR-5).
  - `src/features/about/` doesn't exist; a search of non-test files for `greetingCollection(`
    (the query call, not the schemas' `greetingCollection:` key) finds exactly two files (home's
    DAL and `content-page`'s DAL); both route files import from
    `@/features/content-page` (NFR-6).
  - `npm run typecheck && npm run lint && npm run test:coverage && npm run build && npm run knip`
    all pass.
  - `CONTENTFUL_SPACE_ID= CONTENTFUL_ACCESS_TOKEN= npm run build` succeeds, its output contains
    `[contentful] content page failed` lines with reason `config` for both keys, and the route
    table marks neither `/about` nor `/privacy` as `ƒ` (NFR-2). A failure here stops the group
    and goes to `opsx-update-review`, not a workaround.
- [ ] 4.3 (FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, NFR-1) Gate 3 (`web-qa`). The visual checks
  (FR-1's mockup match, FR-4's trail, FR-6's `/about` look, and FR-2's error screen) run in both
  colour schemes; the behavioural and network checks (FR-3, FR-5's status codes, NFR-1, FR-2's
  log lines) run once:
  - FR-1: `/privacy` shows the entry's title as the only `h1` and its paragraphs, matching the
    approved mockup at 375 px and 1280 px in structure (block order, type scale, spacing
    tokens, colour roles; a few pixels or a different line wrap is not a mismatch);
  - FR-4: the trail reads «Главная» (link to `/`) › «Политика конфиденциальности»
    (`aria-current="page"`);
  - FR-5: clicking the footer's «Политика конфиденциальности» shows the privacy page, and
    clicking «Связаться с нами» shows «Страница не найдена»; a direct document load of
    `/privacy` and `/contact` answers 200 and 404;
  - FR-6: `/about` still shows its own title, paragraphs, and trail «Главная › О проекте», and
    never the privacy text;
  - NFR-1: the network list for `/privacy` has no request to a `contentful.com` host;
  - FR-2: with `CONTENTFUL_ACCESS_TOKEN` set to an invalid value in the dev server's
    environment, `/privacy` and `/about` show «Что-то пошло не так» and «Повторить» with the
    header, their trails, and the footer, and every `[contentful] content page failed` line
    carries the page's key, reason `auth`, and status 401 only, with no token;
  - FR-3, against `npm run build && npm start` with real settings: edit and publish the privacy
    entry's title, `curl -X POST` `/api/revalidate` with the local secret, reload `/privacy`,
    and see the new title; then publish another edit with no notification, wait 3 minutes,
    reload twice, and see it on the second reload (then restore the original title);
  - no console errors or uncaught exceptions on the success path; replay the recorded
    scenarios.
