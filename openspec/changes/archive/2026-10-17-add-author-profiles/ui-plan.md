# UI Plan: add-author-profiles

- **Sources.** State names and existing components come from `docs/design-system.md` (recorded commit `23ff8f1`). Every name resolves to its listed path at `0074803`.
- **Value source.** "Claude Design": the approved canvas linked in `proposal.md` § Mockups (FR-20 frames added 2026-10-16) (one artboard per screen, light and dark, desktop 1024 px and mobile 390 px). The values below were read from the artboards by hand, because `ui-plan` only pulls values from Figma/Pencil MCP. The canvas uses exactly the `globals.css` tokens (`background`, `foreground`, `muted`, `surface`, `border`, `accent`, `accent-foreground`, `danger`, `success`) in both themes, so every colour maps to a token (NFR-4).
- **Copy and styling.** All copy is the Russian text from the proposal's UI copy table. Styling uses tokens and Tailwind utilities only (NFR-4).
- **Language.** Every feature root sets `lang="ru"`.

## Shared values (from the mockups)

| Element | Value | Tailwind / existing |
| --- | --- | --- |
| Content column | max width 896 px, padding 64 px vertical, 24 px horizontal, 32 px gap between blocks | `mx-auto max-w-4xl px-6 py-16 flex flex-col gap-8` (the header's column) |
| Page heading | 36/40 px, bold, tracking −0.025em | `text-4xl font-bold tracking-tight` |
| Section heading | 20/28 px, semibold | `text-xl font-semibold` |
| Buttons | `Button` primitive: pill radius, 8 × 12 px padding, 14/20 px medium; disabled at 50 % opacity | `Button` `primary` / `ghost` |
| Text link | accent, no underline, underline on hover | accent link (the `NotFound` pattern) |
| Danger alert | `surface` background, 4 px `danger` left border, 6 px radius, 14/20 px medium | `Alert` (danger) |
| Skeleton | `surface` block, 4 px radius, pulse; static under reduced motion | `Loading` style (`bg-surface animate-pulse motion-reduce:animate-none`) |
| Photo / placeholder | 300 × 400 px, 16 px radius, `object-cover`; placeholder on `surface` with a 64 px stroke user icon in `muted`; below 460 px wide: full column width at `aspect-[3/4]` | `rounded-2xl` (the `PoemCard` radius) |
| Rendered Markdown | body 16 px / 1.7; h2 24/32 semibold (24 px above, 8 below); h3 20/28 semibold; p and lists 12 px below; lists indented 24 px; blockquote 2 px `border` left rule, 16 px indent, italic; first/last child no outer margin; centred and right-aligned lists use `list-inside` with no indent | — |

## Screens

| Screen | States (design-system names) | Components | Value source |
| --- | --- | --- | --- |
| Header (all pages): «Наши авторы» + session part | **loading**: the existing session placeholder (min width 6rem, 36 px tall) with «Наши авторы» already visible; signed out: «Наши авторы» + "Sign in"; signed in: «Наши авторы», «Мастерская поэта», "Sign out". «Наши авторы» sits on the right, directly before the session part. Nav links: 14/20 px medium, `foreground`, `accent` on hover, no underline, 16 px apart. Below 600 px wide: the wordmark takes row one; links and the session part share a right-aligned row two ; **unavailable** (session can't be checked, FR-20): the same empty placeholder as loading, with «Наши авторы» visible and no "Sign in", «Мастерская поэта», or "Sign out" | Existing: `HeaderAuthLinks` / `AuthStatus` (auth), `Next Link`. New: **`HeaderAuthPlaceholder`** (the empty slot, shared by loading and unavailable; FR-20) | Claude Design (artboard 1) |
| `/account`: Мастерская поэта | **loading**: h1 + two skeleton blocks (180 × 28, and a 232 × 36 pill); **empty**: no profile → section h2 «Профиль автора» + `Button` `primary` link «Создать кабинет автора»; filled, not public → `primary` «Редактировать профиль автора»; filled, public → that plus `ghost` «Открыть публичную страницу», side by side, 8 px gap, wrapping; **error**: the h2 then danger `Alert` «Не удалось загрузить профиль. Попробуйте позже.» (FR-18); signed out → redirect to `/login`; **unavailable** (FR-20): the h2 «Профиль автора», then a full-width danger `Alert` «Сервис временно недоступен. Попробуйте позже.», then a `primary` `Button` «Повторить» below it (16 px stack gap), no links; pending: the same with the button disabled (50 % opacity) and the section `aria-busy` | Existing: `Button` (rendered as a link), `Alert` (danger). New: **`AccountAuthorLinks`**, the three-state link block (FR-1); **`SessionUnavailableAlert`**, the outage alert with its «Повторить» retry button (FR-20, shared with the editor) | Claude Design (artboard 2) |
| `/account/author`: Профиль автора (editor) | **loading**: h1 + four skeleton field rows. **error**: load failure → danger `Alert` in place of the editor (FR-18). **unavailable** (FR-20): in place of the editor, a full-width danger `Alert` «Сервис временно недоступен. Попробуйте позже.» and a `primary` «Повторить» below it (16 px gap), 32 px under the h1; pending: the button disabled. Header block (8 px gap): h1, then «Открыть публичную страницу» text link when public, then «Сохранено» (`role="status"`, 14 px `muted`). Fields: rows separated by a 1 px `border` top rule, 24 px vertical padding; a 10rem label column + value column, 24 px apart; below 600 px the label stacks above. Per field: <ul><li>**empty**: a `ghost` add prompt (photo: the placeholder above it);</li><li>view: value (16/24 px; about as rendered Markdown; photo 300 × 400) + `ghost` «Изменить» / «Удалить»;</li><li>editing: input only (max width 24rem, 6 px radius, `border`, `accent` border on focus) + `primary` «Сохранить» and `ghost` «Отмена»;</li><li>photo editing: a file input (its button a `surface` pill) and, once a file is chosen, its 300 × 400 cover preview;</li><li>about editing: «Редактор» / «Просмотр» tabs (14 px medium, `muted`; selected `foreground` with a 2 px `accent` underline) over a 1 px `border` rule; in «Редактор», the seven `ghost` toolbar buttons and the three alignment buttons (`ghost`, pressed = `surface` fill, `aria-pressed`) on one wrapping row, then the textarea (min height 256 px, vertical resize), then the counter «N / 1000» right-aligned (14 px `muted`, tabular figures; over 1000 → `danger`, medium); in «Просмотр», the alignment buttons, then the rendered preview in a 1 px `border` 6 px-radius box (16 px padding, min height 256 px);</li><li>pending save: submitted value + a disabled `primary` «Сохранение…»;</li><li>pending delete: the empty state + a disabled `ghost` «Удаление…»;</li><li>disabled: another field is being edited or saved;</li><li>field **error**: 14 px medium `danger` text under the input (about: left of the counter), danger input border, wired with `aria-describedby` / `aria-invalid`.</li></ul> | Existing: `Button` (`primary`, `ghost`), `Alert` (danger). Name inputs use `TextField`, promoted from auth's `AuthField` in task 7.1. The about textarea copies its classes. New: **`AuthorProfileEditor`**, the editor with its field editors, Markdown toolbar, «Редактор»/«Просмотр» toggle, counter, and `SaveNotice` (FR-6, FR-7, FR-10, FR-11) | Claude Design (artboard 3) |
| `/authors`: Наши авторы | **loading**: h1 + five skeleton lines (24 px tall, 128–184 px wide, 16 px apart); **empty**: `muted` text «Пока нет авторов.»; **error**: danger `Alert` «Список авторов сейчас недоступен.»; filled: an unstyled list, 12 px apart, of links "Имя Фамилия" at 18/28 px in `foreground`, `accent` on hover, no underline | Existing: `Alert` (danger), muted empty text. New: **`AuthorList`** (FR-13) | Claude Design (artboard 4) |
| `/authors/[id]`: author page | **loading**: a heading skeleton (320 × 40), the photo-box skeleton, three text-line skeletons; filled: a header block (8 px gap) with «Редактировать профиль» text link (owner only) above the h1 full name, then `AuthorPhoto` or the placeholder, then about rendered with its alignment, full column width; no about → the section is omitted; not found → `NotFound` (soft 404); **error**: unavailable → `RootError` | Existing: `NotFound`, `RootError`, the accent link. New: **`AuthorProfileView`**, the profile layout composing `AuthorPhoto` and `AuthorAbout` (FR-14, FR-15, FR-16, NFR-1) | Claude Design (artboard 5) |

## Where the mockups differ from the spec

The spec wins in each case; Gate 3 checks the spec's version.

| Mockup | Build instead | Why |
| --- | --- | --- |
| Public page photo `alt` is the full name only | `alt="Фото: <имя фамилия>"` | NFR-5, copy table |
| Public page placeholder is `role="img" aria-label="Нет фото"` | `aria-hidden`, no label | NFR-5; «Нет фото» is not in the copy table (NFR-8) |
| A save-failure input (server error) has no `aria-invalid` | `aria-invalid` on every field error | NFR-5 |
| "Sign in" drawn as a `ghost` button | Keep the existing accent text link | Auth screens are out of scope; the artboard's own note says the existing "Sign in" stays |

## Cross-check: criteria with a human-visible outcome

| Requirement | Lands on |
| --- | --- |
| FR-1 | `/account` |
| FR-2 | `/account/author`, plus the signed-out redirect on `/account` |
| FR-3 | Header |
| FR-4 | `/authors` and `/authors/[id]` (listed / 404), plus the editor's «Открыть публичную страницу» |
| FR-6, FR-7, FR-8 (field errors and browser pre-check), FR-9, FR-10, FR-11, FR-12, FR-21 | `/account/author` |
| FR-13 | `/authors` |
| FR-14, FR-15, FR-16 | `/authors/[id]` |
| FR-17 | `/authors` and `/authors/[id]` after an edit |
| FR-18 | `/account`, `/account/author`, and `/authors/[id]` (no owner link) |
| NFR-1 | `/authors/[id]` and the editor preview |
| NFR-5 | `/account/author` (labels, error wiring, toolbar names, status) and `/authors/[id]` (alt text, hidden placeholder) |
| NFR-8 | Every row |

No gap: every human-visible criterion lands on at least one screen.

FR-21 (added 2026-10-17) adds no screen or state: its over-limit messages render in the existing field **error** state of the editor (artboard 3), the same as FR-9's failures, so no new mockup is needed.

## Note for implementation (reuse)

`AuthField` is promoted to `shared/ui/TextField` in task 7.1 (user decision 2026-10-15). The editor's name inputs use it, and the auth forms switch to it, so the input pattern exists once.
