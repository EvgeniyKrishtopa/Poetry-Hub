# Proposal

## Why

Poetry Hub now has nested pages (`/authors/<id>`, `/account/author`), but nothing on the page tells a reader where they are or how to step back up one level except the browser's Back button and the header. A breadcrumb trail under the header shows the current position and links every level above it.

## What Changes

- Add a breadcrumb trail under the site header on every page except home. It is the same for every visitor, signed in or not.
- The trail starts with «Главная» and ends with the current page. Every item before the last is a link; the last item is the current page, is not a link, and is highlighted in the accent color.
- Add a new feature `src/features/breadcrumbs/`: the route → trail table and the trail component, Server Components only.
- Add a parallel route slot `src/app/@breadcrumbs/` rendered by the root layout between the header and the page. It holds one slot page per real page, at the same path, so the trail stays a Server Component, still updates on client-side navigation, and a URL with no page keeps its HTTP 404 with no trail.
- `features/authors` exports its page titles, its path constants, and a server-only author-name read for the trail's last item on `/authors/<id>`. Every trail path comes from a named constant; `shared/config` gains `HOME_PATH` and `SIGN_UP_PATH`.

## Requirements

- **FR-1**: Every page except home SHALL show a breadcrumb trail between the site header and the page content. Home (`/`) SHALL show no trail.
- **FR-2**: The trail SHALL list, in order, «Главная» and then every level down to the current page, per this table:

  | URL | Trail |
  | --- | --- |
  | `/authors` | Главная › Наши авторы |
  | `/authors/<id>` | Главная › Наши авторы › <author's first and last name> |
  | `/account` | Главная › Мастерская поэта |
  | `/account/author` | Главная › Мастерская поэта › Профиль автора |
  | `/login` | Главная › Вход |
  | `/signup` | Главная › Регистрация |

- **FR-3**: Every trail item except the last SHALL be a link to its page. The last item SHALL be the current page: plain text, not a link, marked as the current page for assistive technology, and shown in the accent color. The other items SHALL use the regular text color.
- **FR-4**: On `/authors/<id>` the last item SHALL be the author's first and last name, separated by a space, as on the author page heading. When the author can't be read because the service is unavailable, the last item SHALL read «Автор». When the author doesn't exist or isn't public, no trail SHALL be shown.
- **FR-5**: The trail SHALL be identical for every visitor: signed out, signed in, author or not. It SHALL NOT depend on the session.
- **FR-6**: A URL not listed in FR-2, opened directly or by reload, SHALL keep its HTTP 404 response and show the 404 page with no trail. An in-app link to such a URL may keep the previous page's trail; the app has no such links (design, Risks).
- **FR-7**: The trail SHALL follow client-side navigation: going from home to another page by an in-app link shows that page's trail, and going back to home by an in-app link (or the browser's Back button) hides it, without a full page reload.

### Non-functional

- **NFR-1**: The trail SHALL be rendered by Server Components only: no `"use client"` module in `features/breadcrumbs` or `app/@breadcrumbs`.
- **NFR-2**: Styles SHALL take every color from a design-token utility; the trail is expected to use `text-accent`, `text-foreground`, and `text-muted`, but any other token from `globals.css` is allowed. Forbidden: hard-coded color values (hex, `rgb()`/`hsl()`, arbitrary-value classes such as `text-[#…]`, inline `style` colors).
- **NFR-3**: The trail SHALL be a `nav` landmark with an accessible name, its items an ordered list; the current item SHALL carry `aria-current="page"`; separators SHALL be hidden from assistive technology.
- **NFR-4**: While the trail's data loads (the author name), its row SHALL keep the height of one text line, so the page content below doesn't jump when a one-line trail appears. A trail that wraps on a narrow screen (a long author name) may shift the content by the extra line; that is accepted.
- **NFR-5**: The production build's set of route paths SHALL stay identical to `main` (the slot adds no URL), and the build SHALL succeed under Cache Components.
- **NFR-6**: Every user-facing string SHALL be the Russian copy from the UI copy table below, verbatim.

## UI copy (NFR-6)

| Key | Text |
| --- | --- |
| Landmark name (`aria-label`) | Навигационная цепочка |
| Home item | Главная |
| `/authors` item | Наши авторы (authors' existing page title) |
| `/account` item | Мастерская поэта (authors' existing page title) |
| `/account/author` item | Профиль автора (authors' existing page title) |
| `/login` item | Вход |
| `/signup` item | Регистрация |
| Author fallback (FR-4) | Автор |
| Separator (decorative, hidden from assistive technology) | › |

## Mockups

Approved Claude Design canvas: https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z, artboard «7 · Навигационная цепочка — под шапкой» (`project/Breadcrumbs.dc.html`). Four frames: light and dark themes, each at 1024 px and 360 px.

| Screen / state | Mockup section |
| --- | --- |
| `/authors/<id>`, loading (empty 20 px row holds the place; the static pages render their trail into the prerendered shell, so only this page shows it) | «/authors · загрузка» (drawn on `/authors`, applies to `/authors/<id>`) |
| `/authors`, two items | «/authors · два пункта» |
| `/authors/<id>`, three items | «/authors/<id> · три пункта» |
| `/authors/<id>`, long name wrapping at 360 px | «/authors/<id> · длинное имя» |
| `/authors/<id>`, author unavailable → «Автор» | «/authors/<id> · автор недоступен» |
| `/account`, two items | «/account · два пункта» |
| `/account/author`, three items, hover on a parent link | «/account/author · три пункта · наведение» |
| `/login`, `/signup`, two items | «/login · два пункта», «/signup · два пункта» |
| Home: no trail, no reserved row | «нет цепочки · главная» |
| Unknown URL or unknown author → 404, no trail | «нет цепочки · неизвестный URL…» |

## Acceptance Criteria

Each FR/NFR is accepted by the scenarios in `specs/breadcrumbs/spec.md`. Headline criteria:

- **GIVEN** any visitor on home, **WHEN** the page renders, **THEN** no breadcrumb trail is shown.
- **GIVEN** a visitor on home, **WHEN** they follow the header's «Наши авторы» link, **THEN** «Главная › Наши авторы» appears under the header without a full reload, «Главная» links to `/`, and «Наши авторы» is plain accent-colored text with `aria-current="page"`.
- **GIVEN** a public author «Анна Ахматова», **WHEN** a visitor opens `/authors/<her id>`, **THEN** the trail reads «Главная › Наши авторы › Анна Ахматова», with «Наши авторы» linking to `/authors`.
- **GIVEN** a signed-in reader, **WHEN** they open `/account/author`, **THEN** the trail reads «Главная › Мастерская поэта › Профиль автора», with «Мастерская поэта» linking to `/account`.
- **GIVEN** a signed-out visitor and a signed-in reader, **WHEN** both open `/authors`, **THEN** they see the same trail.
- **GIVEN** an unknown URL `/no-such-page`, **WHEN** it renders the 404 page, **THEN** no trail is shown.
- **GIVEN** a visitor on `/authors`, **WHEN** they follow «Главная» in the trail, **THEN** home renders and the trail is gone.

## Capabilities

### New Capabilities

- `breadcrumbs`: the breadcrumb trail under the site header — which pages show it, its items and links, the current-item highlight, and its accessibility contract.

### Modified Capabilities

(none — the root layout gains a slot, but no existing requirement's behavior changes; `route-groups`' "route paths unchanged" scenario keeps holding, see NFR-5)

## Out of Scope

- Breadcrumbs on home, and on route states (`error.tsx`, `loading.tsx`) beyond what the slot renders by itself.
- Highlighting the active link in the header nav: the color highlight in FR-3 applies to the trail's current item only.
- Structured data (`BreadcrumbList` JSON-LD) for search engines.
- Truncating or collapsing long trails on narrow screens: the deepest trail has three items; it wraps.
- Trails for future pages (poems, collections): each new page adds its row to the route table in its own change.

## Impact

- New: `src/features/breadcrumbs/` (model, components, tests, index), `src/app/@breadcrumbs/` (slot pages and `default.tsx`).
- Changed: `src/app/layout.tsx` (renders the slot), `src/features/authors/index.ts` (+ page titles, + path constants, + author-name read), `src/features/authors/dal/public-author-name.ts` (new), `src/features/authors/model/author.types.ts` (+ `PublicAuthorNameResult`), `src/shared/config/` (+ `HOME_PATH`, + `SIGN_UP_PATH`), auth's `SignInForm.tsx` (its `/signup` literal → `SIGN_UP_PATH`), `docs/architecture.md` (project tree), `docs/design-system.md` (the trail as a feature-local primitive).
- No new dependency, no schema change, no environment variable.
- Branch overlap: the unmerged `feature/add-site-footer` also edits `src/app/layout.tsx` (it adds a footer after `{children}`); whichever merges second resolves a small conflict in the layout.
