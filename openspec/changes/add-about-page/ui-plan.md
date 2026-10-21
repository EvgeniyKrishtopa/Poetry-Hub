# UI Plan

State names and existing components come from `docs/design-system.md`. Values come from the
approved Claude Design mockup (artboard «8 · /about — О проекте», `project/About.dc.html`, see
`proposal.md` § Mockups); `ui-plan` pulls node values only from Figma/Pencil, so they were taken
from the artifact by hand.

| Screen | States | Components | Value source |
| --- | --- | --- | --- |
| `/about`: the project description (inside the root layout: header, breadcrumb trail, footer) | content (FR-1); `Loading` (only when the content streams at request time, design D3); `RootError` (any failure, FR-2) | **New:** `AboutArticle`: the CMS title as `h1` (`text-3xl font-bold tracking-tight` (30/36, −0.025em) below 640 px and `sm:text-4xl` (36/40) above), then an `<article>` `max-w-prose` (65ch), `flex flex-col gap-6`, paragraphs `whitespace-pre-line`, `text-prose-compact leading-relaxed` (15/24) below 640 px and `sm:text-lg` (18/29) above, colour `foreground`; reason: no existing component renders CMS prose. **Loading state:** `AboutPlaceholder` on the `Loading` pattern (`rounded bg-surface animate-pulse motion-reduce:animate-none`): `role="status"` with visually hidden «Загрузка…», a title bar `h-9` below 640 px and `sm:h-10` above (one title line), 60% wide (max 420 px), then a `max-w-prose` column of three paragraph groups (`gap-6`) of `h-4` lines (`gap-3`; 4, 4, and 2 lines, last lines ragged), blocks `aria-hidden`; it can't reuse `src/app/loading.tsx`, a route file. **Error state:** `RootError` (`src/app/error.tsx`) unchanged; the mockup matches its markup. **Trail:** `BreadcrumbsView` (`src/features/breadcrumbs/components/BreadcrumbsView/`) with «Главная › О проекте» in all three states (FR-4). **Layout:** route `<main>` = `/authors` wrapper (`mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16`) plus `items-start` | Claude Design, `About.dc.html` (`.page`, `.h-display`, `.prose`, `.skel`, `.sk-*` rules; content, loading, error frames at 1280/375, light/dark) |
| Footer link «О проекте» (existing footer, every page) | at rest, hovered, focused — unchanged | `SiteFooter` unchanged; only its `/about` target now resolves to the page above (FR-5) | Claude Design, `Footer.dc.html` (unchanged) |

Mockup details deliberately not carried over: the skeleton's 13 px line gap (desktop) becomes
`gap-3` (12 px), and its 14 px mobile line height stays `h-4`, a few pixels inside the
"match in structure" rule (user decision, 2026-10-21); `aria-busy` on `<main>` is left out
because the route's `<main>` doesn't know whether its feature is loading, and the
`role="status"` already announces it.

Mobile type scale, smaller than the mockup on purpose (user decision, 2026-10-21, during Gate 3):
below 640 px the title is 30 px (`text-3xl`) instead of 36 px, and the prose is 15 px
(`text-prose-compact`, a named `@theme` step in `globals.css`) instead of 16 px. From 640 px up
the mockup's 36 px and 18 px stay.

## Acceptance criteria with a visible outcome

| Criterion | Screen row |
| --- | --- |
| FR-1 title and paragraphs | `/about`, content |
| FR-2 error screen with header, trail, footer | `/about`, `RootError` |
| FR-3 new title after publish | `/about`, content |
| FR-4 trail «Главная › О проекте» | `/about`, trail |
| FR-5 footer link opens the page; `/privacy` stays not-found | Footer link row; `/about`, content (the `/privacy` not-found screen is the existing `NotFound`, unchanged) |
| NFR-3 markup shown as text | `/about`, content |
| NFR-4 named token utilities only | `/about`, all states |
