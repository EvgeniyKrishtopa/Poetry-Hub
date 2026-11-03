# UI Plan

Component and state names come from `docs/design-system.md` (recorded at commit `23ff8f1`; every
path it names still resolves at `b0d0bdc`). States use that document's names: `Loading`,
`RootError`, error (a danger `Alert`), `NotFound`; the normal view has no state name there and is
listed as "loaded". Values come from the approved Claude Design canvas (2026-10-29,
https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#page-dcb81aee8d83), read by hand: `ui-plan` pulls
node values only from Figma/Pencil, so the source column names the artboard (Claude Design).

New components (one per screen at most): `DeletePoemButton` (owner's poem page: the opener and its
confirmation `Dialog`; no existing component confirms an action), `DeletedPoemNotice`
(`/account/poems`: the one-time success `Alert`, like `CreatedPoemNotice`), `SessionExpiredNotice`
(`/login`: the one-time neutral `Alert`). Changed primitives (design D7): `Button` gains `danger`,
`Alert` gains `neutral`, `Dialog` gains `closable`; `globals.css` gains `--on-danger`.
`docs/design-system.md` is refreshed from the code in task 5.1 (never from the link).

Shared page frame: `main` `max-w-4xl px-6 py-16`, 32 px gap between blocks, items start-aligned;
h1 36/40 bold, -0.025em (30/36 below 640 px). Tokens per theme as in `globals.css`, plus
`--on-danger` `#ffffff` (light) / `#0a0a0a` (dark).

| Screen | States | Components | Value source |
| --- | --- | --- | --- |
| `/account/poems/<id>` — owner's poem page | loaded (the poem `article` as today, then the opener directly below it in the 32 px flow); `Loading` (`PoemPageSkeleton`, no button); `NotFound` (no button); `RootError` (read failed) | `PoemArticle`, `DeletePoemButton` → `Button` `danger` (pill, `px-3 py-2`, 14/20 medium, solid `danger` fill, `on-danger` text, hover 15% black mix, `aria-haspopup="dialog"`) | artboard 22 (Claude Design) |
| Delete dialog (over the owner's poem page) | loaded (title 20/28 semibold «Удалить произведение?», body 14/20 ««Первый снег» будет удалено без возможности восстановления.», «Отмена» focused); sending («Удаление…», «Отмена», «Удалить» and × disabled at 50%, `aria-busy`); error (danger `Alert` «Не удалось удалить произведение. Попробуйте позже.» between the body and the buttons, dialog open) | `Dialog` (`closable`; `max-w-lg`, `rounded-2xl`, `p-5` / `p-6` from 600 px, 16 px gap, 36 px corner ×), `Alert` `danger`, actions row right-aligned, wrapping, 8 px gap: `Button` `ghost` «Отмена», `Button` `danger` «Удалить» | artboard 22 (Claude Design) |
| `/account/poems` — after a delete | loaded with the notice (success `Alert` «Произведение «Первый снег» удалено.» between the h1 and «Добавить новое произведение», list without the poem); variant «Произведение уже удалено.»; `Loading` (notice above the add-link and list skeletons, «Загрузка…» for screen readers); error (notice, add link, then the list's danger `Alert` «Не удалось загрузить произведения. Попробуйте позже.») | `DeletedPoemNotice` → `Alert` `success` (`role="status"`, full width), existing `ButtonLink` `primary`, `PoemTitleList`, `MyPoemsSkeleton` | artboard 23 (Claude Design) |
| `/login` — after an expired session | loaded with the notice (neutral `Alert` «Сессия истекла. Войдите снова.» between the h1 «Вход» and the form, in the 24rem column, header shows «Войти»); loaded without it on a plain visit | `SessionExpiredNotice` → `Alert` `neutral` (`muted` left border, `role="status"`), existing `SignInForm` | artboard 24 (Claude Design) |

Criteria with a human-visible outcome, by screen: FR-1 (owner's poem page); FR-2, FR-3 sending,
FR-5, NFR-4 dialog semantics and focus (delete dialog); FR-3 success and once, FR-4
(`/account/poems`); FR-6, including the signed-out header after the redirect (`/login`); FR-8 and
the public pages after a delete use the existing `NotFound` and author page list, with no new UI.
FR-7, FR-9, and NFR-1 have no visible surface of their own. No gap.
