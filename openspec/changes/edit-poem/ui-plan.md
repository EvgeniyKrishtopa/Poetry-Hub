# UI Plan

Component and state names come from `docs/design-system.md` (recorded at commit `23ff8f1`, refreshed
at `41b72db`; every path it names still resolves at `064d0bb`). States use that document's names:
`Loading`, `RootError`, error (a danger `Alert`), `NotFound`, and `offline` (listed there as "not
handled"; this change adds it, with a sibling "slow" condition); the normal view has no state name
there and is listed as "loaded". Values come from the approved Claude Design canvas (2026-11-03,
https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#play-f2a0b40a5e8c), read by hand: `ui-plan` pulls
node values only from Figma/Pencil, so the source column names the artboard (Claude Design).
Shared tokens are the existing ones; the mockups add none.

New components (one per screen at most): `EditPoemForm` (edit page: the shared form parts plus the
save/discard/back controls; no existing form edits stored values), `ConnectionNotice` (shared: the
offline or slow `Alert`, used by three forms; no existing component reads the connection),
`LeaveBlockedDialog` (over the edit page: the "save first" `Dialog`; for a link it only informs,
for «Выйти» it also offers «Выйти без сохранения», PR #168 review 2026-11-03). `EditPoemButton` is a `ButtonLink` usage, not a new primitive.
Changed components: `IllustrationField` (stored preview and labels, design D6), `CreatedPoemNotice`
(also the saved text, D7), `FieldEditActions` and `FieldActions` (disabled while offline or slow,
D8), `SignOutButton` (signs out through `signOutWithConfirmation`, D10; no visual change).

Shared page frame: `main` `max-w-4xl px-6 py-16`, 32 px gap between blocks, items start-aligned;
h1 36/40 bold, -0.025em (30/36 below 640 px).

| Screen | States | Components | Value source |
| --- | --- | --- | --- |
| `/account/poems/<id>` — owner's poem page | loaded (the poem `article`, then one wrapping row, 8 px gap: `ButtonLink` `primary` «Редактировать произведение», then `Button` `danger` «Удалить произведение»); loaded after a save (success `Alert` «Изменения сохранены.» above the article, full width, once); `Loading` (`PoemPageSkeleton`, no buttons); `NotFound` (no buttons); `RootError` | `PoemArticle`, `CreatedPoemNotice` → `Alert` `success`, `EditPoemButton` → `ButtonLink` `primary`, existing `DeletePoemButton` | artboard 25 (Claude Design) |
| `/account/poems/<id>/edit` — edit page, a-c | a unchanged (h1 «Редактирование произведения»; fields 24 px apart as in the add form; the stored illustration 16:9 `rounded-2xl` preview, then one picker row, 8 px / 12 px gap: `surface` pill «Заменить иллюстрацию» and `ghost` «Удалить иллюстрацию»; at the bottom only `ButtonLink` `ghost` «Вернуться на страницу произведения»); b changed (bottom row, 8 px gap: `primary` «Сохранить изменения», `ghost` «Отменить изменения»; no back link); c illustration removed (no preview, pill «Выбрать иллюстрацию», bottom row as in b) | `EditPoemForm` → `PoemFormFields` (`TextField`, `MarkdownEditor`, `GenreSelect`, `IllustrationField` → `ImagePicker`), `Button` `primary` / `ghost`, `ButtonLink` `ghost` | artboard 26 a–c (Claude Design) |
| `/account/poems/<id>/edit` — d-f | d sending («Сохранение…», the whole fieldset with its buttons at 50%, disabled); e failure (danger `Alert` between the h1 and the form, full width; one of «Сохранение сейчас недоступно. Попробуйте позже.», «Слишком много сохранений. Попробуйте через минуту.», «Чтобы сохранять изменения, укажите имя и фамилию в профиле автора.», «Что-то пошло не так. Попробуйте ещё раз.»; fields keep the changes); f field error («Обязательное поле.» under the title, `danger` border, as in the add form) | `Alert` `danger`, `TextField` error | artboard 26 d–f (Claude Design) |
| `/account/poems/<id>/edit` — g-j | g `offline` (neutral `Alert` between the h1 and the form «Нет подключения к интернету. Сохранение станет доступно, когда связь восстановится.»; «Сохранить изменения» disabled, fields and «Отменить изменения» active); h slow (same box, «Медленное подключение к интернету. Сохранение станет доступно, когда связь улучшится.»); i `Loading` (h1, then the add page's form skeleton); j genres error (h1 and danger `Alert` «Список жанров сейчас недоступен. Попробуйте позже.», no form); also `NotFound`, `RootError`, session unknown (`SessionUnavailableAlert`) | `ConnectionNotice` → `Alert` `neutral`, `PoemFormSkeleton`, `Alert` `danger`, `SessionUnavailableAlert` | artboard 26 g–j (Claude Design) |
| Leave dialog (over the edit page) | loaded (backdrop over the edit page; `Dialog` `max-w-lg`, `rounded-2xl`, `p-6` / `p-5` below 600 px, 16 px gap; title 20/28 semibold «Есть несохранённые изменения»; body 14/20 «Сначала сохраните изменения.»; one `primary` «Продолжить редактирование» right-aligned, focused; corner × «Закрыть»); sign-out form (same box and title; body «Если выйти сейчас, изменения пропадут.»; `danger` «Выйти без сохранения» and `primary` «Продолжить редактирование», focused; corner ×) | `LeaveBlockedDialog` → `Dialog`, `Button` `primary` / `danger` | artboard 27 (Claude Design); sign-out form: **awaiting a Claude Design update** (PR #168 review, 2026-11-03) |
| `/account/poems/new` — add form | as today, plus `offline` and slow (neutral `Alert` between the h1 and the form, the two texts; «Добавить произведение» disabled; fields active) | `NewPoemForm` → `PoemFormFields`, `ConnectionNotice` | artboard 28 (Claude Design) |
| `/account/author` — profile editor | as today, plus `offline` and slow in view mode (neutral `Alert` above the fields; every «Удалить» disabled, «Изменить» active) and with «Имя» in edit mode («Сохранить» disabled, «Отмена» active, other fields locked as usual) | `AuthorProfileEditor`, `ConnectionNotice`, `FieldEditActions`, `FieldActions` | artboard 29 (Claude Design) |
| `/account/poems` — after a save on a deleted poem | loaded with the existing notice «Произведение уже удалено.» (delete-poem's screen, unchanged) | existing `DeletedPoemNotice` | delete-poem artboard 23 (Claude Design) |
| `/login` — after an expired session | the existing session-expired notice (delete-poem's screen, unchanged) | existing `SessionExpiredNotice` | delete-poem artboard 24 (Claude Design) |
| Breadcrumbs on the edit page | loaded («Главная» › «Мастерская поэта» › «Управление произведениями» › title link › «Редактирование» current); none for a 404 | `BreadcrumbsView` | artboards 26–27 (Claude Design) |

Criteria with a human-visible outcome, by screen: FR-1, FR-6 notice and once, FR-14 own pages
(owner's poem page); FR-2, FR-3, FR-4, FR-5, FR-6 sending, FR-7 message, FR-8, FR-10 not-public
hint, FR-11 edit form, FR-12, NFR-4, NFR-7 (edit page); FR-13 links, sign-out, sending (leave
dialog); FR-11 add form (add form); FR-11 profile (profile editor); FR-10 deleted (after a save on a
deleted poem); FR-9 (`/login`); FR-15 (breadcrumbs). FR-14 public pages show existing screens
(`PoemView`, `PoemTitleList`) with new content, no new state. FR-13's browser leave confirmation is
the browser's own dialog, not a screen of ours. No criterion with a visible outcome is left without
a row.

Layout changes against today's add form, from the mockups: on the edit page the illustration preview
comes before the picker row, and «Удалить иллюстрацию» sits in that row beside the picker (the add
form keeps its order and «Убрать иллюстрацию» below the preview); the failure alert sits between
the h1 and the form. Mockup vs spec: artboard 26 gives the stored preview the alt «Текущая
иллюстрация»; the spec's empty `alt` (NFR-4) wins.
