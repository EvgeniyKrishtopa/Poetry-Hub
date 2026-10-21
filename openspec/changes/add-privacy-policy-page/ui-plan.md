# UI Plan

State names and existing components come from `docs/design-system.md`. Values come from the
approved Claude Design mockup (artboard «9 · /privacy — Политика конфиденциальности»,
`project/Privacy.dc.html`, see `proposal.md` § Mockups); `ui-plan` pulls node values only from
Figma/Pencil, so they were taken from the artifact by hand. The artboard uses the same rules as
the about artboard (`.page`, `.h-display`, `.prose`, `.skel`, `.sk-*`), so `/privacy` reuses the
about page's markup unchanged (design D1, D5).

| Screen | States | Components | Value source |
| --- | --- | --- | --- |
| `/privacy`: the privacy policy (inside the root layout: header, breadcrumb trail, footer) | content (FR-1); `Loading` (only when the content streams at request time, design D3); `RootError` (any failure, FR-2) | **Reused (renamed from the about feature, no new component):** `ContentPageArticle`: the CMS title as `h1` (`text-3xl font-bold tracking-tight` (30/36) below 640 px, `sm:text-4xl` (36/40) above), then an `<article>` `max-w-prose` (65ch), `flex flex-col gap-6`, paragraphs `whitespace-pre-line`, `text-prose-compact leading-relaxed` below 640 px and `sm:text-lg` (18/29) above, colour `foreground`. `ContentPagePlaceholder` on the `Loading` pattern: `role="status"` with visually hidden «Загрузка…», a title bar `h-9`/`sm:h-10`, 60% wide (max 420 px), then a `max-w-prose` column of three paragraph groups (`gap-6`) of `h-4` lines (`gap-3`; 4, 4, and 2 lines, last lines ragged), blocks `aria-hidden`. Both in `src/features/content-page/components/`. **Error state:** `RootError` (`src/app/error.tsx`) unchanged; the mockup matches its markup. **Trail:** `BreadcrumbsView` (`src/features/breadcrumbs/components/BreadcrumbsView/`) with «Главная › Политика конфиденциальности» in all three states (FR-4). **Layout:** route `<main>` = the `/about` route's (`mx-auto flex w-full max-w-4xl flex-1 flex-col items-start gap-8 px-6 py-16`) | Claude Design, `Privacy.dc.html` (`.page`, `.h-display`, `.prose`, `.skel`, `.sk-*` rules; content, loading, error frames at 1280/375, light/dark) |
| `/about`: the project description, now served by the shared feature (FR-6) | content; `Loading`; `RootError` — unchanged | `ContentPageArticle`, `ContentPagePlaceholder` (the former `AboutArticle`, `AboutPlaceholder`, same markup); `RootError`; `BreadcrumbsView` with «Главная › О проекте» | Claude Design, `About.dc.html` (unchanged) |
| Footer links «Политика конфиденциальности» and «Связаться с нами» (existing footer, every page) | at rest, hovered, focused — unchanged | `SiteFooter` unchanged; only its `/privacy` target now resolves to the page above (FR-5); `/contact` still shows the existing not-found screen | Claude Design, `Footer.dc.html` (unchanged) |

Mockup details deliberately not carried over, the same as on `/about` (`add-about-page` ui-plan,
user decisions 2026-10-21): the mobile prose is 15 px (`text-prose-compact`) instead of the
artboard's 16 px; the skeleton's 13 px desktop line gap becomes `gap-3` (12 px) and its 14 px
mobile line height stays `h-4`; `aria-busy` on `<main>` is left out (the route's `<main>` doesn't
know whether its feature is loading; `role="status"` already announces it). The skeleton's line
widths differ from the about artboard's by a few percent (97/94/99% vs 11/12 and 3/4); the
shared placeholder keeps the about widths, inside the "match in structure" rule.

## Acceptance criteria with a visible outcome

| Criterion | Screen row |
| --- | --- |
| FR-1 title and paragraphs | `/privacy`, content |
| FR-2 error screen with header, trail, footer | `/privacy`, `RootError` |
| FR-3 new title after publish | `/privacy`, content |
| FR-4 trail «Главная › Политика конфиденциальности» | `/privacy`, trail |
| FR-5 footer link opens the page; `/contact` stays not-found | Footer links row; `/privacy`, content |
| FR-6 each page shows its own entry; about unchanged | `/about` row; `/privacy`, content |
| NFR-3 markup shown as text | `/privacy`, content |
| NFR-4 named token utilities only | `/privacy` and `/about`, all states |
