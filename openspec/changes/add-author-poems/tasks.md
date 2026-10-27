# Tasks

Order (user decision, 2026-10-24): group 1 is the cache and race work on the existing pages,
first, before any poems or home change; group 2 is the home page; groups 3-6 are the poems
feature. Each group exports only what it already consumes (tests count as consumers for knip),
so `npm run knip` stays green per group PR. Groups 1 and 3 add no new visuals and may run before
the Claude Design mockups arrive; groups 2 and 4 wait for them. The poem routes' slot pages land
with the routes (group 4), because `app/tests/breadcrumbs-slot.test.ts` requires one slot page
per real page; their trail logic lands in group 5.

## 1. Cache and race protection on the existing pages (no new visuals) <!-- judgement-heavy -->

- [x] 1.1 (FR-11, FR-12) Lock the error screen's retry and refresh page and trail together (design
  D11): `src/app/error.tsx` runs `startTransition(() => { router.refresh(); reset(); })` and
  disables «Повторить» while pending; `RootErrorProps` gains `reset`.
  - Verify with `src/app/tests/error.test.tsx` (mocked `useRouter`; implements FR-11 of
    add-author-poems): one click calls `router.refresh` and `reset` once each; two quick clicks
    and an Enter press during a pending attempt still call them once (a `refresh` mock that keeps
    the transition pending); the button is disabled and still reads «Повторить» while pending;
    once the attempt settles with the error screen still shown, the button is enabled and a click
    refreshes again. Update the existing FR-4 case (it asserted one `retry` call) to the new
    contract in route-states' modified FR-4.
- [x] 1.2 (FR-12) Memoize the per-request reads (design D12): wrap `getPublicAuthor` in
  `src/features/authors/dal/public-authors.ts` with React's `cache` (`getAuthorPoem` gets the
  same wrapper in task 3.2, where it is created).
  - Verify with `src/features/authors/tests/dal/public-authors.test.ts` (implements FR-12 of
    add-author-poems; `getAuthorPoem`'s own memo case lands with task 3.2),
    with `react`'s `cache` mocked by a per-test memo (Vitest runs the client React build, whose
    `cache` doesn't memoize): two `getPublicAuthor(id)` calls query Supabase once and return the
    same result; `getPublicAuthorName` reuses that read; a failed read is returned to both callers.
    The existing public-authors cases still pass.
- [x] 1.3 (FR-14) Keep the public reads' failure lifetime and record the per-request read rule
  (design D12, D14, revised 2026-10-24 after the probe): `listPublicAuthors` and
  `cachedPublicAuthor` keep returning `unavailable` with `cacheLife("seconds")`. Record ADR 0008
  with the `record-decision` skill (a public read that a page and its breadcrumb trail both call
  is memoized per request with React's `cache`; it supersedes nothing, ADR 0005 and its status
  line stay unchanged), and add that rule to `docs/state-management.md`'s "Supabase public reads"
  section, keeping its `"seconds"` lifetime text and adding a note not to throw inside the scope
  (design D14's probe findings).
  - Verify with `src/features/authors/tests/dal/public-authors.test.ts` (implements FR-14 of
    add-author-poems): a database error → `unavailable` with `cacheLife("seconds")`, logged once;
    success → `"hours"`; not-found → `"minutes"`.
  - Verify: `npm run typecheck && npm run lint && npm run test:coverage && npm run knip` pass,
    and `npm run build` with no Supabase variables exits 0; `npm run start` on that build then
    renders «Список авторов сейчас недоступен.» on `/authors` at request time (not from the
    prerendered HTML: the build output's `/authors` shell holds the skeleton, not the message).

## 2. Home: welcome banner, remove the search and mock poem list (UI) <!-- isolated -->

- [x] 2.1 (FR-9, NFR-5) Restyle `src/features/home/components/HomeGreeting/HomeGreeting.tsx` as
  the banner (design D8): a `section` with the surface background, border, and rounded corners
  around the same h1 and paragraphs, values from the approved mockup, token utilities only.
  - Verify with `src/features/home/tests/components/HomeGreeting.test.tsx`: the existing cases
    still pass (heading, paragraphs, line breaks, literal markup), plus the banner container
    carries `bg-surface`, a `border` utility, and a rounded utility (implements FR-9 of
    add-author-poems).
- [x] 2.2 (FR-9, FR-10) Rewrite `src/app/(public)/page.tsx` to render only the banner (design D8):
  keep `"use cache"`, `cacheLife("minutes")`, `cacheTag(CONTENTFUL_CACHE_TAG)`; drop the
  TanStack prefetch and `HydrationBoundary`.
  - Verify: `npm run typecheck && npm run lint` pass; the home page test (add one under
    `src/app/tests/` if none renders the page) shows the h1 and no `searchbox`, no «Очистить»
    button, and no list in `main` (implements FR-9 of add-author-poems).
- [x] 2.3 (FR-10) Delete the old poems code: `src/features/poems/api/`,
  `components/{PoemSearch,PoemList,PoemCard}`, `model/{filter-poems,poems-ui.store,poem.types}`,
  `index.ts`, and their tests (the folder is empty afterwards; group 3 recreates it). Delete
  `tests/web-qa-scenarios/home-search-filter.spec.ts`; update `home-renders.spec.ts` to assert the
  h1 and no `main` list.
  - Verify with a static test `src/app/tests/home-poems-removed.test.ts` (implements FR-10 of
    add-author-poems): `src/` contains none of `PoemSearch`, `PoemList`, `usePoemsUiStore`,
    `poemsListQueryOptions`, «Загрузка стихов…», «Не удалось загрузить стихи.», «По вашему
    запросу стихов не найдено.», `The Road Not Taken`. `npm run knip` passes (`getQueryClient`
    stays used by `app/providers.tsx`).

## 3. Poems model and mock data (no new visuals) <!-- isolated -->

- [x] 3.1 (FR-4, FR-7, NFR-3, NFR-7) Add `src/features/poems/model/` per design D1/D3/D5:
  `poem.types.ts`, `poem.constants.ts`, `poems-messages.ts` (every UI copy string;
  `getIllustrationAlt`, `formatGenreLine`), `poem-paths.ts` (on `authorPagePath`, newly
  exported from `@/features/authors`), `compare-poems.ts`, `format-published-date.ts`.
  - Verify with `tests/model/*.test.ts`: `format-published-date` (`2026-03-12` → «12 марта
    2026 г.»; `2026-01-01` → «1 января 2026 г.» with `process.env.TZ` behind UTC, implements
    FR-4), `compare-poems` (newest first), `poem-paths`, `poems-messages` helpers (text equals
    the copy table, NFR-7).
- [x] 3.2 (FR-5, FR-7, FR-12, NFR-3) Add `dal/mock-poems.ts` (four original Russian placeholder poems, design
  D9), `dal/mock-poem-count.ts` (design D2), `dal/author-poems.ts` (`listAuthorPoems`,
  `getAuthorPoem`, design D3; `getAuthorPoem` wrapped in React's `cache`, design D12), and `public/mock-poems/<id>.svg` (four 800 × 450 abstract
  illustrations, no text, no scripts, no external references).
  - Verify with `tests/dal/mock-poem-count.test.ts` (same id → same count; uppercase spelling →
    same count; a constructed UUID for each of 0..4; implements FR-7),
    `tests/dal/author-poems.test.ts` (first N in newest-first order; `getAuthorPoem` found, past
    the author's count → not-found, unknown id → not-found, the uppercase spelling of a found id →
    not-found; implements FR-5, FR-7), and
    a `cache`-memo case for `getAuthorPoem` (two calls, one lookup; FR-12), and
    `tests/dal/mock-poems.test.ts` (four poems, unique lowercase-slug ids, valid ISO dates not
    after 2026-10-24, every `illustrationSrc` file exists under `public/`, no `<script` in any SVG).
- [x] 3.3 (NFR-1, NFR-2, NFR-3) Add the static test `src/features/poems/tests/boundaries.test.ts`:
  no `"use client"` and no `@/features/auth` / `@/shared/lib/supabase` import under
  `src/features/poems/` (NFR-1); no `@/features/poems` import under `src/features/authors/`
  (NFR-2, already true before group 4 adds the slot); `dal/mock-poems` and `dal/mock-poem-count`
  imported only by `dal/author-poems.ts` (NFR-3). Each case carries its `implements … of
  add-author-poems` marker.
  - Verify: `npm run typecheck && npm run lint && npm run test:coverage && npm run knip` pass.

## 4. Poem pages and the author page entry (UI) <!-- judgement-heavy -->

- [x] 4.1 (FR-2, FR-3, FR-4, NFR-5, NFR-6) Add the sync views `components/AuthorPoemList/` and
  `components/PoemView/` (design D5), styled from the approved mockup.
  - Verify with `tests/components/AuthorPoemList.test.tsx` (h1 «Произведения»; links in order with
    hrefs; empty text and no list; implements FR-2, FR-3, NFR-6) and
    `tests/components/PoemView.test.tsx` (image alt first, then h1, paragraphs with kept line
    breaks, literal markup, footer `<time datetime>` and «Жанр: …»; implements FR-4, NFR-6).
- [x] 4.2 (FR-2, FR-3, FR-4, FR-5, FR-6) Add `AuthorPoemsPage` + `AuthorPoemsPageContent` and `PoemPage` +
  `PoemPageContent` (design D4) with their skeletons, and the routes
  `src/app/(public)/authors/[id]/poems/page.tsx` and `…/poems/[poemId]/page.tsx`. Add the slot
  pages `src/app/@breadcrumbs/authors/[id]/poems/page.tsx` and `…/poems/[poemId]/page.tsx`
  rendering `Breadcrumbs` with `["authors", id, "poems"]` and `["authors", id, "poems",
  poemId]` (no trail until group 5).
  - Verify with `tests/components/AuthorPoemsPageContent.test.tsx` and
    `tests/components/PoemPageContent.test.tsx` (mocked `@/features/authors` and DAL): author
    not-found → `notFound()`; unavailable → throws; poem not-found → `notFound()`; ok → the view
    (implements FR-5). `app/tests/breadcrumbs-slot.test.ts` passes unchanged.
- [x] 4.3 (FR-1, FR-6, NFR-2) Add `components/AuthorPoemsEntry/` (design D5) and the `poems` slot
  through `AuthorPage` → `AuthorPageContent` → `AuthorProfileView` (design D6); the author route
  composes `<AuthorPoemsEntry authorId={id} />`. Export from `src/features/poems/index.ts` only
  `AuthorPoemsEntry`, `AuthorPoemsPage`, `PoemPage`.
  - Verify with `tests/components/AuthorPoemsEntry.test.tsx` (≥1 poem → link «Произведения
    автора» with the list href; 0 → the empty text, no link; implements FR-1) and an added case
    in `src/features/authors/tests/components/AuthorPage.test.tsx` (the slot renders after the
    about section, and after the photo when about is empty).
- [x] 4.4 (FR-6) Verify public access with `tests/components/public-access.test.tsx`: with no
  session, auth, or Supabase module mocked or set up, `AuthorPoemsEntry`, `AuthorPoemsPageContent`,
  and `PoemPageContent` render their content, call no `redirect`, and give the same output on two
  renders (implements FR-6 of add-author-poems); the boundaries test (3.3) also finds no import
  of `redirect` from `next/navigation` under `src/features/poems/`.
  - Verify: `npm run typecheck && npm run lint && npm run test:coverage && npm run knip` pass.

## 5. Breadcrumbs for the poem routes <!-- judgement-heavy -->

- [x] 5.1 (FR-8, FR-12) Extend `src/features/breadcrumbs/` per design D7: `RouteMatch`'s two new kinds,
  `matchRoute` over the segments after `/authors`, `BreadcrumbsLoader`'s reads (author name; poem
  in parallel for a poem page), `buildTrail`'s new trails. Add `getAuthorPoem`,
  `authorPoemsPath`, `POEMS_SEGMENT`, `POEMS_PAGE_TITLE` to `@/features/poems`' index.
  - Verify with `tests/model/match-route.test.ts` (`/authors/<id>/poems` and
    `/authors/<id>/poems/<poemId>` match; `/authors/a/b` and `/authors/<id>/poems/x/y` stay
    `none`) and `tests/model/build-trail.test.ts` (both trails with links and the current item;
    author unavailable → «Автор» as a link; author not-found → none; poem not-found → none;
    author unavailable and poem not-found → Главная › Наши авторы › «Автор» as the current item,
    marked FR-12), each case marked `implements FR-8 of add-author-poems`; `tests/components/Breadcrumbs.test.tsx`
    covers the loader reading the poem only on a poem page.
  - Verify: `npm run typecheck && npm run lint && npm run test:coverage && npm run knip` pass.

## 6. Docs and verification <!-- judgement-heavy -->

- [x] 6.1 (FR-10) Update `docs/architecture.md` (the poems feature's new role and folders, the
  two routes and their slot pages, `poems` → `authors` and `breadcrumbs` → `poems` imports),
  `docs/state-management.md` (no feature uses TanStack Query today; the conventions stay for the
  next one; the poems mock DAL needs no cache scope until a database replaces it; the "Supabase public
  reads" section is already updated by task 1.3), and
  `docs/design-system.md` (drop `PoemCard` and the `PoemList` state examples; add the banner,
  `AuthorPoemList`, `PoemView`, and the empty text as the empty-state example). Remove follow-up
  28's home overflow note from `PROGRESS.md` with the progress script.
  - Verify: the docs name no deleted file (`grep` for `PoemSearch`, `PoemList`, `PoemCard`,
    `poems-ui.store` under `docs/` finds nothing).
- [x] 6.2 (NFR-4) Run `npm run build` with no Supabase or Contentful variables set and compare its
  route list with `main`'s: exactly `/authors/[id]/poems` and `/authors/[id]/poems/[poemId]`
  added, both with the same render-mode marker as `/authors/[id]`, no route newly fully dynamic.
  Record the result in the group's commit body.
- [x] 6.3 (NFR-5) Search the new and changed component files for hex, `rgb(`, `hsl(` literals and
  `text-[`, `bg-[`, `border-[` classes; expect none.
- [x] 6.4 (FR-11, FR-12, FR-13, FR-14) In the Gate 3 browser pass, check the race guarantees and save the <!-- deferred: docs/deferred.md -->
  passing flows as `@playwright/test` scenarios under `tests/web-qa-scenarios/`: FR-13's two cases,
  each for directory → author and list → poem, with the reads slowed down (a throttled network
  in the browser): two clicks before the URL changes, and Back plus the other link while the
  first page's skeleton shows; both end on the second target's page and trail, and the first
  target's content never appears; the same for author page → poem list (FR-13 names all three
  source pages); with the
  author read made unavailable, the page shows the error screen while the trail reads «Автор»
  (FR-12); on the error screen, a double click on «Повторить» leaves the button disabled until
  the attempt finishes, and after recovery the trail shows the author's name, not «Автор»
  (FR-11, FR-12, design D11's risk); with the local Supabase stack stopped before
  `npm run build` (the usual variables set, so nothing about the list is baked into the build),
  then `npm run start`, `/authors` shows «Список авторов сейчас недоступен.», and after the stack restarts a
  load a little over one second later lists the authors; likewise on `/authors/<id>`, «Повторить»
  pressed a little over one second after the restart brings back the author page (FR-14); with the author read slowed down
  on the server → Supabase hop (`docker pause supabase_rest_Poetry-Hub`, open the tabs, then
  `docker unpause` a few seconds later; not browser throttling, which leaves that hop fast; user
  decision, 2026-10-24) and no cache, the author
  page shows its skeleton until the content arrives, and two tabs opened at once on the same
  author produce one `author_profiles` request in the local Supabase REST container's log
  (`docker logs supabase_rest_Poetry-Hub`; the app logs only failures, so no app code changes;
  user decision, 2026-10-24) (FR-14's loading state and shared read).
  - Where (user decision, 2026-10-24): the FR-12 and FR-14 checks (anything that depends on the
    cache) run on a local production build, `npm run build && npm run start`, each from a fresh
    server start so no earlier entry is cached; the other checks run on the dev server as usual.
- [x] 6.5 (NFR-1, NFR-2, NFR-3, NFR-4) Run the full validation: `npm run typecheck && npm run lint &&
  npm run test:coverage && npm run build && npm run knip` (the boundary tests close NFR-1..3,
  the build closes NFR-4).
