# Tasks

Requirement markers (`implements <ID> of add-breadcrumbs`) go on the test that verifies each requirement, never in production code (`docs/code-style.md`).

## 1. Path constants and the authors public API <!-- isolated -->

- [ ] 1.1 (FR-2) Add `HOME_PATH = "/"` to `src/shared/config/constants.ts` and `SIGN_UP_PATH = "/signup"` to `src/shared/config/account-paths.ts`; replace the `/signup` literal in auth's `SignInForm.tsx` with `SIGN_UP_PATH`. Verify the existing `SignInForm` tests still pass and `grep -rn '"/signup"' src --include='*.tsx' --include='*.ts'` finds no production hit outside `account-paths.ts`.
- [ ] 1.2 (FR-4) Add `PublicAuthorNameResult` to `features/authors/model/author.types.ts` and `getPublicAuthorName(id)` in a new `features/authors/dal/public-author-name.ts` (`import "server-only"`, built on `getPublicAuthor` and `model/full-name.ts`, no cache scope of its own; design D2). Verify with tests in `features/authors/tests/dal/`: `ok` → `{ ok: true, name: "Анна Ахматова" }`; `not-found` and `unavailable` pass through as `{ ok: false, reason }`.
- [ ] 1.3 (FR-2, NFR-6) Export `AUTHORS_PAGE_TITLES` (the existing `PAGE_TITLES`), `AUTHORS_PATH`, `AUTHOR_EDITOR_PATH`, and `getPublicAuthorName` from `features/authors/index.ts`, and update its header comment to name the `breadcrumbs` feature as a server-side consumer (design D2). Verify `npm run typecheck`, `npm run lint`, and `npm run knip` pass (knip reports the new exports as unused until group 2 imports them; if so, run it again at the end of group 2 instead).

## 2. Breadcrumbs model <!-- isolated -->

- [ ] 2.1 (FR-2, FR-3) Create `src/features/breadcrumbs/model/breadcrumb.types.ts` (`BreadcrumbItem`, `RouteMatch`, `Trail`, design D2) and `model/breadcrumbs-messages.ts` with the UI copy table's strings that the feature owns: landmark name, «Главная», «Вход», «Регистрация», «Автор», separator «›». Verify `npm run typecheck`.
- [ ] 2.2 (FR-2, FR-6) Implement `model/match-route.ts`: the route table written against the path constants (design D2 table), exact matching, parent items by path prefix, the one dynamic author row. Verify with tests in `features/breadcrumbs/tests/model/match-route.test.ts`:
  - `[]` (home) → `none`;
  - each of the five static URLs from FR-2 → its items in order, without «Главная» (only `buildTrail` adds it), with parents as links and the last as current — e.g. `["account", "author"]` → [«Мастерская поэта» link to `ACCOUNT_PATH`, «Профиль автора» current];
  - `["authors", "<id>"]` → `{ kind: "author", id }`;
  - `["no-such-page"]`, `["account", "author", "extra"]`, `["authors", "a", "b"]` → `none`;
  - every row's path equals its named constant (no literal path in the table).
- [ ] 2.3 (FR-3, FR-4) Implement `model/build-trail.ts`. Verify with tests in `tests/model/build-trail.test.ts`:
  - `none` → `none`;
  - a static match → «Главная» (link to `HOME_PATH`) prepended, last item `current`;
  - author + `ok` → last item the name; author + `unavailable` → «Автор»; author + `not-found` → `none`;
  - «Наши авторы» in an author trail links to `AUTHORS_PATH`.

## 3. Breadcrumbs components <!-- judgement-heavy -->

- [ ] 3.1 (FR-3, NFR-2, NFR-3, NFR-6) Implement `components/BreadcrumbsView` (synchronous; `nav` + `ol`, `next/link` for link items, `aria-current="page"` and `text-accent` on the current item, `text-foreground` links with `hover:text-accent`, `aria-hidden` separator span inside each item after the first; container `mx-auto w-full max-w-4xl px-6 pt-4 text-sm`, list `flex flex-wrap items-baseline gap-x-2 gap-y-1`, current item `wrap-anywhere`; values from the mockup, design D3). Verify with tests in `tests/components/BreadcrumbsView.test.tsx`:
  - landmark «Навигационная цепочка» contains a list whose items are only the labels, no separator in the accessibility tree;
  - parent items are links with the expected hrefs; the last item is not a link and has `aria-current="page"` and the `text-accent` class; every parent link has the `text-foreground` class and not `text-accent`;
  - no class or style holds a hard-coded color value (hex, `rgb()`/`hsl()`, `[#…]` arbitrary classes, inline `style` colors); any design-token utility passes.
- [ ] 3.2 (NFR-4) Implement `components/BreadcrumbsPlaceholder` (`aria-hidden`, the same `pt-4 px-6` container holding one empty `h-5` row). Verify with a test: it is hidden from the accessibility tree and has the `h-5` class.
- [ ] 3.3 (FR-1, FR-4, FR-5, FR-6, NFR-1) Implement `components/BreadcrumbsLoader` (async: await segments → `matchRoute` → `getPublicAuthorName` only for an author match → `buildTrail` → `BreadcrumbsView` or nothing; no session read) and `components/Breadcrumbs` (Suspense with `BreadcrumbsPlaceholder` as fallback), and `features/breadcrumbs/index.ts` exporting `Breadcrumbs`. Keep the loader thin: all branching lives in `model/` (Vitest can't render async Server Components). Verify with a test that `Breadcrumbs` renders the placeholder as its fallback, `grep -rn '"use client"' src/features/breadcrumbs` finds nothing, and the loader imports nothing from `@/features/auth`.
- [ ] 3.4 (FR-3) Add `BreadcrumbsView` to `docs/design-system.md` section 3 as a feature-local primitive (row, separator, current-item accent). Verify the row names its folder.

## 4. Slot wiring and route checks <!-- judgement-heavy -->

- [ ] 4.1 (FR-6, NFR-5) Before wiring the layout, add `src/app/@breadcrumbs/page.tsx` (returns `null`), `src/app/@breadcrumbs/default.tsx` (returns `null`), and `src/app/@breadcrumbs/[...segments]/page.tsx` (renders `<Breadcrumbs segments={params.then(({ segments }) => segments)} />`), then render `{breadcrumbs}` in `src/app/layout.tsx` between `</header>` and `{children}`. Verify, before anything else in this group:
  - `npm run build` exits 0 and its route path list equals `main`'s (save both lists to the scratchpad and diff them);
  - against `npm run dev`, `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/no-such-page` prints `404` and the page shows «Страница не найдена».

  If `/no-such-page` stops returning 404, add `src/app/default.tsx` calling `notFound()` and recheck. If the route list changes, stop and raise it with the user: design D1's fallback (a mirror slot tree) changes the file map.
- [ ] 4.2 (FR-1) Update `src/app/tests/root-layout.test.tsx` so the layout renders a `breadcrumbs` slot between the header and the children. Verify the test passes.
- [ ] 4.3 (FR-1, FR-7) Update `docs/architecture.md` per design D5 (project tree, root-layout line, `shared/config` constants, the `breadcrumbs` → `authors` cross-feature example). Verify every new path it names exists on disk.

## 5. Integration verification <!-- judgement-heavy -->

- [ ] 5.1 (all FR/NFR) Run `npm run typecheck && npm run lint && npm run test:coverage && npm run build && npm run knip`. Verify each exits 0 and coverage stays at or above 80%.
- [ ] 5.2 (FR-1–FR-7, NFR-3, NFR-4) Gate 3 (`web-qa`) against the dev server, signed out and signed in:
  - `/` shows no trail; following «Наши авторы» shows «Главная › Наши авторы» without a full reload;
  - `/authors/<public author id>` shows the author's name last; «Наши авторы» goes back to `/authors`;
  - `/account/author` (signed in) shows «Главная › Мастерская поэта › Профиль автора»;
  - `/login`, `/signup` show their two-item trails;
  - `/no-such-page` and `/authors/<unknown uuid>` show no trail;
  - «Главная» in the trail and the browser's Back button both return to a home with no trail;
  - the current item is accent-colored in light and dark themes; at a desktop width (1280 px), the page content doesn't jump when the trail appears (a wrapped trail on a narrow screen may shift it by one line, NFR-4).

  Verify every flow passes.
