# Proposal

## Why

The app has a header on every page but no footer. Readers have nowhere to find the copyright
notice or the standard site pages (about the project, the privacy policy, a way to get in
touch). The pages themselves come in a later change; this change adds the footer that will
link to them, so the site's frame is complete before those pages are written.

## What Changes

- A site footer, rendered by the root layout, so it appears on every page of the app,
  including the not-found, error, and loading screens.
- The footer shows a copyright notice with the site name and the years from the site's founding
  (2026) to the current year: `© 2026` while it is 2026, `© 2026–2027` from 2027, and so on.
- The footer links to three pages: «О проекте», «Политика конфиденциальности»,
  «Связаться с нами».
- The three pages do not exist yet. The links point at the paths the pages will have
  (`/about`, `/privacy`, `/contact`); until those pages ship, following a link shows the
  app's existing not-found screen. This is the "mocked link" the request asks for: the later
  change adds the pages and changes nothing in the footer.
- A new feature folder, `src/features/site-footer/`, holds the footer, its copy, and its link
  paths.

**Mockups.** Approved 2026-10-20; see `## Mockups` below.

## UI copy

Every user-facing string, verbatim:

| Key | Text |
| --- | --- |
| Copyright notice | `© <years> Поэтический Хаб` (`<years>` per FR-2: `2026`, or `2026–<current year>` with an en dash and no spaces; the name is `siteConfig.name`) |
| About link | `О проекте` |
| Privacy link | `Политика конфиденциальности` |
| Contact link | `Связаться с нами` |
| Footer navigation label (`aria-label`) | `Информация о проекте` |

## Requirements

- **FR-1** — Every page rendered inside the root layout shows the site footer below the page
  content: the home page, `/login`, `/signup`, `/authors`, `/authors/<id>`, `/account`,
  `/account/author`, and the not-found, error, and loading screens. Exactly one footer is
  rendered per page. The error and loading screens are covered by structure, not checked in a
  browser: `error.tsx` and `loading.tsx` render inside the root layout, the same layout that
  renders the footer, and neither can be triggered reliably on demand.
- **FR-2** — The footer shows the copyright notice `© <years> Поэтический Хаб`. `<years>` runs
  from the founding year, 2026, to the current calendar year (UTC), both as four digits:
  - when the current year equals the founding year, `<years>` is that one year (`2026`);
  - when it is later, `<years>` is `<founding>–<current>`, joined by an en dash (U+2013) with
    no spaces (`2026–2027`, `2026–2030`).
  - "Current year" is the year at the time the footer was last rendered. On the deployed site
    the footer is cached (design D2), so after 1 January the new range may appear up to one
    day late; that lag is accepted (user decision, 2026-10-20). The acceptance criteria below
    check the rendered output for a given clock, not the cache's timing.
- **FR-3** — The footer has a navigation landmark labelled «Информация о проекте» holding
  three links, in this order: «О проекте» → `/about`, «Политика конфиденциальности» →
  `/privacy`, «Связаться с нами» → `/contact`.
- **FR-4** — Until the target pages exist, following a footer link shows the app's existing
  not-found screen (HTTP 404), with the header and the footer still present.
- **NFR-1** — Semantics: the footer is a `<footer>` element that is a direct child of `<body>`'s
  content (outside `<main>`), so it is exposed as the `contentinfo` landmark; the links are
  `next/link` anchors inside a `<nav>`.
- **NFR-2** — The footer is a Server Component: no `"use client"`, no hooks, no client
  JavaScript of its own.
- **NFR-3** — Rendering mode: no route that `npm run build` reports as static (`○`) on `main`
  becomes dynamic (`ƒ`) because of the footer. The year is captured inside a `"use cache"`
  scope with the named `cacheLife("days")` profile (design D2), never read per request.
- **NFR-4** — Styling uses design-token utilities only (`text-muted`, `border-border`,
  `hover:text-accent`, …); no colour literals. Footer text and links reach WCAG 2.1 AA
  contrast (4.5:1) on `background` in both themes, at rest and on hover: `muted` 4.83:1
  (light) / 7.72:1 (dark), hover `accent` 5.70:1 / 7.27:1.
- **NFR-5** — Paths, the founding year, and copy are named constants: link paths and
  `SITE_FOUNDING_YEAR` (2026) in `features/site-footer/model/site-footer.constants.ts`, copy in
  `features/site-footer/model/site-footer-messages.ts`; no string literal for either in the
  component. The years come from `formatCopyrightYears` in `model/copyright-years.ts`, which
  returns only the years part; the component places `COPYRIGHT_SIGN`, the years, and
  `siteConfig.name` side by side in JSX, and the spaces between them are layout, not copy
  (user decision, 2026-10-20).
- **NFR-6** — Documentation: `docs/architecture.md` lists `features/site-footer/` and the
  footer in the root layout, and `docs/state-management.md` (Server caching) names a component
  that reads no request data as a third owner of a `"use cache"` scope, with `SiteFooter`'s
  year as the example (Gate 1 P1).

## Acceptance Criteria

- **FR-1:** GIVEN the app is running, WHEN a browser opens any of `/`, `/login`, `/signup`,
  `/authors`, `/authors/<id>` (an existing public profile), `/account` (signed in),
  `/account/author` (signed in), and `/does-not-exist`, THEN each page has exactly one
  `contentinfo` landmark, placed after the page's `main` element. The error and loading
  screens are not browser-checked (FR-1, covered by structure).
- **FR-2:** GIVEN the system clock reads 2026-10-20 (UTC), WHEN the footer renders, THEN it
  contains the text `© 2026 Поэтический Хаб`. GIVEN the clock reads 2027-01-01T00:00:00Z,
  WHEN the footer renders, THEN it contains `© 2026–2027 Поэтический Хаб`. GIVEN the clock
  reads 2030-06-15 (UTC), WHEN the footer renders, THEN it contains
  `© 2026–2030 Поэтический Хаб`.
- **FR-3:** GIVEN the footer renders, WHEN its navigation landmark «Информация о проекте» is
  queried, THEN it holds exactly three links, in order: «О проекте» with `href="/about"`,
  «Политика конфиденциальности» with `href="/privacy"`, «Связаться с нами» with
  `href="/contact"`.
- **FR-4:** GIVEN the app is running and no `/about` page exists, WHEN the reader activates
  «О проекте» in the footer, THEN the response is 404, the heading «Страница не найдена» is
  shown, and the footer is still present.
- **NFR-1:** GIVEN the footer renders, WHEN the accessibility tree is read, THEN there is a
  `contentinfo` landmark containing a `navigation` landmark named «Информация о проекте».
- **NFR-2:** GIVEN the change is complete, WHEN `src/features/site-footer/` is searched for
  `"use client"`, THEN there are no matches.
- **NFR-3:** GIVEN the change is complete, WHEN `npm run build` runs, THEN every route marked
  `○` on `main` is still `○` (its revalidate column may change), and no route is newly `ƒ`.
- **NFR-4:** GIVEN the change is complete, WHEN `src/features/site-footer/` (excluding
  `tests/`) is searched for hex, `rgb(`, or `hsl(` literals and Tailwind arbitrary colour
  values, THEN there are no matches. GIVEN the app is running in the light and in the dark
  colour scheme, WHEN the computed colours of the footer are read in a browser, THEN the
  copyright notice and the three links at rest are the `muted` value and a hovered link is the
  `accent` value (user decision, 2026-10-20); the NFR-4 contrast figures then hold. The Claude
  Design mockup may adjust these only with existing tokens from `docs/design-system.md`, never
  with a new colour.
- **NFR-5:** GIVEN the change is complete, WHEN `SiteFooter.tsx` is read, THEN it holds no
  path or copy string literals; they come from the two model files.
- **NFR-6:** GIVEN the change is complete, WHEN `docs/architecture.md` and
  `docs/state-management.md` are read, THEN the first lists `features/site-footer/` and the
  footer on the `layout.tsx` line, and the second's Server caching section names the
  component-owned cache scope with `SiteFooter` as its example.

## Capabilities

### New Capabilities

- `site-footer`: the footer on every page, its copyright notice, and its links.

### Modified Capabilities

- None.

## Out of Scope

- The «О проекте», «Политика конфиденциальности», and «Связаться с нами» pages themselves.
- Social-media links, a newsletter form, a language switcher, or any other footer content.
- A `global-error.tsx` (an error thrown by the root layout itself renders no footer; see
  `PROGRESS.md`'s existing follow-up).
- Changing the header.

## Impact

- `src/features/site-footer/` (new): `components/SiteFooter/`, `model/site-footer.constants.ts`,
  `model/site-footer-messages.ts`, `model/copyright-years.ts`, `tests/model/copyright-years.test.ts`,
  `tests/components/SiteFooter.test.tsx`, `index.ts`.
- `src/app/layout.tsx`: renders `<SiteFooter />` after `{children}`.
- `docs/architecture.md`: the project tree lists the new feature and the layout's footer.
- `docs/state-management.md`: Server caching names the component-owned cache scope.
- No dependencies, data, schema, or contracts change.

## Mockups

| Screen | Link |
| --- | --- |
| Site footer on every page, and under the not-found screen: light and dark, 1280 px and 375 px, links at rest, hovered, and keyboard-focused, `© 2026` and `© 2026–2027` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z, artboard «6 · Подвал — все страницы» (`project/Footer.dc.html`) |
