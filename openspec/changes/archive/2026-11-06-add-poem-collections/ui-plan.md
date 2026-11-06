# UI Plan

Component and state names come from `docs/design-system.md` (recorded at commit `23ff8f1`,
refreshed at `ba2f323`; every path it names still resolves at `a727859`). States use that
document's names: `Loading`, `RootError`, error (a danger `Alert`), offline (`ConnectionNotice`,
with its `slow` sibling), `NotFound`; the normal view has no state name there and is listed as
"loaded". Values come from the approved Claude Design canvas (2026-11-04,
https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#page-dcb81aee8d83), read by hand: `ui-plan` pulls
node values only from Figma/Pencil, so the source column names the artboard (Claude Design). The
artboards use only the existing tokens.

New components (one per screen at most; the rest of the feature's components only compose
existing primitives — a `ButtonLink`, an `Alert`, the shared `Dialog`):

- `/account/poems`: `OwnCollectionsSection` — the section «Сборники произведений» (h2 + title
  links); `PoemTitleList` is `poems`' and typed for poems, so the feature repeats its look.
- create page: `TextAreaField` (`shared/ui`) — `TextField`'s label and error wiring over a
  `<textarea>`; nothing renders a labelled plain textarea today.
- collection page: `DeleteCollectionButton` — the opener and its confirmation `Dialog`, repeating
  `DeletePoemButton`'s shape with the connection rule added.
- edit page: `CollectionLeaveDialog` — the feature's copy of the unsaved-changes dialog (design
  D12: repeated, not shared).

Shared page frame: the management pages' — `main` `max-w-4xl px-6 py-16`, 32 px gap between
blocks, items start-aligned; h1 36/40 bold (30/36 below 640 px).

| Screen | States | Components | Value source |
| --- | --- | --- | --- |
| `/account/poems` (changed) | loaded with collections (FR-2: h2 «Сборники произведений», title links, newest first, between the button row and the poem list); loaded without collections (no section, FR-2, FR-13); error: section read failure (danger `Alert`, no heading, FR-2); the button row «Добавить новое произведение» (`primary`) + «Создать сборник произведений» (`ghost`) wrapping, 8 px gap (FR-1); one-time notices «Сборник «…» создан.» / «Сборник «…» удалён.» (success `Alert`) and «Сборник уже удалён.» (neutral `Alert`) above the Suspense (FR-4, FR-11, FR-13); not-public (unchanged notice, no collection controls); `Loading` (the existing list skeleton) | `ButtonLink`, `Alert`, `OwnCollectionsSection` (new), existing `MyPoemsPage` / `MyPoemsContent`, `NotPublicNotice`, `SessionUnavailableAlert` | Claude Design, artboard 30 (`CollectionsList.dc.html`): notices between the heading and the button row |
| `/account/poems/collections/new` | loaded (h1 «Создание сборника», «Название сборника», «Описание (необязательно)», «Создать сборник», FR-3); field errors (inline `text-danger`, FR-3); sending («Создание…», fieldset disabled and dimmed); error: failure alert above the button (danger `Alert`: not public, limit, unavailable, unknown; FR-4, FR-5); offline / slow (`ConnectionNotice` above the form, submit disabled, FR-14); not-public page notice with «Перейти к профилю автора» (FR-3); `Loading` (form skeleton: heading, two field bars, a button bar); `RootError` (profile read failure); session unknown (`SessionUnavailableAlert`) | `TextField`, `TextAreaField` (new), `Button` (`primary`), `Alert`, `ConnectionNotice`, `SessionUnavailableAlert` | Claude Design, artboard 31 (`CollectionNew.dc.html`, `CollectionNewStates.dc.html`): failure alert above the button; the not-public link `ghost` |
| `/account/poems/collections/<id>` | loaded (h1 title, description paragraphs with line breaks kept — `HomeGreeting`'s paragraph look, FR-6; «Редактировать сборник» `ButtonLink` `primary` then «Удалить сборник» `danger`, one wrapping row, 8 px gap); loaded without a description (no paragraph); one-time «Изменения сохранены.» (success `Alert`, FR-9); offline / slow (`ConnectionNotice` above the buttons, «Удалить сборник» `aria-disabled` at 50% opacity, FR-14); `NotFound` (FR-6); `RootError` (FR-6); `Loading` (heading bar, two text bars, two button bars); session unknown (`SessionUnavailableAlert`) | `ButtonLink`, `Button` (`danger`), `Alert`, `ConnectionNotice`, `DeleteCollectionButton` (new) | Claude Design, artboard 32 (`Collection.dc.html`): saved notice above the heading |
| Delete dialog (over the collection page) | open (title «Удалить сборник?», body «Сборник «…» будет удалён без возможности восстановления.», «Отмена» `ghost` focused, «Удалить» `danger`, right-aligned wrapping row, FR-13); sending («Удаление…», both disabled, `closable={false}`); error (danger `Alert` «Не удалось удалить сборник. Попробуйте позже.» inside, FR-13); offline / slow (`ConnectionNotice` above the buttons inside the dialog, «Удалить» disabled, FR-14) | `Dialog`, `Button` (`ghost`, `danger`), `Alert`, `ConnectionNotice` | Claude Design, artboard 32 (`CollectionDelete.dc.html`): × disabled while sending; failure and offline notices above the buttons |
| `/account/poems/collections/<id>/edit` | unchanged (h1 «Редактирование сборника», filled fields, «Вернуться к сборнику» `ButtonLink` `ghost`, FR-7, FR-8); changed («Сохранить изменения» `primary` + «Отменить изменения» `ghost`, FR-8); sending («Сохранение…», fieldset disabled and dimmed, discard disabled, FR-9); field errors; error: failure alert above the form (danger `Alert`: limit, not public, unavailable, unknown; FR-10, FR-11); offline / slow (`ConnectionNotice` above the form, save disabled, FR-14); `NotFound`; `RootError`; `Loading` (the create form's skeleton); session unknown | `TextField`, `TextAreaField`, `Button`, `ButtonLink`, `Alert`, `ConnectionNotice`, `SessionUnavailableAlert` | Claude Design, artboard 33 (`CollectionEdit.dc.html`, `CollectionEditErrors.dc.html`, `CollectionEditStates.dc.html`): failure alert under the heading, above the form |
| Unsaved-changes dialog (over the edit page) | link form (title «Есть несохранённые изменения», «Сначала сохраните изменения.», «Продолжить редактирование» `primary`, FR-12); sign-out form («Если выйти сейчас, изменения пропадут.», «Выйти без сохранения» `danger` before «Продолжить редактирование» `primary`, stacked full width below 600 px, FR-12) — the poem edit page's dialog, repeated | `Dialog`, `Button`, `CollectionLeaveDialog` (new copy) | Claude Design, artboard 27 (`LeaveDialog.dc.html`), reused as is |
| Breadcrumb trails (three pages) | create page: «… › Управление произведениями › Создание сборника»; collection page: «… › <title>»; edit page: «… › <title> (link) › Редактирование»; none for a collection that isn't the author's (FR-17) | `BreadcrumbsView`, `BreadcrumbsPlaceholder` (existing) | Claude Design, artboards 31–33 (trail rows) |

Criteria coverage: every acceptance criterion with a visible outcome — FR-1 to FR-14, FR-16
(the `/login` redirect is the existing sign-in page), FR-17, and NFR-4's focus targets — lands on
a row above. FR-15 (freshness after Back/Forward) shows on the `/account/poems` and collection page
rows' loaded states; the remaining NFRs (1–3, 5–8) have no screen of their own. No gap found.
