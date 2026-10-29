# UI Plan

Component and state names come from `docs/design-system.md` (recorded at commit `23ff8f1`; every
path it names still resolves at `13b5e15`). States use that document's names: `Loading`,
`RootError`, error (a danger `Alert` or an inline `text-danger` field error), empty. The normal,
loaded view has no state name there and is listed as "loaded". Values come from the approved
Claude Design canvas (2026-10-28,
https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#page-dcb81aee8d83), read by hand: `ui-plan` pulls
node values only from Figma/Pencil, so the source column names the artboard.

Moved components keep their design-system rows and get new homes (design D1): the about-editor
toolbar (`MarkdownToolbar`, `AboutViewTabs`, counter) → `shared/ui/MarkdownEditor`; `PhotoPicker`
→ `shared/ui/ImagePicker`; `AuthorAbout` → `shared/ui/MarkdownText`; `AuthorPoemList` →
`PoemTitleList`. `docs/design-system.md` is refreshed from the code in task 8.1 (never from the
link).

Shared page frame on every management screen (artboards 16-21): `main` `max-w-4xl px-6 py-16`,
32 px gap between blocks, items start-aligned; h1 36/40 bold, -0.025em (30/36 below 640 px).

| Screen | States | Components | Value source |
| --- | --- | --- | --- |
| `/account` — «Мастерская поэта», author section (FR-1) | loaded: no profile (`primary` «Создать кабинет автора»), not public (`primary` «Редактировать профиль автора»), public (one row, 8 px gap, wraps: `primary` edit, `ghost` «Открыть публичную страницу», `ghost` «Управление произведениями»); `Loading` (h2-width block 180×28 and a 232×36 pill, sr-only «Загрузка…»); error (`Alert` «Не удалось загрузить профиль…») | `ButtonLink`, `Alert`, `SessionUnavailableAlert` | Claude Design, artboard 16 |
| `/authors/<id>` — owner links and «Произведения» (FR-1, author-poems FR-1) | loaded: owner sees «Редактировать профиль» and «Управление произведениями» as accent text links in one wrapping row (4 px row gap, 16 px column gap) above the h1, 8 px from it; visitors see neither; empty (muted «У автора пока ещё нет публикаций.»); error (muted «Произведения сейчас недоступны.», no list, same section heading); `Loading` (unchanged page skeleton) | `AuthorOwnerLinkView` (now two links), `PoemTitleList` (h2 24/32 semibold, 16 px to the list, titles 18/28 `foreground`, 12 px apart, accent on hover) | Claude Design, artboard 12 |
| `/account/poems` — «Ваши Произведения» (FR-2, FR-11, FR-13) | loaded: `primary` «Добавить новое произведение», then the list (same look as the author page's, newest first); empty: heading and the button only; error: button kept, then `Alert` «Не удалось загрузить произведения…»; not public: muted paragraph, then `ghost` «Перейти к профилю автора» 16 px below (pulled left 12 px to align its text); session unavailable: `SessionUnavailableAlert`, header session slot empty; `Loading`: heading kept, a 252×36 pill block, three 24 px lines (168, 208, 144 px wide, 16 px apart), sr-only «Загрузка…» | `ButtonLink`, `PoemTitleList` (href → `/account/poems/<id>`), `Alert`, `SessionUnavailableAlert`; **new** `NotPublicNotice` (paragraph + ghost link, shared by the list and add pages) | Claude Design, artboard 17 |
| `/account/poems/new` — form (FR-3, FR-4, FR-5) | loaded: empty form; filled with an illustration; «Просмотр» tab; sending («Добавление…», the whole form disabled at 50%) | form: fields 24 px apart; each field a stack with 6 px gap: label 14/20 medium, control, error. `TextField` (title). `MarkdownEditor`: tabs row («Редактор»/«Просмотр», 14/20 medium `muted`, selected `foreground` with a 2 px `accent` underline, 1 px `border` under the row), 12 px gap, toolbar of `ghost` buttons «Жирный», «Курсив», «Эпиграф», «Разделитель частей», «Отступ» (4 px gap, pulled left 12 px), textarea `FIELD_INPUT_CLASS` min-height 320 px, line height 22 px, vertical resize; meta row: field error left, counter «N / 10000» right (14/20 `muted`, tabular figures; over the limit `danger` medium); «Просмотр» panel: 1 px `border`, `rounded-md`, 16 px padding, min-height 320 px, rendered with `MarkdownText variant="poem"`. Genre: native `select` with `FIELD_INPUT_CLASS`, `appearance: none`, 36 px right padding, a 16 px chevron icon in `muted` 12 px from the right (`aria-hidden`). `ImagePicker`: `surface` pill «Выбрать иллюстрацию», file name 14/20 `muted` (8 × 12 px gaps); chosen: preview full width in a 16:9 frame, cropped to fill it (`aspect-video object-cover`), `rounded-2xl` and a `ghost` «Убрать иллюстрацию». `Button` `primary` «Добавить произведение». | Claude Design, artboard 18 |
| `/account/poems/new` — field errors (FR-4, NFR-7) | error: every field at once — required (empty title, text, «—», illustration too large) and limits (81-character title kept in the input, «10012 / 10000» in `danger`, «Этот жанр больше недоступен. Выберите другой.», «Допустимы только изображения PNG или JPEG.») | the same components with `aria-invalid`, `danger` border, error text 14/20 medium `text-danger`, wired by `aria-describedby` (the textarea names both its error and the counter) | Claude Design, artboard 19 |
| `/account/poems/new` — messages and special states (FR-3, FR-5, FR-6, FR-11, FR-13) | error: danger `Alert` above the submit button, one per message (limit, session expired, unavailable, unknown), the bottom of a filled form shown; genres unavailable: heading + `Alert` «Список жанров сейчас недоступен…», no form; not public: `NotPublicNotice`; `Loading`: four field-shaped blocks (input, tall textarea, select, picker pill) and a button block, sr-only «Загрузка…» | `Alert`, `NotPublicNotice` | Claude Design, artboard 20 |
| `/account/poems/<poemId>` — after a create (FR-5, FR-7, FR-13) | success: `Alert` tone `success` (`role="status"`, `success` left border) «Поздравляем…» above the poem, with an illustration; loaded without an illustration (h1 first); without genre (date only); `Loading` (poem skeleton); `RootError`; 404 (no trail) | `Alert` (success), `PoemArticle` → `PoemView` | Claude Design, artboard 21 |
| `/authors/<id>/poems/<poemId>` — public poem page (author-poems FR-4, FR-5) | loaded: illustration full column width in a 16:9 frame, cropped to fill it (`aspect-video object-cover`, replacing today's `h-auto`), `rounded-2xl`, then h1, then the poem: stanzas 18 px (16 px below 640 px), line height 1.7, italic, 24 px apart, line breaks kept; epigraph right-aligned, `max-width: 28em`, 14 px / 1.6, `muted`; «* * *» centred, upright, `letter-spacing: .3em`; indent 2em per step; `em` inside the italic text upright; footer 14/20 `muted`, date and «Жанр: …», 4 × 16 px gaps; without illustration and genre: h1 first, date only; `Loading` (16:9 block, title block, three lines; the trail row stays empty at 20 px); 404 (no trail); `RootError` (trail «Главная › Наши авторы › Автор») | `PoemArticle` → `PoemView` with `MarkdownText variant="poem"` | Claude Design, artboard 14 |
| Breadcrumb trail on the three management pages (FR-8) | loaded: «Главная › Мастерская поэта › Управление произведениями», «… › Добавление нового произведения», «… › <title>» (last item `accent` medium, `aria-current`); none on 404 | `BreadcrumbsView` | Claude Design, artboards 17-21 |

## Criteria coverage

Every acceptance criterion with a visible outcome lands on a row: FR-1 (rows 1-2), FR-2 and FR-11
(row 3), FR-3 (rows 4, 6), FR-4 (rows 4-5), FR-5 (rows 4, 6, 7), FR-6 (row 6), FR-7 (row 7), FR-8
(row 9), FR-10 and author-poems FR-1/FR-4/FR-5 (rows 2, 8), FR-12 (rows 2-3, a fresh list), FR-13
(rows 3, 6-8), NFR-7 (rows 4-7: labels, error wiring, `role="status"` / `role="alert"`), NFR-8 (all
rows). No gap found. Criteria with no visible outcome (FR-9's data source, FR-14, NFR-1 to NFR-6,
NFR-9, NFR-10) have no screen row by design.

Mockup details not in the spec, taken as implementation guidance: the epigraph's `max-width:
28em`, upright `em` inside the poem, the separator's letter spacing, and the 2em indent step (design
D6 follows the mockup). The focus rules of NFR-7 are behaviour and are not drawn.
