# Test Plan

One row per acceptance criterion (each scenario's Then, with its And lines) in the change's spec
deltas. "Existing" means a test already on `main` that must keep passing unchanged in meaning.

| Requirement | Criterion (scenario) | Tests | Level |
| --- | --- | --- | --- |
| FR-1 | Author with poems: link «Произведения автора» to `/authors/<id>/poems` after the about section; no empty text | `AuthorPoemsEntry` renders the link with the list href when the mocked DAL returns poems; `AuthorPage` test: the slot renders after the about section (and after the photo when about is empty) | unit |
| FR-1 | Author with poems (as above), in the real page | Browser: open an author whose id yields at least one poem, see the link under the profile, follow it | end-to-end |
| FR-1 | Author without poems: empty text, no list link | `AuthorPoemsEntry` with an empty DAL result shows «У автора пока ещё нет публикаций.» and no link | unit |
| FR-1, FR-6 | Same entry for the owner and other readers | Public-access test: the entry renders with no session or auth module set up, same output on two renders; boundaries test: no auth import in the poems feature | unit |
| FR-2 | List of titles, newest first: h1 «Произведения», links in date order with poem hrefs, no text/date/genre/illustration | `AuthorPoemList` with two poems of different dates | unit |
| FR-2 | Following a title opens the poem page | Browser: on the list page, click a title, the poem page's h1 matches it | end-to-end |
| FR-3 | No poems: heading and empty text, no list in main | `AuthorPoemList` with no poems | unit |
| FR-4 | Full poem: image alt first, h1, two paragraphs with kept line breaks, footer `<time datetime>` «12 марта 2026 г.» and «Жанр: Лирика» | `PoemView` element order and content; `formatPublishedDate("2026-03-12")` | unit |
| FR-4 | Markup is not interpreted | `PoemView` with "**Bold** <b>tag</b>" shows it literally, no `b`/`strong` element | unit |
| FR-4 | Date does not depend on the server's time zone | `formatPublishedDate("2026-01-01")` with `TZ` set behind UTC gives «1 января 2026 г.» | unit |
| FR-5 | Unknown or malformed author → 404 on both routes | `AuthorPoemsPageContent` and `PoemPageContent` call `notFound()` on the mocked author not-found; browser: `/authors/not-a-uuid/poems` shows «Страница не найдена» | unit, end-to-end |
| FR-5 | Poem that isn't the author's (past the share, unknown, uppercase spelling) → 404 | `getAuthorPoem`: past count, unknown id, uppercase spelling of a found id → not-found; `PoemPageContent` calls `notFound()` on it | unit |
| FR-5 | Author service unavailable → generic error screen | Both content components throw on the mocked unavailable result | unit |
| FR-6 | Guest and signed-in reader see the same poem page, no redirect | Public-access test (content components render with no session set up, no `redirect` call); browser: open a poem page signed out, no redirect to `/login` | unit, end-to-end |
| FR-7 | Stable share: same poems, same order on two reads | `listAuthorPoems` twice for one id; `mockPoemCount` same id → same count, uppercase spelling → same count | unit |
| FR-7 | Every share size 0..4 occurs | `mockPoemCount` for five constructed UUIDs gives 0, 1, 2, 3, 4; `listAuthorPoems` returns the first N in newest-first order; mock set shape (four poems, unique slug ids, ISO dates, illustration files exist, no `<script` in SVGs) | unit |
| FR-8 (breadcrumbs FR-2) | Poem list trail: four items, name links to `/authors/<id>`, «Произведения» current | `matchRoute` for `/authors/<id>/poems`; `buildTrail` for the `author-poems` match | unit |
| FR-8 (breadcrumbs FR-2) | Poem trail: five items, «Произведения» links to the list, title current | `matchRoute` for `/authors/<id>/poems/<poemId>`; `buildTrail` for the `author-poem` match; loader reads the poem only on a poem page | unit |
| FR-8 (breadcrumbs FR-2) | Trails in the real app | Browser: the list page and the poem page show the expected trail items and links | end-to-end |
| breadcrumbs FR-2 | Two-level, account, signup, about, privacy trails | Existing `match-route` / `build-trail` / `Breadcrumbs` tests | unit |
| breadcrumbs FR-4 | Public author; author read unavailable on `/authors/<id>` | Existing `build-trail` tests | unit |
| FR-8 (breadcrumbs FR-4) | Author read unavailable on a poem route: third item «Автор», a link | `buildTrail` for `author-poems` with an unavailable name | unit |
| FR-8 (breadcrumbs FR-4) | Unknown author on all three author routes → no trail | `buildTrail` with a not-found name for `author`, `author-poems`, `author-poem` | unit |
| FR-8 (breadcrumbs FR-4) | Poem that isn't the author's → no trail | `buildTrail` for `author-poem` with a not-found poem; `matchRoute`: `/authors/a/b` and `/authors/<id>/poems/x/y` stay `none` | unit |
| breadcrumbs NFR-5 | Slot mirrors every page, including the two poem routes | Existing `app/tests/breadcrumbs-slot.test.ts`, passing with the new slot pages | unit |
| FR-9 (home-greeting FR-6) | Greeting shown, multi-paragraph, markup literal | Existing `HomeGreeting` tests | unit |
| FR-9 (home-greeting FR-6) | Greeting drawn as a banner; main holds no search box, «Очистить», or list | `HomeGreeting` container carries `bg-surface`, border, rounded utilities; home page test: h1 present, no `searchbox`, no «Очистить» button, no list in `main` | unit |
| FR-9 (home-greeting FR-7) | CMS unavailable: «Поэтический Хаб» and description inside the banner | `HomeGreeting` with the fallback content renders inside the banner container; existing `resolveGreeting` tests | unit |
| FR-9 (route-groups FR-7) | Home renders the greeting in the banner and no poem list | Updated browser scenario `home-renders.spec.ts` | end-to-end |
| route-groups FR-7 | Build route list shows `/` with 1m revalidation | `npm run build` route table checked in task 6.2 | integration |
| FR-10 (home-greeting FR-10) | Static search finds no old home poem code in `src/`, `docs/`, `tests/web-qa-scenarios/` | `src/app/tests/home-poems-removed.test.ts` (reads `src/`, `docs/`, `tests/web-qa-scenarios/`) | unit |
| feedback-tones FR-4 | Wrong credentials; sign-up failure alerts | Existing `SignInForm` / `SignUpForm` tests | unit |
| FR-8, FR-12 (breadcrumbs FR-4) | Author unavailable and poem not the author's: error screen, trail Главная › Наши авторы › «Автор» (current) | `buildTrail` for `author-poem` with an unavailable name and a not-found poem | unit |
| FR-11 (route-states FR-4) | Reader retries: route refreshed and boundary reset once | `RootError` with mocked `useRouter`: one click → `router.refresh` and `reset` once each | unit |
| FR-11 (route-states FR-4) | Repeated clicks during an attempt: still one refresh; button disabled, label «Повторить» | `RootError` with a pending `refresh`: two clicks and an Enter → one call; button disabled with the same label | unit |
| FR-11 (route-states FR-4) | Attempt fails again: button enabled, a click refreshes once more | `RootError` after the pending attempt settles with the error still shown | unit |
| FR-11, FR-12 (route-states FR-4) | Recovery refreshes the trail too: page recovers and the trail shows the name | Browser on a local production build: author read fails, then restored, «Повторить» → page and trail show the author, button disabled until then | end-to-end |
| FR-12 (breadcrumbs) | One read per request: author source queried at most once, poem source at most once | `getPublicAuthor` with `react`'s `cache` mocked by a memo: two calls → one Supabase query, `getPublicAuthorName` reuses it; `getAuthorPoem` two calls → one lookup | unit |
| FR-12 (breadcrumbs) | A failing read fails both: error screen and «Автор», never the name | Memoized failure returned to both callers (unit); browser on a local production build with no cache and Supabase stopped: `/authors/<id>` shows the error screen and «Автор» | unit, end-to-end |
| FR-13 (breadcrumbs) | Two clicks before the URL changes end on the second author | Browser, throttled network: directory → two author clicks; also list → poem and author page → poem list | end-to-end |
| FR-13 (breadcrumbs) | Second click while the first page's content is in flight: second target only, first never appears | Browser, throttled network: click, skeleton, Back, other link; for directory → author, list → poem, author page → list | end-to-end |
| FR-13 (breadcrumbs) | Two quick clicks between poems end on the second poem and its trail | Same browser scenario on a poem list | end-to-end |
| FR-14 (author-profiles NFR-7) | Unavailable heals: next request lists the authors, no lifetime to wait | Wrapper returns `unavailable` without `cacheLife("seconds")` and calls `connection` (unit); browser on a local production build: Supabase stopped → message, restarted → list on the next load | unit, end-to-end |
| FR-14 (author-profiles NFR-7) | Failure is not stored: each request reads again | Unit: a failing read never calls `cacheLife`; a non-marker rejection also gives `unavailable`; a Next control-flow error propagates; one log line per failure | unit |
| FR-14 | Loading state until the read finishes; concurrent requests share one read | Browser on a local production build, slowed reads, no cache: skeleton shows; two tabs on the same author → one read in the server log | end-to-end |
| FR-14 (author-profiles NFR-7) | Build without a database: exits 0, `/authors` renders the message at request time, not prerendered | `npm run build` without Supabase variables, then `npm run start`: the message comes at request time; the built `/authors` shell holds the skeleton | integration |
| FR-15 (author-profiles NFR-7) | Failed refresh keeps the last good data (page and trail keep the name) | Throwaway probe in task 1.3: local build, short revalidate, Supabase stopped after the first load, reload past the window → the author still shows; one log line per failed read | integration |
| FR-15 (author-profiles NFR-7) | Stale not-found is kept: 404, not the error screen | Same probe with a not-found id | integration |
| NFR-1 | No `"use client"`, no auth/Supabase import, no `redirect` import in the poems feature | `src/features/poems/tests/boundaries.test.ts` | unit |
| NFR-2 | No `@/features/poems` import in the authors feature | `boundaries.test.ts` | unit |
| NFR-3 | Mock modules imported only by `dal/author-poems.ts` | `boundaries.test.ts` | unit |
| NFR-4 | Build without env: exits 0, route list = `main`'s + two routes, same render-mode marker as `/authors/[id]` | `npm run build` with no Supabase/Contentful variables, route table compared with `main`'s (task 6.2) | integration |
| NFR-5 | No colour literals or arbitrary colour classes in new/changed components | File-content search in task 6.3 (folded into `boundaries.test.ts` for the poems feature) | unit |
| NFR-6 | `main` of the list page: one h1, one list whose every item holds one link | `AuthorPoemList` role queries; browser check scoped to `main` | unit, end-to-end |
| NFR-7 | Copy matches the table | `poems-messages` test compares every string with the proposal's UI copy table; view tests assert the exact texts | unit |

Coverage: 55 rows; every scenario in the seven spec deltas has at least one row, and no
criterion is left without a test. Checks that depend on the cache run on a local production
build (`npm run build && npm run start`), each from a fresh server start (task 6.4).
