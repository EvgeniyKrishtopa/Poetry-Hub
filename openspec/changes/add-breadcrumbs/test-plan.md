# Test Plan: add-breadcrumbs

One row per acceptance criterion: each scenario in `specs/breadcrumbs/spec.md` and each headline criterion in `proposal.md`.

Levels:
- **unit**: one module or one component, with its collaborators mocked (model functions; the author-name DAL with `getPublicAuthor` mocked; synchronous components rendered with Testing Library).
- **integration**: a full build or command run, or a static search over the source tree.
- **end-to-end**: a real browser against the running app (Gate 3).

## Spec scenarios

| Requirement | Criterion (scenario) | Tests | Level |
| --- | --- | --- | --- |
| FR-1 | Home shows no trail | `matchRoute([])` → `none`; `buildTrail(none)` → `none`; browser: `/` has no «Навигационная цепочка» landmark | unit + end-to-end |
| FR-1 | Another page shows the trail under the header | Root-layout test: the `breadcrumbs` slot renders after the header and before the children; browser: `/authors` shows the landmark between header and main | unit + end-to-end |
| FR-2 | Two-level trail (`/login`) | `matchRoute(["login"])` → [«Вход» current]; `buildTrail` prepends «Главная» | unit |
| FR-2 | Three-level trail in the account area | `matchRoute(["account", "author"])` → [«Мастерская поэта» link to `ACCOUNT_PATH`, «Профиль автора» current], no «Главная»; browser: signed-in `/account/author` reads the three items | unit + end-to-end |
| FR-2 | Signup trail | `matchRoute(["signup"])` → [«Регистрация» current]; every table row's path equals its named constant | unit |
| FR-3 | Parent items link up the tree | `BreadcrumbsView`: «Главная» href `HOME_PATH`, «Мастерская поэта» href `ACCOUNT_PATH` | unit |
| FR-3 | Current item is highlighted and not a link | `BreadcrumbsView`: last item is not a link, has `aria-current="page"` and `text-accent`; parent links have `text-foreground`, not `text-accent`; browser: accent color in light and dark themes | unit + end-to-end |
| FR-4 | Public author | `getPublicAuthorName`: `ok` → `{ ok: true, name: "Анна Ахматова" }`; `buildTrail(author, ok)` → last item the name, «Наши авторы» links to `AUTHORS_PATH`; browser: a public author's page | unit + end-to-end |
| FR-4 | Author read unavailable | `getPublicAuthorName`: `unavailable` passes through; `buildTrail(author, unavailable)` → last item «Автор» | unit |
| FR-4 | Unknown author | `getPublicAuthorName`: `not-found` passes through; `buildTrail(author, not-found)` → `none`; browser: `/authors/<unknown uuid>` has no trail | unit + end-to-end |
| FR-5 | Signed-in and signed-out visitors see the same trail | Static check: nothing in `features/breadcrumbs` imports from `@/features/auth`; browser: `/authors` signed out and signed in shows the same trail | integration + end-to-end |
| FR-6 | Unknown URL → 404, no trail | `matchRoute(["no-such-page"])` → `none`; `/no-such-page` on the dev server returns HTTP 404 with «Страница не найдена» (task 4.1); browser: no trail | unit + integration + end-to-end |
| FR-6 | Extra segments under a known page | `matchRoute(["account", "author", "extra"])` and `matchRoute(["authors", "a", "b"])` → `none` | unit |
| FR-7 | Leaving home shows the trail | Browser: from `/`, follow the header's «Наши авторы»: the trail appears with no full reload | end-to-end |
| FR-7 | Returning home hides the trail | Browser: from `/authors`, the trail's «Главная» and the Back button both reach home with no trail | end-to-end |
| NFR-1 | No client modules in the feature | Static search: no `"use client"` under `src/features/breadcrumbs` or `src/app/@breadcrumbs` | integration |
| NFR-2 | No hard-coded colors | `BreadcrumbsView`: no class or style holds a hex, `rgb()`/`hsl()`, `[#…]`, or inline color | unit |
| NFR-3 | Screen reader structure | `BreadcrumbsView`: landmark «Навигационная цепочка» with a list whose items are only the labels, no separator in the accessibility tree | unit |
| NFR-4 | Placeholder holds the row | `BreadcrumbsPlaceholder`: hidden from the accessibility tree, `h-5`; `Breadcrumbs` renders it as the Suspense fallback; browser at 1280 px: no content jump | unit + end-to-end |
| NFR-5 | Build route list | `npm run build` exits 0; its route path list diffed against `main`'s is identical (task 4.1) | integration |
| NFR-6 | Copy matches the table | `BreadcrumbsView` and `matchRoute` tests assert the exact copy-table strings; the authors titles come from `AUTHORS_PAGE_TITLES` | unit |

## Headline criteria (`proposal.md`)

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| FR-1 | Home renders no trail | Covered by the FR-1 "Home shows no trail" row | unit + end-to-end |
| FR-1, FR-3, FR-7 | Home → header «Наши авторы» → «Главная › Наши авторы» without reload, «Главная» links to `/`, current item accent with `aria-current` | Browser flow; `BreadcrumbsView` unit assertions from the FR-3 rows | unit + end-to-end |
| FR-4 | `/authors/<id>` of «Анна Ахматова» reads «Главная › Наши авторы › Анна Ахматова» | Covered by the FR-4 "Public author" row | unit + end-to-end |
| FR-2 | Signed-in `/account/author` reads three items, «Мастерская поэта» links to `/account` | Covered by the FR-2 three-level row and the FR-3 parent-links row | unit + end-to-end |
| FR-5 | Signed out and signed in see the same `/authors` trail | Covered by the FR-5 row | integration + end-to-end |
| FR-6 | `/no-such-page` shows the 404 page and no trail | Covered by the FR-6 unknown-URL row | unit + integration + end-to-end |
| FR-7 | From `/authors`, «Главная» returns to home without a trail | Covered by the FR-7 "Returning home" row | end-to-end |

Every acceptance criterion has a row: 21 spec scenarios and 7 headline criteria, 28 in all.

FR-7 is verified only end-to-end; Gate 3 should keep the home ↔ `/authors` flow as a recorded scenario under `tests/web-qa-scenarios/` so it has a regression guard (Gate 2 PLAUSIBLE finding 4).
