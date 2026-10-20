# Design

## Context

`src/app/layout.tsx` is the root shell: `<html>`, `<body className="flex min-h-full flex-col">`,
`Providers`, an inline `<header>`, then `{children}`. Every page and route-state screen
(`error.tsx`, `not-found.tsx`, `loading.tsx`) renders its own
`<main className="… flex-1 …">`, so anything placed after `{children}` in the body sits at the
bottom of the viewport on short pages and after the content on long ones.

The app runs with Cache Components. Under it, a Server Component may not read `new Date()`
during prerendering unless the read sits inside a `"use cache"` scope (the value is captured
once and reused) or after `await io()` inside a `<Suspense>` boundary (the value is produced per
request, outside the static shell). Source: Next.js docs, `io` and `cacheLife` pages
(context7, `/vercel/next.js`).

`docs/code-style.md`: a route file holds only its default export; any other component lives in a
feature's `components/`. `docs/architecture.md`: `shared/` holds feature-agnostic primitives;
a `shared/` abstraction waits for a second consumer.

## Goals / Non-Goals

**Goals**
- One footer, rendered once by the root layout, on every page.
- A copyright notice from the founding year to the current year that keeps static pages static.
- Links whose paths are final, so the later pages change nothing here.

**Non-Goals**
- The three pages themselves.
- Any client-side behaviour in the footer.

## Decisions

### D1 — A new feature, `features/site-footer`

```
src/features/site-footer/
├── components/SiteFooter/SiteFooter.tsx   # async Server Component, "use cache"
├── model/site-footer.constants.ts         # FOOTER_LINK_PATHS, SITE_FOUNDING_YEAR (2026), YEAR_RANGE_SEPARATOR (en dash)
├── model/site-footer-messages.ts          # copy: link labels, nav label, COPYRIGHT_SIGN
├── model/copyright-years.ts               # formatCopyrightYears(foundingYear, currentYear): pure
├── tests/model/copyright-years.test.ts
├── tests/components/SiteFooter.test.tsx
└── index.ts                               # export { SiteFooter }
```

`app/layout.tsx` imports `SiteFooter` from `@/features/site-footer` and renders it after
`{children}`, inside `Providers`, a sibling of the header. The feature imports
`siteConfig` from `@/shared/config/site` for the name; it imports no other feature.

Alternatives considered:
- **Inline JSX in `layout.tsx`, like the header.** The header is inline, but the footer needs a
  cached scope for the year (D2), which would be a second top-level function in a route file;
  `docs/code-style.md` moves that out. Rejected.
- **`shared/ui/SiteFooter`.** `shared/ui` is for reusable primitives used by several features;
  the footer is one app-specific block with its own copy and paths. Rejected.
- **Link paths in `shared/config/`** (like `account-paths.ts`). Nothing else reads them yet;
  when the later change adds the pages it can move them if the pages' feature needs them.
  YAGNI for now.

### D2 — The year: `"use cache"` + `cacheLife("days")` on `SiteFooter`

`SiteFooter` is `async`, starts with `"use cache"` and calls `cacheLife("days")`, then reads
`new Date().getUTCFullYear()` and passes it to `formatCopyrightYears(SITE_FOUNDING_YEAR,
currentYear)`. That pure function returns `"2026"` when the two years are equal and
`"2026–<current>"` (en dash, no spaces) when the current year is later. A current year earlier
than the founding year (a wrong server clock) returns the founding year alone, so the footer
never shows a backwards range. The component renders
`{COPYRIGHT_SIGN} {years} {siteConfig.name}`; the spaces between the three parts are JSX
layout, not copy.

- The footer renders into every page's static shell; no route turns dynamic (NFR-3).
- `"days"` revalidates the cached footer after a day, so after 1 January the year flips on the
  first request past that window, at most about a day late. The value is UTC
  (`getUTCFullYear`), so the flip is the same for every visitor and test.
- A page's shell lives as long as its shortest cache scope. `"days"` is longer than any
  lifetime the pages already declare (home: `"minutes"`), so it shortens only routes that are
  fully static today, which gain a one-day revalidate. Accepted: a daily re-render of a static
  shell costs one render.

Alternatives considered:
- **`await io()` inside `<Suspense>`.** Exact year per request, but every page gets a dynamic
  hole and a fallback for a value that changes once a year. Rejected.
- **A Client Component reading `new Date()`.** Adds client JavaScript (NFR-2) and a hydration
  mismatch on the server/browser year boundary and across time zones. Rejected.
- **`cacheLife("max")`.** Keeps shells fully static, but the year could stay stale for weeks.
  Rejected.
- **The year at build time only (no revalidation).** Wrong until the next deploy. Rejected.

### D3 — Mocked links are the final paths

The three links use `next/link` with `/about`, `/privacy`, `/contact`. No page answers them yet,
so the root `not-found.tsx` renders (404) inside the root layout, footer included (FR-4).
Not `href="#"` (a link that goes nowhere is an accessibility anti-pattern and would need a
second edit later) and not a disabled-looking element (the request asks for links).
`next/link` may prefetch these paths and get a 404 back. That 404 is the expected answer while
the pages don't exist (FR-4), not a failure: the links keep the default prefetch and carry no
`prefetch={false}` (user decision, 2026-10-20), so the later change has nothing to undo. Only a
console error, an uncaught exception, or a network failure (no HTTP response) on these links
counts as a defect for Gate 3.

### D4 — Markup and look (from the approved mockup)

Values from the Claude Design mockup, artboard «6 · Подвал» (see `proposal.md`, Mockups):

```
<footer class="border-t border-border bg-background">            <!-- full-bleed top rule -->
  <div class="mx-auto flex w-full max-w-4xl flex-col items-start gap-x-6 gap-y-2 p-6
              text-sm text-muted
              min-[600px]:flex-row min-[600px]:items-center min-[600px]:justify-between">
    <p>© 2026 Поэтический Хаб</p>
    <nav aria-label="Информация о проекте">
      <ul class="flex flex-wrap gap-x-4 gap-y-2 min-[600px]:justify-end">
        <li><a href="/about" class="text-muted transition-colors duration-150 hover:text-accent
               focus-visible:outline-2 focus-visible:outline-offset-2
               focus-visible:outline-accent">О проекте</a></li> …
      </ul>
    </nav>
  </div>
</footer>
```

- The top rule spans the whole viewport; the content sits in the header's column
  (`max-w-4xl`, 896 px) with 24 px padding on every side. The 600 px breakpoint is the
  header's: below it the notice and the links stack, left-aligned; from it they share one row,
  notice left, links right.
- Text: 14 px / 20 px (`text-sm`). Gaps: 8 px between rows, 24 px between the notice and the
  links, 16 px between links.
- Colour: the whole footer is `muted` at rest, copyright and links alike; links turn `accent`
  on hover with a 150 ms colour transition and no underline (user decision, 2026-10-20,
  NFR-4). Keyboard focus: a 2 px `accent` outline, 2 px offset. `muted` on `background` is
  4.83:1 (light) and 7.72:1 (dark); hover `accent` is 5.70:1 and 7.27:1; all above AA.
- All values are existing tokens and Tailwind's default scale; no CSS Module is needed.

### D5 — Testing

`SiteFooter.test.tsx` relies on the global `next/cache` mock in `vitest.setup.ts` (no-op
`cacheLife`), sets the clock with `vi.setSystemTime`, and renders
`await SiteFooter()`. It covers FR-2 (three clock values), FR-3 (the landmark, names, order,
hrefs), and NFR-1 (`contentinfo` and the named `navigation`). The `"use cache"` directive is a
plain string under Vitest, so caching itself is not exercised there; NFR-3 is checked by the
build route table. FR-1 and FR-4 span the layout and routing, which `src/app/**` coverage
excludes, so Gate 3 checks them in a browser.

### D6 — Documentation

`docs/architecture.md`: the tree gains `features/site-footer/`, and the `layout.tsx` line notes
the footer. `docs/state-management.md` (Server caching) gains a third owner of a cache scope
next to pages and the feature DAL: a component that reads no request data may own one
(`SiteFooter`'s year), with a named `cacheLife` profile (Gate 1 P1). `docs/design-system.md`
is not refreshed: the footer adds no token or shared
primitive.

### Sequence diagrams

None. The footer crosses no boundary: no request data, no Server Action, no external service.

## Risks / Trade-offs

- **The year flips up to about a day late** after 1 January (D2). Accepted; the copyright year
  has no legal deadline at the minute.
- **Links lead to a 404 until the pages ship** (D3). That is the agreed placeholder; the
  later change only adds the pages.
- **Fully static routes gain a one-day revalidate** (D2). Accepted; the build table is compared
  in task 2.3.
- **An error thrown by the root layout itself** renders without the footer, since there is no
  `global-error.tsx`. Out of scope, already a follow-up in `PROGRESS.md`.

## Migration Plan

None. No data, config, or environment change; ships with the next deploy.

## Scaffold map

| File | Stub |
| --- | --- |
| `src/features/site-footer/index.ts` | `export { SiteFooter } from "./components/SiteFooter/SiteFooter";` |
| `src/features/site-footer/components/SiteFooter/SiteFooter.tsx` | `export async function SiteFooter(): Promise<ReactElement>` with `"use cache"` and `cacheLife("days")`, body returns an empty `<footer />` |
| `src/features/site-footer/model/site-footer.constants.ts` | `FOOTER_LINK_PATHS` (`about`, `privacy`, `contact`), `SITE_FOUNDING_YEAR`, `YEAR_RANGE_SEPARATOR` |
| `src/features/site-footer/model/copyright-years.ts` | `export function formatCopyrightYears(foundingYear: number, currentYear: number): string`, stub body |
| `src/features/site-footer/model/site-footer-messages.ts` | `FOOTER_LINK_LABELS`, `FOOTER_NAV_LABEL`, `COPYRIGHT_SIGN` |
