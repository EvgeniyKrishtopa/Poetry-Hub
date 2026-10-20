# Tasks

## 1. The `site-footer` feature (`src/features/site-footer/`) <!-- judgement-heavy -->

- [x] 1.1 (NFR-5) Add `model/site-footer.constants.ts` with `FOOTER_LINK_PATHS`
  (`about: "/about"`, `privacy: "/privacy"`, `contact: "/contact"`), `SITE_FOUNDING_YEAR`
  (`2026`), and `YEAR_RANGE_SEPARATOR` (the en dash, U+2013), and
  `model/site-footer-messages.ts` with the proposal's UI copy table verbatim: the three link
  labels, the navigation label «Информация о проекте», and the copyright sign `©`.
- [x] 1.2 (FR-2) Implement `model/copyright-years.ts` per design D2:
  `formatCopyrightYears(foundingYear, currentYear)` returns the founding year alone when the
  current year is equal or earlier, and `<founding><en dash><current>` when it is later.
  - Verify with `tests/model/copyright-years.test.ts`: 2026/2026 → `2026`, 2026/2027 →
    `2026–2027`, 2026/2030 → `2026–2030`, 2026/2025 → `2026`.
- [x] 1.3 (FR-2, FR-3, NFR-1, NFR-2, NFR-4) Implement `components/SiteFooter/SiteFooter.tsx`
  per design D2 and D4: an async Server Component that starts with `"use cache"`, calls
  `cacheLife("days")`, reads the year with `new Date().getUTCFullYear()`, and renders a
  `<footer>` with the copyright notice (`COPYRIGHT_SIGN`, `formatCopyrightYears`,
  `siteConfig.name`) and a `<nav>` of three `next/link`
  links built from the two model files. Token utilities only. Export it from `index.ts`.
  Narrow the scaffold's `Promise<ReactNode>` return type to `Promise<ReactElement>`.
  Remove the scaffold's TEMPORARY `site-footer` lines from `knip.jsonc`, since the component now
  imports the three model files.
- [x] 1.4 (FR-2, FR-3, NFR-1) Write `tests/components/SiteFooter.test.tsx` per design D5:
  rely on the global `next/cache` mock in `vitest.setup.ts`, set the clock with `vi.setSystemTime`, render `await SiteFooter()`.
  - FR-2: the 2026-10-20, 2027-01-01T00:00:00Z, and 2030-06-15 scenarios.
  - FR-3: the named navigation landmark holds exactly three links with the right names, order,
    and `href`s.
  - NFR-1: one `contentinfo` landmark containing the named `navigation` landmark.

## 2. Wire it into the root layout and verify <!-- judgement-heavy -->

- [ ] 2.1 (FR-1) Render `<SiteFooter />` in `src/app/layout.tsx` after `{children}`, inside
  `Providers`, imported from `@/features/site-footer`. The scaffold already added this line
  (approved file map, 2026-10-20); confirm it is still there and in that place.
- [ ] 2.2 (NFR-6) Update `docs/architecture.md`: add `features/site-footer/` to the project tree and
  note the footer on the `layout.tsx` line. Update `docs/state-management.md`'s Server caching
  section: a component that reads no request data may own a `"use cache"` scope with a named
  `cacheLife` profile, with `SiteFooter`'s year as the example.
- [ ] 2.3 (NFR-2, NFR-3, NFR-4, NFR-5) Verify statically and run the chain.
  - `grep -rn '"use client"' src/features/site-footer` prints nothing (NFR-2).
  - The NFR-4 colour-literal search over `src/features/site-footer` (excluding `tests/`) prints
    nothing, and `SiteFooter.tsx` holds no path or copy literal (NFR-5).
  - `npm run typecheck && npm run lint && npm run test:coverage && npm run build && npm run knip`
    all pass.
  - The build route table: every route that is `○` on `main` is still `○`; no route is newly
    `ƒ` (NFR-3).
- [ ] 2.4 (FR-1, FR-4, NFR-1, NFR-4) Gate 3 (`web-qa`) in both colour schemes:
  - FR-1: one `contentinfo` landmark after `main` on `/`, `/login`, `/signup`, `/authors`,
    `/authors/<id>` (an existing public profile), `/account` and `/account/author` (signed in),
    and `/does-not-exist`;
  - NFR-4: `getComputedStyle` on the copyright notice and a link at rest returns the `muted`
    value, and on a hovered link the `accent` value, in each scheme;
  - FR-4: activate «О проекте» → 404, «Страница не найдена», footer present; repeat for the
    other two links;
  - the footer at 375 px and 1280 px width matches the approved mockup; links show a visible
    focus ring under keyboard navigation;
  - no console errors, uncaught exceptions, or network failures (no HTTP response) on the
    footer links; a 404 answer to a prefetch of `/about`, `/privacy`, or `/contact` is expected
    and passes (design D3); replay the recorded scenarios.
