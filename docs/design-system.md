# Design system

Extracted from the code as it is. Values come from `src/app/globals.css`, `src/shared/ui`, and
the feature components. Where the code has no named value, this document says so instead of
inventing one. Read this before planning UI (`ui-plan`) or writing component styles
(`docs/styling.md` covers *how* to style; this covers *with what*).

## 1. Basis

Own primitives, no ready-made component library. Styling is Tailwind CSS v4 utilities plus
CSS Modules for custom effects. Both read the same CSS variables defined in
`src/app/globals.css`, which has a light and a dark (`prefers-color-scheme: dark`) set. The
shared primitives so far are `Button` and `Alert` in `src/shared/ui`.

## 2. Design tokens

| Role | Value (light / dark) | Name in code |
| --- | --- | --- |
| primary | `#7c3aed` / `#a78bfa`, text on it `#ffffff` / `#0a0a0a` | `--accent` → Tailwind `accent` (`bg-accent`, `text-accent`); `--accent-foreground` → `accent-foreground` |
| danger | `#dc2626` / `#f87171` | `--danger` → Tailwind `danger` (`text-danger`, `border-danger`) |
| success | `#15803d` / `#4ade80` | `--success` → Tailwind `success` (`border-success`) |
| muted | `#71717a` / `#a1a1aa` | `--muted` → Tailwind `muted` (`text-muted`) |
| spacing step | Tailwind's default scale (0.25rem per step); no project step defined. Most used: page `px-6 py-16`, stacks `gap-4`, controls `px-3 py-2` | no name yet |
| text-size step | Tailwind's default scale; no project step defined. Used: `text-sm`, `text-lg`, `text-xl`, `text-2xl`, `text-4xl` | no name yet |

Other tokens in the code, outside the four roles:

| Token | Value (light / dark) | Name in code |
| --- | --- | --- |
| background | `#ffffff` / `#0a0a0a` | `--background` → `background` |
| foreground | `#171717` / `#ededed` | `--foreground` → `foreground` |
| surface | `#f4f4f5` / `#18181b` | `--surface` → `surface` |
| border | `#e4e4e7` / `#27272a` | `--border` → `border` |
| fonts | Geist Sans / Geist Mono | `--font-sans`, `--font-mono` |

No radius or shadow tokens exist. Radii are written per component (see section 3).

`danger` and `success` text belongs on `background` only: `danger` on `surface` is 4.39:1 in the
light theme, below WCAG AA for text. Inside an `Alert` the tone colours only the border.
`src/shared/ui/tests/feedback-contrast.test.ts` checks the AA thresholds against these values.

## 3. UI primitives

| Name | What it is | Where it lives |
| --- | --- | --- |
| `Alert` | Feedback box: tone `danger` (`role="alert"`) or `success` (`role="status"`); 4px left border in the tone colour, `surface` background, `foreground` text, `rounded-md px-3 py-2 text-sm font-medium`; `className` for layout utilities only | `src/shared/ui/Alert/Alert.tsx` |
| `Button` | Pill button (`border-radius: 9999px`), variants `primary` (accent fill) and `ghost` (transparent, surface on hover); a `ghost` with `aria-pressed="true"` keeps the surface fill (toggle buttons); disabled at 50% opacity; press scale 0.97 | `src/shared/ui/Button/Button.tsx` + `Button.module.css` |
| `ButtonLink` | A navigation link (`next/link`, an `<a>`) drawn exactly as `Button`: same `Button.module.css`, variants `primary` and `ghost`. Use it when a button-looking control navigates (the account page's author links); a `Button` stays for actions | `src/shared/ui/ButtonLink/ButtonLink.tsx` |
| `TextField` | Labelled input with error text wired through `aria-invalid` / `aria-describedby`; `rounded-md`, `px-3 py-2`, accent border on focus; on error, `text-danger` error text and a `danger` border that stays while focused. Takes the input's own props, so it works uncontrolled (auth forms) and controlled (the author editor). `FIELD_INPUT_CLASS` exports the input look for inputs it can't render (the about textarea). `layout="stacked"` (default) puts the label above the input; `layout="columns"` makes label, input, and error items of the caller's two-column grid (label in the first column from 600 px, input `max-w-sm`) | `src/shared/ui/TextField/TextField.tsx` |
| `PoemCard` | Card: `border-radius: 1rem`, surface background, accent border and glow on hover; quoted excerpt with an accent left rule | `src/features/poems/components/PoemCard/` (feature-local) |
| `AuthorPhoto` | Portrait box: 300 × 400 px from a 460 px viewport up, full column width at 3:4 below; `border-radius: 1rem`, `object-fit: cover`, surface background. No photo → `AuthorPhotoPlaceholder`, a 64 px `muted` stroke user icon, `aria-hidden`. `next/image` with `sizes`, quality `IMAGE_QUALITY`, `preload`; `unoptimized` only for a local Supabase host | `src/features/authors/components/AuthorPhoto/` + `AuthorPhoto.module.css` (feature-local) |
| About-editor toolbar | `MarkdownToolbar`: seven `ghost` format buttons with Russian accessible names; `AlignControl`: three `ghost` toggle buttons (`aria-pressed`); `AboutViewTabs`: «Редактор»/«Просмотр» as an ARIA tab list (14 px medium `muted`, selected `foreground` with a 2 px `accent` underline, arrow keys switch); a counter «N / 1000» (14 px `muted`, tabular figures, `danger` over the limit) | `src/features/authors/components/{MarkdownToolbar,AlignControl,AboutViewTabs}/` (feature-local) |
| `PhotoPicker` | File input with product-language text: the native input is `sr-only` (still focusable), a `surface` pill label (`rounded-full px-3 py-2 text-sm font-medium`, accent focus outline via `peer-focus-visible`) opens it, and the chosen file's name follows in 14 px `muted`. Use it for any file input, since a native one shows the browser's language | `src/features/authors/components/PhotoPicker/` (feature-local) |
| `SaveNotice` | Always-mounted `role="status"` paragraph, 14 px `muted`; emptied while a save is pending and reads «Сохранено» after each success, never hidden on a timer | `src/features/authors/components/SaveNotice/` (feature-local) |

## 4. States

| State | Name in this project | What it looks like |
| --- | --- | --- |
| loading | `Loading` (`src/app/loading.tsx`, route level) | skeleton blocks (`bg-surface animate-pulse`, off under reduced motion) plus a screen-reader-only "Loading…" status. Inside components there is no shared pattern (`PoemList` shows the text "Loading poems…"; the header's session part shows an empty `min-w-24` placeholder as its `<Suspense>` fallback, with neither "Sign in" nor "Sign out") |
| error | `RootError` (`src/app/error.tsx`, route level) | heading "Something went wrong", muted explanation, optional error digest in mono, and a "Try again" `Button`. Inside components, a danger `Alert` (form-level and list errors) or an inline `text-danger` paragraph (field errors, the header's sign-out failure) |
| empty | no named component | muted text, e.g. "No poems match your search." in `PoemList` |
| offline | none | not handled |

Related route state: `NotFound` (`src/app/not-found.tsx`) shows the heading "Page not found",
muted text, and an accent link back home.

## 5. Source

- Source: non-machine — skipped connecting a tool
- Commit: `23ff8f1`
