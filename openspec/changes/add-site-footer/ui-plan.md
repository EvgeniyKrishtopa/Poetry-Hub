# UI plan

Source of names: `docs/design-system.md` (Commit `23ff8f1`). Values: the approved Claude Design
mockup, artboard «6 · Подвал» of https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z, read
2026-10-20 (no Figma/Pencil server; values taken from the artifact by hand).

| Screen | States | Components | Value source |
| --- | --- | --- | --- |
| Site footer, at the bottom of every page (FR-1, FR-2, FR-3, NFR-1, NFR-4) | Only one state: static content. It has no `Loading`, error, empty, or offline state, because it reads no data. Two widths: below 600 px the copyright notice and the link row stack; from 600 px they sit on one row, matching the header's breakpoint | **New:** `SiteFooter` (`src/features/site-footer/components/SiteFooter/`), the app's only footer block; no existing primitive draws a plain text link. Tokens: `muted` (all text at rest), `accent` (link hover), `border` (full-bleed top rule), `background`. Inner column `max-w-4xl`, padding 24 px; gaps 8 px rows / 24 px notice–links / 16 px between links; `text-sm` (14/20); link hover 150 ms colour transition, no underline; focus: 2 px `accent` outline, 2 px offset. Below 600 px stacked and left-aligned, from 600 px one row (notice left, links right) | Claude Design, artboard «6 · Подвал» |
| Not-found screen reached through a footer link (FR-4) | `NotFound` (`src/app/not-found.tsx`), unchanged, with the footer below it | Existing `NotFound` route state; `SiteFooter` | Claude Design, artboard «6 · Подвал» (first state) |

## Criteria with a visible outcome

- FR-1: footer row (on every page, including the not-found row).
- FR-2: footer row (copyright notice).
- FR-3: footer row (three links in a navigation landmark).
- FR-4: not-found row.
- NFR-1: footer row (`contentinfo` + named `navigation`).
- NFR-4: footer row (`muted` / `accent` tokens).

No visible criterion is left without a row. NFR-2, NFR-3, NFR-5, and NFR-6 have no
human-visible outcome.
