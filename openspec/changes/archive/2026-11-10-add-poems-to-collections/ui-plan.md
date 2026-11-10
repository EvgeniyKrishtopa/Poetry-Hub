# UI Plan

Component and state names come from `docs/design-system.md` (recorded at commit `23ff8f1`,
refreshed at `ba2f323`; every path it names still resolves at `3fe0123`). States use that
document's names: `Loading`, `RootError`, error (a danger `Alert`), empty (muted text), offline
(`ConnectionNotice`, with its `slow` sibling), `NotFound`; the normal view has no state name there
and is listed as "loaded". Values come from the approved Claude Design canvas (2026-11-07,
https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#page-dcb81aee8d83), read by hand: `ui-plan` pulls
node values only from Figma/Pencil, so the source column names the artboard (Claude Design). The
artboards use only the existing tokens.

New components (one per screen at most; everything else composes existing primitives):

- collection page: `ManageCollectionPoemsButton` — a `ghost` `Button` that runs the check action
  and reports its error to `CollectionActions`, which shows it below the row.
- collection poems page: `CollectionPoemsForm` — the checkbox group (native checkboxes with tokens;
  no checkbox primitive exists and this is its only use), the save button, and its notices.
- leave dialog: `CollectionPoemsLeaveDialog` — three answers (save / leave / stay) over the shared
  `Dialog`; the edit page's dialog has one answer per form, so it isn't reused.
- `/account/poems`: none — `OwnCollectionsSection` gains a nested title list in its existing look.

Shared page frame: the management pages' — `main` `max-w-4xl px-6 py-16`, 32 px gap between
blocks, items start-aligned; h1 36/40 bold (30/36 below 640 px).

| Screen | States | Components | Value source |
| --- | --- | --- | --- |
| `/account/poems/collections/<id>` (changed) | loaded with poems (h2 «Произведения» and title links between the description and the row, FR-2); loaded without poems (no heading or list); the row «Редактировать сборник» `primary`, «Произведения сборника» `ghost`, «Удалить сборник» `danger`, wrapping, 8 px gap; manage button hidden when nothing to manage (FR-2); checking (manage button `aria-disabled`, FR-3); error: «Сборник уже удалён.», «Нет свободных произведений для добавления в сборник.», «Не удалось открыть произведения сборника. Попробуйте позже.» (danger `Alert` below the row, FR-3); offline / slow (`ConnectionNotice` above the row, manage and delete `aria-disabled`, FR-9); `NotFound`; `RootError` (collection or poems read fails); `Loading` (the existing skeleton plus list bars); session unknown (`SessionUnavailableAlert`) | `ButtonLink`, `Button` (`ghost`, `danger`), `Alert`, `ConnectionNotice`, `PoemTitleList`'s look repeated in `CollectionPoemList`, `ManageCollectionPoemsButton` (new) | Claude Design, artboard 34 (`CollectionWithPoems.dc.html`, `CollectionWithPoemsStates.dc.html`): h2 «Произведения» 24/32 weight 600, links 18 px 12 px apart; error Alert full width below the row |
| `/account/poems/collections/<id>/poems` (new) | loaded, unchanged (h1 «Произведения сборника», the hint naming the collection, the checkbox group with a visually hidden legend «Произведения», collection's poems checked and free ones unchecked, newest first; no save button, FR-4, FR-5); changed («Сохранить выбранное» `primary`, FR-5); sending («Сохранение…», every checkbox and the button disabled, FR-6); saved (success `Alert` «Произведения сборника сохранены.» above the list, the button disabled, «Вернуться к сборнику» `ButtonLink` `ghost` below it, FR-6); error: failure alert above the list (danger `Alert`: limit, not public, unavailable, unknown, stale, FR-7, FR-8); empty (muted «Нет свободных произведений для добавления в сборник.» with «Вернуться к сборнику», also below a stale alert, FR-4, FR-8); offline / slow (`ConnectionNotice` above the list, everything frozen, FR-9); `NotFound`; `RootError`; `Loading` (heading in the shell, list bars); session unknown (`SessionUnavailableAlert`) | `Button` (`primary`), `ButtonLink` (`ghost`), `Alert`, `ConnectionNotice`, `SessionUnavailableAlert`, `CollectionPoemsForm` (new) | Claude Design, artboard 35 (`CollectionPoems.dc.html`, `CollectionPoemsErrors.dc.html`, `CollectionPoemsStates.dc.html`): hint 16/24 `muted`; native 18 px checkboxes with `accent-color`, label 18/28 12 px to the right, rows 12 px apart, keyboard focus as a 2 px accent outline; disabled group at 50 % |
| Leave dialog (over the poems page) | link form (title «Есть несохранённые изменения», «Сохранить выбранные произведения перед уходом?», «Сохранить изменения» `primary` focused, «Уйти без сохранения» `danger`, «Остаться» `ghost`, right-aligned wrapping row, stacked full width below 600 px, FR-10); sign-out form («Сохранить выбранные произведения перед выходом?», «Выйти без сохранения» in place of «Уйти без сохранения»); sending / waiting («Сохранение…», every button disabled, `closable={false}`); offline / slow (`ConnectionNotice` above the buttons inside the dialog, «Сохранить изменения» disabled, focus on «Остаться») | `Dialog`, `Button` (`primary`, `danger`, `ghost`), `ConnectionNotice`, `CollectionPoemsLeaveDialog` (new) | Claude Design, artboard 36 (`CollectionPoemsLeave.dc.html`): buttons in the order save (focused) → leave → stay |
| `/account/poems` (changed) | loaded: under each collection title in «Сборники произведений», a nested list of its poem title links, newest first; a collection with no poems shows its title only (FR-11); error: the existing section alert when either read fails; every other state unchanged | `OwnCollectionsSection` (changed), `Alert` | Claude Design, artboard 37 (`CollectionPoemsList.dc.html`): nested list 16 px indent, 1 px `border` left rule, 16/24 text, 8 px apart, 8 px below the title |
| Breadcrumb trail (poems page) | «… › Управление произведениями › <title> (link) › Произведения сборника»; none for a collection that isn't the author's (FR-14) | `BreadcrumbsView`, `BreadcrumbsPlaceholder` (existing) | Claude Design, artboard 35 (trail row) |

Criteria coverage: every acceptance criterion with a visible outcome — FR-2 to FR-12 and FR-14,
FR-13 (the `/login` redirect is the existing sign-in page), and NFR-4's focus targets — lands on a
row above. FR-1 shows through the poems page and the collection page rows (freed and new poems
listed unchecked; public pages unchanged and out of this plan); FR-12 shows on the loaded states
after Back/Forward. The remaining NFRs (1–3, 5–8) have no screen of their own. No gap found.
