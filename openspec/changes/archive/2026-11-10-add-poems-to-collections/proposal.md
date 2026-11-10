# Proposal

## Why

Authors can create, edit, and delete collections, but a collection holds no poems yet: it is a
title and a description only. This change lets an author fill a collection with their own poems
and take poems out again, so a collection becomes the group it was meant to be (user request,
2026-11-07; the follow-up add-poem-collections named as out of scope).

A poem belongs to at most one collection. Which collection it belongs to is stored on the poem
itself (user request: "в сущности произведения должна быть добавлена Id принадлежность к
сборнику"), and every list of "free" poems is derived from it.

## What Changes

- **A poem belongs to at most one collection.** A poem with no collection is *free*. Every stored
  poem is published (there are no drafts), so "the author's published poems" means all their
  poems. Deleting a collection frees its poems; deleting a poem takes it out of its collection.
  Which collection a poem belongs to is private to the poem's author: public pages, other readers,
  and guests never see it.
- **Collection page** `/account/poems/collections/<collectionId>`:
  - below the description, the level-2 heading «Произведения» and the collection's poems, newest
    first, each its title as a link to `/account/poems/<poemId>`; with no poems, neither the
    heading nor the list is rendered;
  - the button «Произведения сборника» in the button row, after «Редактировать сборник» and before
    «Удалить сборник», shown while there is something to manage: the collection holds poems, or
    the author has free poems (user decision, 2026-11-07: otherwise an author whose poems are all
    in collections could never take one out);
  - pressing it checks first and then opens `/account/poems/collections/<collectionId>/poems`; when
    the collection was deleted in another tab, or nothing is left to manage, it shows the error
    under the button row instead and stays on the page;
  - it is disabled, with the existing offline or slow notice, while the connection is bad.
- **Collection poems page** `/account/poems/collections/<collectionId>/poems`:
  - the level-1 heading «Произведения сборника», a one-line hint naming the collection, and one
    list of checkboxes: the collection's own poems (checked) and the author's free poems
    (unchecked), newest first, each labelled by the poem's title. Poems in other collections are
    not listed;
  - checking a free poem adds it, unchecking one of the collection's poems removes it. While the
    selection differs from what is stored, the button «Сохранить выбранное» is shown; checking a box
    back to where it was counts as no change;
  - saving stores every added and removed poem at once, or none of them. While sending: «Сохранение…»,
    every checkbox and the button disabled. On success the author stays on the page: the button
    stays visible but disabled, «Произведения сборника сохранены.» is shown, and the link
    «Вернуться к сборнику» appears; the next checkbox change hides the notice and the link and
    enables the button again;
  - **save limit**: at most 10 save attempts per author per minute, «Слишком много сохранений.
    Попробуйте через минуту.»;
  - **failures**: the alert above the list, the selection kept, a manual retry; no automatic retry.
    A poem that is no longer free or no longer in this collection (changed in another tab) fails
    the whole save: «Часть произведений уже недоступна: список обновлён. Отметьте произведения
    заново.» and the list reloads with the stored selection. Collection deleted meanwhile:
    `/account/poems` with «Сборник уже удалён.» once. Session expired: `/login` with «Сессия
    истекла. Войдите снова.» once. Profile no longer public: the poem edit form's not-public alert;
  - **offline or slow**: the existing notice above the list, and every checkbox and the save button
    disabled until the connection is back; a save that fails because the connection dropped keeps
    the selection and shows the notice, not an alert;
  - **nothing to manage** (opened directly, by address or history): «Нет свободных произведений для
    добавления в сборник.» and the link «Вернуться к сборнику» instead of the list;
  - a collection that isn't the caller's, or any collection while the own profile isn't public,
    renders the 404 page, as on the other collection pages;
  - **leaving with unsaved changes**: a link to any other page opens the dialog «Есть несохранённые
    изменения» with «Сохранить изменения» (focused; saves, then follows the link; on a failure the
    author stays and sees the alert), «Уйти без сохранения» (follows the link, the selection is
    lost), and «Остаться» (closes the dialog) (user decision, 2026-11-07). «Выйти» asks the same
    question in its sign-out form. Closing the tab, reloading, or typing an address shows the
    browser's own confirmation; Back/Forward are not blocked, as on the edit pages.
- **`/account/poems`**: in the section «Сборники произведений», under each collection's title
  (a link to the collection page), the collection's poems, newest first, each its title as a link to
  `/account/poems/<poemId>` (user decision, 2026-11-07: this is the "страница управления
  произведениями" of the request). A collection with no poems shows its title only. The poem list
  below the section is unchanged: it still lists every poem, collected or not.
- **Freshness**: after a save, the collection page, the section on `/account/poems`, and this page
  show the current poems on the next screen and after Back/Forward.
- **Breadcrumbs**: «Главная» › «Мастерская поэта» › «Управление произведениями» › `<collection
  title>` › «Произведения сборника», the title linking to the collection page.
- **Database**: `poems.collection_id` (nullable, `on delete set null`), readable by no client role
  directly; the author reads it only through two new `security definer` functions, and writes it
  only through a third, which changes the whole selection in one transaction, or nothing, and only
  for the caller's own poems and own collection. The save limit is a new scope of the per-user write
  counter (ADR 0007).
- Out of scope: ordering poems inside a collection; a poem in several collections; collections on
  public pages; adding a poem to a collection from the poem's own pages or the add poem form;
  filtering or searching the checkbox list; paging (an author has at most a few hundred poems);
  undo; detecting two tabs saving one collection beyond the stale check above.

## Capabilities

### New Capabilities

None. The new page and rules belong to `collection-management`.

### Modified Capabilities

- `collection-management`: the collection page gains the poem list and the «Произведения сборника»
  button (add-poem-collections FR-6, FR-14); a new collection poems page with selection, saving, its limit, failures,
  offline handling, and the leave dialog; the guest rule, the client-module list, and the rendering
  rule name the new route (add-poem-collections FR-16, NFR-2, NFR-8), and the boundary rule names the moved leave guard (add-poem-collections NFR-3); membership privacy and the save function's rules.
- `poem-management`: the section on `/account/poems` lists each collection's poems (poem-management FR-2); the
  database rules name the new way a poem's collection changes and keep it unreadable directly
  (poem-management NFR-1); the boundary rule names the moved leave guard (poem-management NFR-3).
- `breadcrumbs`: the trail of the collection poems page.
- `auth`: «Выйти» on the collection poems page with unsaved changes opens that page's dialog in its
  sign-out form.

## UI copy

Every new user-facing string, verbatim.

| Key | Text |
| --- | --- |
| Collection page: poems heading | `Произведения` |
| Collection page: manage button | `Произведения сборника` |
| Collection page: manage error, collection deleted | `Сборник уже удалён.` (the existing text) |
| Collection page: manage error, nothing to manage | `Нет свободных произведений для добавления в сборник.` |
| Collection page: manage error, check failed | `Не удалось открыть произведения сборника. Попробуйте позже.` |
| Poems page: heading | `Произведения сборника` |
| Poems page: breadcrumb's last item | `Произведения сборника` |
| Poems page: hint | `Отметьте произведения сборника «<title>». Произведение может входить только в один сборник.` |
| Poems page: checkbox group's accessible name | `Произведения` |
| Poems page: nothing to manage | `Нет свободных произведений для добавления в сборник.` |
| Poems page: save, sending | `Сохранить выбранное`, `Сохранение…` |
| Poems page: saved notice | `Произведения сборника сохранены.` |
| Poems page: back link | `Вернуться к сборнику` (the existing text) |
| Poems page: stale selection | `Часть произведений уже недоступна: список обновлён. Отметьте произведения заново.` |
| Poems page: over the limit | `Слишком много сохранений. Попробуйте через минуту.` (the existing text) |
| Poems page: profile no longer public | `Чтобы сохранять изменения, укажите имя и фамилию в профиле автора.` (the existing text) |
| Poems page: server unavailable, unknown failure | `Сохранение сейчас недоступно. Попробуйте позже.`, `Что-то пошло не так. Попробуйте ещё раз.` (the existing texts) |
| Leave dialog: title | `Есть несохранённые изменения` (the existing text) |
| Leave dialog: body, link form | `Сохранить выбранные произведения перед уходом?` |
| Leave dialog: body, sign-out form | `Сохранить выбранные произведения перед выходом?` |
| Leave dialog: save, while sending | `Сохранить изменения`, `Сохранение…` (the existing texts) |
| Leave dialog: leave, link form | `Уйти без сохранения` |
| Leave dialog: leave, sign-out form | `Выйти без сохранения` (the existing text) |
| Leave dialog: stay, close | `Остаться`, `Закрыть` (`Закрыть` is the existing text) |
| `/account/poems`: already deleted notice, `/login` session expired, offline and slow notices | the existing texts, unchanged |

## Mockups

Approved Claude Design canvas (2026-11-07): https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#page-dcb81aee8d83,
artboards 34–37, each in light and dark at 1280 px and 375 px. Every text matches the UI copy table
above, and the artboards use only existing tokens and primitives (native checkboxes with
`accent-color`; no new token or primitive).

| Screen | Artboard |
| --- | --- |
| Collection page 1–4: with poems, empty with free poems, nothing to manage, checking | 34 · `collections/[id]` — с произведениями (`CollectionWithPoems.dc.html`) |
| Collection page 5–7: the three errors under the row, offline and slow, loading | 34 · `collections/[id]` — ошибки, нет связи, загрузка (`CollectionWithPoemsStates.dc.html`) |
| Poems page 1–4: unchanged, changed, sending, saved | 35 · `collections/[id]/poems` (`CollectionPoems.dc.html`) |
| Poems page 5: the four save failures | 35 · `collections/[id]/poems` — сбои сохранения (`CollectionPoemsErrors.dc.html`) |
| Poems page 5–8: stale, empty, empty after stale, offline and slow, loading | 35 · `collections/[id]/poems` — устаревший список, пусто, нет связи, загрузка (`CollectionPoemsStates.dc.html`) |
| Leave dialog 1–4: link form, sign-out form, saving / waiting, offline and slow | 36 · диалог «Есть несохранённые изменения» (`CollectionPoemsLeave.dc.html`) |
| `/account/poems`: collections with nested poem lists | 37 · `/account/poems` — вложенные (`CollectionPoemsList.dc.html`) |

The 404 and error screens are the existing ones (artboards 13 and 15).

## Requirements

Each requirement is specified with its scenarios in the delta specs. Summary:

| ID | Requirement | Spec |
| --- | --- | --- |
| FR-1 | A poem belongs to at most one collection; free poems; deleting either side | collection-management |
| FR-2 | Collection page: its poems, the «Произведения сборника» button and when it shows (modifies add-poem-collections FR-6) | collection-management |
| FR-3 | Pressing «Произведения сборника»: check, open, or the error under the buttons | collection-management |
| FR-4 | Collection poems page: heading, hint, checkbox list, nothing to manage, 404, loading, read failure | collection-management |
| FR-5 | Selection and change detection: when «Сохранить выбранное» shows | collection-management |
| FR-6 | Saving: all or nothing, sending state, the saved state on the page | collection-management |
| FR-7 | Save limit: 10 save attempts per author per minute | collection-management |
| FR-8 | Save failures: alert, stale selection, collection gone, session expired, profile not public | collection-management |
| FR-9 | Offline or slow: the notice and every action frozen (modifies add-poem-collections FR-14) | collection-management |
| FR-10 | Leaving with unsaved changes: save, leave, or stay | collection-management, auth |
| FR-11 | `/account/poems`: each collection's poems under its title (modifies poem-management FR-2) | poem-management |
| FR-12 | Freshness after a save, Back/Forward included | collection-management |
| FR-13 | Guests can't reach the new page (modifies add-poem-collections FR-16) | collection-management |
| FR-14 | Breadcrumb trail of the new page | breadcrumbs |
| NFR-1 | Database integrity: membership private, changed only by the save function, all or nothing, own poems and own collection only | collection-management, poem-management (modifies NFR-1) |
| NFR-2 | Server-rendered page; the client modules hold no poem data beyond the page's own selection (modifies add-poem-collections NFR-2) | collection-management |
| NFR-3 | Module boundaries: still no import between `collection-management` and `poem-management` or `poems` | collection-management, poem-management (modifies NFR-3) |
| NFR-4 | Accessible checkbox group, notices, and dialog | collection-management |
| NFR-5 | Logs carry no titles or ids | collection-management |
| NFR-6 | Design tokens only | collection-management |
| NFR-7 | Russian UI copy verbatim | collection-management |
| NFR-8 | The new route is partially prerendered like the other collection routes (modifies add-poem-collections NFR-8) | collection-management |

## Impact

- **Database**: new migration — `poems.collection_id uuid references collections (id) on delete set
  null`, an index on it, no column grant to any client role; `my_collection_poem_choices(collection_id)`,
  `my_collected_poems()`, `save_my_collection_poems(collection_id, added, removed)` (all `security
  definer`, owner from `auth.uid()`); `consume_write_allowance` gains the `collection_poems_save`
  scope (10 per minute); pgTAP in `supabase/tests/collection_poems.test.sql` and
  `write_rate_limits.test.sql`. The existing poem functions are unchanged; public poem reads return
  the same columns as before.
- **Code**: `src/features/collection-management/` (the collection page's list and button, the new
  page with its form, dialog, check and save actions, DAL reads and writes, the section's poem
  lists; the leave guard moves from the edit form's folder to the feature's `hooks/` so both pages
  use it); `src/features/breadcrumbs/` (one trail); a new route file and breadcrumb slot page under
  `src/app/`. `poem-management` changes nothing but its boundaries test's expected list.
- **Tests**: unit and component tests per module; pgTAP; a web-qa pass and a recorded scenario.
- **Docs**: `docs/architecture.md`, `docs/state-management.md`, `CONTEXT.md` (free poem), ADR 0007's
  scope list, new ADR 0012 (a private column on a public table, read and written only through
  definer functions).
- **Deploy**: `npx supabase db push` for the new migration (added to `docs/environment.md`'s deploy
  checklist).
- **Mockups**: user-facing screens, so a Claude Design brief follows Gate 2 and the test plan
  (`docs/claude-design.md`).
