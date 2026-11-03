# Design system

Extracted from the code as it is. Values come from `src/app/globals.css`, `src/shared/ui`, and
the feature components. Where the code has no named value, this document says so instead of
inventing one. Read this before planning UI (`ui-plan`) or writing component styles
(`docs/styling.md` covers *how* to style; this covers *with what*).

## 1. Basis

Own primitives, no ready-made component library. Styling is Tailwind CSS v4 utilities plus
CSS Modules for custom effects. Both read the same CSS variables defined in
`src/app/globals.css`, which has a light and a dark (`prefers-color-scheme: dark`) set. The
shared primitives live in `src/shared/ui` (section 3).

## 2. Design tokens

| Role | Value (light / dark) | Name in code |
| --- | --- | --- |
| primary | `#7c3aed` / `#a78bfa`, text on it `#ffffff` / `#0a0a0a` | `--accent` → Tailwind `accent` (`bg-accent`, `text-accent`); `--accent-foreground` → `accent-foreground` |
| danger | `#dc2626` / `#f87171`, text on it `#ffffff` / `#0a0a0a` (4.8:1 / 7.6:1) | `--danger` → Tailwind `danger` (`text-danger`, `border-danger`); `--on-danger` → `on-danger` (the danger button's text) |
| success | `#15803d` / `#4ade80` | `--success` → Tailwind `success` (`border-success`) |
| muted | `#71717a` / `#a1a1aa` | `--muted` → Tailwind `muted` (`text-muted`) |
| spacing step | Tailwind's default scale (0.25rem per step); no project step defined. Most used: page `px-6 py-16`, stacks `gap-4`, controls `px-3 py-2` | no name yet |
| text-size step | Tailwind's default scale, plus one project step: `prose-compact` (15 px), long prose below 640 px. Used: `text-sm`, `text-prose-compact`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`, `text-4xl` | `--text-prose-compact` in `globals.css` `@theme` → `text-prose-compact` |

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
| `Alert` | Feedback box: tone `danger` (`role="alert"`), `success` (`role="status"`), or `neutral` (`role="status"`, `muted` border; the session-expired notice on `/login`); 4px left border in the tone colour, `surface` background, `foreground` text, `rounded-md px-3 py-2 text-sm font-medium`; `className` for layout utilities only | `src/shared/ui/Alert/Alert.tsx` |
| `Button` | Pill button (`border-radius: 9999px`), variants `primary` (accent fill), `ghost` (transparent, surface on hover), and `danger` (solid `danger` fill, `on-danger` text, 15% black mixed into the fill on hover; destructive actions such as deleting a poem); disabled at 50% opacity; press scale 0.97 | `src/shared/ui/Button/Button.tsx` + `Button.module.css` |
| `ButtonLink` | A navigation link (`next/link`, an `<a>`) drawn exactly as `Button`: same `Button.module.css`, variants `primary` and `ghost`. Use it when a button-looking control navigates (the account page's author links); a `Button` stays for actions | `src/shared/ui/ButtonLink/ButtonLink.tsx` |
| `Dialog` | Native modal `<dialog>` the caller opens through `ref` (`showModal()`); `background` box with `border`, `rounded-2xl`, `max-w-lg` and a 16 px viewport gutter, `p-5` (`p-6` from 600 px); 20 px semibold heading it is labelled by, optional 14 px `muted` description, then the content; a 36 px round corner close button (`×`, accessible name `closeLabel`, `surface` on hover, last in the DOM); the backdrop (`--backdrop`) closes it, and both fade in. `closable={false}` holds it open while a request runs: the close button is disabled, the backdrop and Escape do nothing, and a close forced anyway re-opens it (the delete confirmation puts its «Отмена» `ghost` and «Удалить» `danger` buttons right-aligned in a wrapping row, 8 px apart). It fades in with an 8 px rise (none under reduced motion) | `src/shared/ui/Dialog/Dialog.tsx` + `Dialog.module.css` |
| `TextField` | Labelled input with error text wired through `aria-invalid` / `aria-describedby`; `rounded-md`, `px-3 py-2`, accent border on focus; on error, `text-danger` error text and a `danger` border that stays while focused. Takes the input's own props, so it works uncontrolled (auth forms) and controlled (the author editor). `FIELD_INPUT_CLASS` exports the input look for inputs it can't render (the about textarea). `layout="stacked"` (default) puts the label above the input; `layout="columns"` makes label, input, and error items of the caller's two-column grid (label in the first column from 600 px, input `max-w-sm`) | `src/shared/ui/TextField/TextField.tsx` |
| `HomeGreeting` | The home page's welcome banner: a `section` with `bg-surface`, `border`, `rounded-2xl`, `p-6` (`p-8` from 640 px), 16 px gap; the h1 (`text-3xl`, `text-4xl` from 640 px, bold) over `max-w-prose` paragraphs (16 px, 18 px from 640 px, relaxed leading, line breaks kept) | `src/features/home/components/HomeGreeting/` (feature-local) |
| `PoemTitleList` | A `ul` of 18 px `foreground` poem title links, newest first, `text-accent` on hover, 12 px apart; the caller passes each poem's href. Used by the author page's poems section (`AuthorPoemsEntry`, the page's last block: h2 «Произведения», 24/32, weight 600, -0.01em tracking, 16 px above the list; no poems → the muted empty text instead) and by `/account/poems` | `src/features/poems/components/PoemTitleList/` (feature-local, exported to poem-management) |
| `PoemView` | One poem: a 16:9 illustration (`rounded-2xl`, `bg-surface` behind it, full column width), the h1, italic stanzas (16 px, 18 px from 640 px, line height 1.7, 24 px between stanzas, line breaks kept), then a 14 px `muted` footer with the date (`<time>`) and «Жанр: …» | `src/features/poems/components/PoemView/` (feature-local) |
| `AuthorPhoto` | Portrait box: 300 × 400 px from a 460 px viewport up, full column width at 3:4 below; `border-radius: 1rem`, `object-fit: cover`, surface background. No photo → `AuthorPhotoPlaceholder`, a 64 px `muted` stroke user icon, `aria-hidden`. `next/image` with `sizes`, quality `IMAGE_QUALITY`, `preload`; `unoptimized` only for a local Supabase host | `src/features/authors/components/AuthorPhoto/` + `AuthorPhoto.module.css` (feature-local) |
| `MarkdownEditor` | The Markdown textarea with its toolbar (`ghost` format buttons with Russian accessible names; the `formats` prop picks them: the profile's seven, or the poem's bold, italic, epigraph, separator, indent), «Редактор»/«Просмотр» as an ARIA tab list (14 px medium `muted`, selected `foreground` with a 2 px `accent` underline, arrow keys switch; the preview renders through `MarkdownText` with the editor's `variant`), and a counter «N / max» (14 px `muted`, tabular figures, `danger` over the limit) | `src/shared/ui/MarkdownEditor/` |
| `MarkdownText` | The safe Markdown renderer (no HTML, images as alt text, links as text). `variant="about"`: the profile's allowlist. `variant="poem"`: paragraphs with line breaks kept, a right-aligned italic-muted epigraph (`blockquote`, 14 px, max 28em, no border), a centred «* * *» separator (`hr`), upright `em` inside the italic text | `src/shared/ui/MarkdownText/` + `MarkdownText.module.css` |
| `ImagePicker` | File input with product-language text: the native input is `sr-only` (still focusable), a `surface` pill label (`rounded-full px-3 py-2 text-sm font-medium`, accent focus outline via `peer-focus-visible`) opens it, and the chosen file's name follows in 14 px `muted`. The button label is a prop (the profile photo, the poem illustration). Use it for any file input, since a native one shows the browser's language | `src/shared/ui/ImagePicker/` |
| `SessionUnavailableAlert` | The account pages' "can't check the session" state (the profile pages and the poem management pages): a full-width danger `Alert` «Сервис временно недоступен. Попробуйте позже.», then a `primary` «Повторить» `Button` below it (16 px gap) that refreshes the route and is disabled while pending | `src/shared/ui/SessionUnavailableAlert/` (+ `RetryButton.tsx`) |
| `HeaderAuthPlaceholder` | The header's empty session slot (`min-w-24`, `aria-hidden`): the Suspense fallback while the session loads, and the state when it can't be checked | `src/features/auth/components/HeaderAuthPlaceholder/` (feature-local) |
| `BreadcrumbsView` | The breadcrumb trail under the header: a `nav` named «Навигационная цепочка» around an `ol`, aligned with the header (`max-w-4xl px-6`, 16 px top padding), 14 px text; items wrap with 8 px between them and 4 px between lines. Parent items are `text-foreground` links, `text-accent` on hover; the current item is `text-accent` `font-medium` with `aria-current="page"` and breaks anywhere when long; each item after the first starts with an `aria-hidden` «›» in `muted`. Its loading state, `BreadcrumbsPlaceholder`, is an `aria-hidden` row of the same height | `src/features/breadcrumbs/components/BreadcrumbsView/` + `BreadcrumbsPlaceholder/` (feature-local) |
| `SaveNotice` | Always-mounted `role="status"` paragraph, 14 px `muted`; emptied while a save is pending and reads «Сохранено» after each success, never hidden on a timer | `src/features/authors/components/SaveNotice/` (feature-local) |

## 4. States

| State | Name in this project | What it looks like |
| --- | --- | --- |
| loading | `Loading` (`src/app/loading.tsx`, route level) | skeleton blocks (`bg-surface animate-pulse`, off under reduced motion) plus a screen-reader-only "Загрузка…" status. Inside components there is no shared pattern (the poem pages' Suspense skeleton, `PoemPageSkeleton`, shared by the public poem page and `/account/poems/<id>`, and the management pages' list and form skeletons repeat the route-level look, skeleton blocks plus a screen-reader-only "Загрузка…" status; the author page's skeleton is blocks only and silent for screen readers; the header's session part shows an empty `min-w-24` placeholder as its `<Suspense>` fallback, with neither "Войти" nor "Выйти") |
| error | `RootError` (`src/app/error.tsx`, route level) | heading "Что-то пошло не так", muted explanation, optional error digest in mono, and a "Повторить" `Button`. Inside components, a danger `Alert` (form-level and list errors) or an inline `text-danger` paragraph (field errors, the header's sign-out failure) |
| empty | no named component | muted text, e.g. "У автора пока ещё нет публикаций." in the author page's poems section (`AuthorPoemsEntry`) |
| offline | none | not handled |

Related route state: `NotFound` (`src/app/not-found.tsx`) shows the heading "Страница не найдена",
muted text, and an accent link back home.

## 5. Source

- Source: non-machine — skipped connecting a tool
- Commit: `23ff8f1`; the danger button, `--on-danger`, the neutral `Alert` tone, and `Dialog`'s `closable` refreshed from the code at `41b72db` (`delete-poem`)
