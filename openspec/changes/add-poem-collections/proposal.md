# Proposal

## Why

Authors can create, edit, and delete single poems but have no way to group them: a cycle of poems,
a book in progress, or a season's work stays a flat list on `/account/poems`. A collection
(«сборник произведений») gives that group a name and a description. This change lets an author
create, view, edit, and delete their own collections; filling a collection with poems comes in a
later change (user request, 2026-11-04).

The flows reuse what the poem flows already settled — the edit page's change detection, leave
guard, and offline rule; the delete dialog; the one-time notices; the session-expired redirect —
so the author meets the same behaviour in both places.

## What Changes

- **Create button** «Создать сборник произведений» on `/account/poems`, in one row with
  «Добавить новое произведение», above the poem list. It opens `/account/poems/collections/new`.
- **Create page** `/account/poems/collections/new`: the heading «Создание сборника» and a form with
  «Название сборника» (required, at most 80 characters after trimming) and «Описание
  (необязательно)» (plain text, at most 1000 characters after trimming; blank means no
  description), and «Создать сборник». The fields are checked in the browser before sending and
  again on the server; the first invalid field takes focus. While sending: «Создание…», the form
  disabled and dimmed, a double click creates once.
- **After a create**: the author is taken to `/account/poems` (replacing the create page in the
  history), which shows «Сборник «<title>» создан.» once, and the section «Сборники произведений»
  lists the new collection.
- **Collections section** on `/account/poems`: the level-2 heading «Сборники произведений» and the
  author's collections, newest first, each its title as a link to its page. The section sits
  between the button row and the poem list. With no collections, the section — heading
  included — is not rendered. A failed collections read shows «Не удалось загрузить сборники.
  Попробуйте позже.» in its place; the buttons and the poem list are unaffected.
- **Collection page** `/account/poems/collections/<collectionId>`: the title as the level-1
  heading, the description (paragraphs split on blank lines) when there is one, and the buttons
  «Редактировать сборник» (a link to the edit page) and «Удалить сборник» (danger style), edit
  first. A collection that isn't the caller's — unknown, malformed id, another author's — or any
  collection while the own profile isn't public renders the 404 page.
- **Edit page** `/account/poems/collections/<collectionId>/edit`: the heading «Редактирование
  сборника» and the create form's fields filled with the stored title and description. Its UX is
  the poem edit page's, field for field:
  - **Changed or not**: compared on the stored form (after trimming). Unchanged → the link
    «Вернуться к сборнику» and no save button; changed → «Сохранить изменения» and «Отменить
    изменения» (puts both fields back at once, no request, no confirmation, focus on the back
    link).
  - **Saving**: the browser sends the id and the fields; the server takes the author from the
    session and the database changes the collection only if it belongs to the caller's own public
    profile. «Сохранение…», the form disabled, one save per double click.
  - **On success**: the author is taken to the collection page (a history push), which shows
    «Изменения сохранены.» once and the new values.
  - **Edit limit**: at most 10 save attempts per author per minute, the message «Слишком много
    сохранений. Попробуйте через минуту.».
  - **Failures**: the alert above the form, values kept, a manual retry; no automatic retry.
  - **Session expired**: nothing saved; `/login` with «Сессия истекла. Войдите снова.» once.
  - **Collection gone meanwhile** (deleted in another tab): nothing saved; `/account/poems` with
    «Сборник уже удалён.» once.
  - **Profile no longer public meanwhile**: nothing saved; the alert «Чтобы сохранять изменения,
    укажите имя и фамилию в профиле автора.», values kept.
  - **Leaving with unsaved changes**: the poem edit page's guard — links outside the collection
    page and its edit page blocked with the dialog «Есть несохранённые изменения», the browser's
    own confirmation on close or reload, «Выйти» asking first. Back/Forward are not blocked; the
    draft stays in the hidden page as on the poem edit page.
- **Delete**: «Удалить сборник» opens the dialog «Удалить сборник?» with «Сборник «<title>» будет
  удалён без возможности восстановления.», «Отмена» (focused) and «Удалить»; closing it in any way
  deletes nothing. While deleting: «Удаление…», both buttons disabled, the dialog held open. On
  success: `/account/poems` (replacing the collection page in the history) with «Сборник «<title>»
  удалён.» once and the section listing the remaining collections; when the deleted one was the
  last, the section is gone. Nothing to delete (gone in another tab): `/account/poems` with
  «Сборник уже удалён.» once. Failure: «Не удалось удалить сборник. Попробуйте позже.» in the open
  dialog. Session expired: `/login` with the session-expired notice. Deleting needs no public
  profile and has no limit of its own (ADR 0010, Decision 7).
- **Offline or slow**: the existing connection rule (`useConnectionStatus`, `ConnectionNotice`)
  applies to every button here that sends a request: «Создать сборник», «Сохранить изменения»,
  «Удалить сборник», and the dialog's «Удалить» are disabled, with the notice above the form,
  the buttons, or the open delete dialog's buttons, while the browser reports no connection or a slow one. Links and «Отменить
  изменения» stay enabled. A request that fails because the connection dropped keeps every value
  and shows the notice, not an alert.
- **Create limit**: at most 50 collections per author per 30 days, counted inside the database
  function that inserts and over creations (deleted ones included), ADR 0009/0010's pattern. Over
  the limit: «Слишком много новых сборников. Попробуйте позже.».
- **Freshness**: collections are private to their author and read per request, never from a
  shared cache; every write refreshes the author's client router so the list, the collection
  page, and the section's visibility are current on the next screen, Back/Forward included.
- **Repeated, not shared** (user decision, 2026-11-04): the new feature repeats the poem flows'
  logic in its own files — its own form hook, leave guard, leave dialog, and write-log — and
  reuses only what already sits in `shared/` (connection status and notice, the «Выйти»
  handshake store, the one-time notice hook, the session-expired store, `Dialog`, `Button`).
  `poem-management` keeps its code; `/account/poems` gets the new button and section through slot
  props the route file fills, so neither feature imports the other.
- **Glossary**: «Collection» means an author's own named group of their poems. The project context
  line in `openspec/config.yaml` that calls it "a reader's saved poems" is corrected, and the term
  goes into `CONTEXT.md`.
- Out of scope: adding, removing, or ordering poems in a collection; collections on public pages
  or visible to anyone but their author; a cover image; unique titles (two collections may share
  a title); reordering the collections list; undo or soft delete; version history; detecting two
  tabs editing one collection (the last save wins); offline queueing.

## Capabilities

### New Capabilities

- `collection-management`: the author's collections — the create page and form, the collection
  page, the edit page with change detection and the leave guard, deleting, the one-time notices,
  the create and edit limits, offline handling, and the database rules (owner-only reads and
  writes).

### Modified Capabilities

- `poem-management`: `/account/poems` gains the create button and the collections section (FR-2),
  filled in by the route file; the module-boundary rule names the new feature (NFR-3).
- `breadcrumbs`: trails of the create page, the collection page, and its edit page.
- `auth`: «Выйти» also asks first while the collection edit form holds unsaved changes.

## UI copy

Every new user-facing string, verbatim.

| Key | Text |
| --- | --- |
| `/account/poems`: create button | `Создать сборник произведений` |
| `/account/poems`: section heading | `Сборники произведений` |
| `/account/poems`: section read failure | `Не удалось загрузить сборники. Попробуйте позже.` |
| `/account/poems`: created notice | `Сборник «<title>» создан.` |
| `/account/poems`: deleted notice | `Сборник «<title>» удалён.` |
| `/account/poems`: already deleted notice | `Сборник уже удалён.` |
| Create page: heading | `Создание сборника` |
| Create page: breadcrumb's last item | `Создание сборника` |
| Form: title label | `Название сборника` |
| Form: description label | `Описание (необязательно)` |
| Create form: submit | `Создать сборник` |
| Create form: submit while sending | `Создание…` |
| Create form: over the limit | `Слишком много новых сборников. Попробуйте позже.` |
| Create page: profile not public (page and alert) | `Чтобы создавать сборники, укажите имя и фамилию в профиле автора.` |
| Create page: link to the profile editor | `Перейти к профилю автора` (the existing text) |
| Edit form: profile no longer public (alert) | `Чтобы сохранять изменения, укажите имя и фамилию в профиле автора.` (the poem edit form's text) |
| Field error: required | `Обязательное поле.` (the existing text) |
| Field error: title too long | `Не более 80 символов.` |
| Field error: description too long | `Не более 1000 символов.` |
| Form: server unavailable | `Сохранение сейчас недоступно. Попробуйте позже.` (the existing text) |
| Form: unknown failure | `Что-то пошло не так. Попробуйте ещё раз.` (the existing text) |
| Collection page: edit button | `Редактировать сборник` |
| Collection page: delete button | `Удалить сборник` |
| Collection page: saved notice | `Изменения сохранены.` (the poem page's text) |
| Edit page: heading | `Редактирование сборника` |
| Edit page: breadcrumb's last item | `Редактирование` (the existing text) |
| Edit form: save, sending, discard | `Сохранить изменения`, `Сохранение…`, `Отменить изменения` (the existing texts) |
| Edit form: link shown while nothing changed | `Вернуться к сборнику` |
| Edit form: over the limit | `Слишком много сохранений. Попробуйте через минуту.` (the existing text) |
| Delete dialog: title | `Удалить сборник?` |
| Delete dialog: body | `Сборник «<title>» будет удалён без возможности восстановления.` |
| Delete dialog: cancel, confirm, confirm while sending, close | `Отмена`, `Удалить`, `Удаление…`, `Закрыть` (the existing texts) |
| Delete dialog: failure | `Не удалось удалить сборник. Попробуйте позже.` |
| Leave dialog, offline and slow notices, `/login` session expired | the existing texts, unchanged |

## Mockups

Approved Claude Design canvas (2026-11-04): https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#page-dcb81aee8d83,
artboards 30–33, each in light and dark at 1280 px and 375 px. Every text matches the UI copy table
above, and the artboards use only existing tokens (no new token or primitive beyond `TextAreaField`).

| Screen | Artboard |
| --- | --- |
| `/account/poems` with the section: with collections, none, read failure, the three one-time notices, loading | 30 · `/account/poems` — раздел «Сборники произведений» (`CollectionsList.dc.html`) |
| Create page a–d: empty, field errors, sending, limit and unavailable failures | 31 · `collections/new` — пустая, ошибки полей, отправка, сбои (`CollectionNew.dc.html`) |
| Create page d–g: unknown and not-public failures, offline and slow, profile not public, loading | 31 · `collections/new` — сбои, нет связи, профиль не публичный, загрузка (`CollectionNewStates.dc.html`) |
| Collection page a–e: with and without a description, saved notice, offline and slow, loading | 32 · `collections/[id]` — страница сборника (`Collection.dc.html`) |
| Delete dialog: open, sending, failure, offline | 32 · `collections/[id]` — диалог удаления (`CollectionDelete.dc.html`) |
| Edit page a–c: unchanged, changed, sending | 33 · `collections/[id]/edit` — без изменений, изменено, сохранение (`CollectionEdit.dc.html`) |
| Edit page d: the four save failures | 33 · `collections/[id]/edit` — сбои сохранения (`CollectionEditErrors.dc.html`) |
| Edit page e–g: field errors, offline and slow, loading | 33 · `collections/[id]/edit` — ошибки полей, нет связи, загрузка (`CollectionEditStates.dc.html`) |
| Unsaved-changes dialog, link and sign-out forms | 27 · the poem edit page's dialog, reused as is (`LeaveDialog.dc.html`) |

The 404 and error screens are the existing ones (artboards 13 and 15). The create page's
not-public state draws «Перейти к профилю автора» as a `ghost` link.

## Requirements

Each requirement is specified with its scenarios in the delta specs. Summary:

| ID | Requirement | Spec |
| --- | --- | --- |
| FR-1 | Create button on `/account/poems` | poem-management |
| FR-2 | Collections section on `/account/poems`: list, hidden when empty, read failure | poem-management |
| FR-3 | Create page and form: fields, checks, sending state | collection-management |
| FR-4 | Creating: owner from the session, redirect to `/account/poems`, one-time created notice | collection-management |
| FR-5 | Create limit: 50 per author per 30 days, counted over creations | collection-management |
| FR-6 | Collection page: title, description, edit and delete buttons, 404 rules, read failure | collection-management |
| FR-7 | Edit page: heading, form filled with stored values, 404 rules | collection-management |
| FR-8 | Change detection, discard, back link | collection-management |
| FR-9 | Saving an edit: owner from the session, sending state, collection page with a one-time saved notice | collection-management |
| FR-10 | Edit limit: 10 save attempts per author per minute | collection-management |
| FR-11 | Write failures: alert, values kept, manual retry; session expired; collection gone; profile no longer public | collection-management |
| FR-12 | Leave guard and kept draft on the edit page | collection-management, auth |
| FR-13 | Deleting: dialog, sending state, redirect with notices, failure in the dialog | collection-management |
| FR-14 | Offline or slow: request buttons disabled with the notice | collection-management |
| FR-15 | Freshness after every write, Back/Forward included | collection-management |
| FR-16 | Guests can't reach the collection pages | collection-management |
| FR-17 | Breadcrumb trails of the three new pages | breadcrumbs |
| NFR-1 | Database integrity: owner-only reads and writes, only through the three functions | collection-management |
| NFR-2 | Server-rendered pages; the client modules and stores hold no collection data beyond what is listed | collection-management |
| NFR-3 | Module boundaries: a self-contained feature, no import between it and `poem-management` | collection-management, poem-management (modifies NFR-3) |
| NFR-4 | Accessible forms, dialog, section, and notices | collection-management |
| NFR-5 | Logs carry no titles, descriptions, ids | collection-management |
| NFR-6 | Design tokens only | collection-management |
| NFR-7 | Russian UI copy verbatim | collection-management |
| NFR-8 | The new routes are partially prerendered like the other management routes | collection-management |

## Impact

- **Database**: new migration — `public.collections` (RLS: the owner reads their own rows only;
  no write grant), `public.collection_creations` with its insert trigger,
  `create_my_collection(title, description)`, `update_my_collection(collection_id, title,
  description)`, `delete_my_collection(collection_id)` (all `security definer`, owner from
  `auth.uid()`); `consume_write_allowance` gains the `collection_edit` scope (10 per minute);
  pgTAP in a new `supabase/tests/collections.test.sql` and `write_rate_limits.test.sql`.
- **Code**: new `src/features/collection-management/`; `src/features/poem-management/`
  (`MyPoemsPage` / `MyPoemsContent` gain three slot props; the boundaries test's expected list);
  `src/features/breadcrumbs/` (three trails); `src/shared/ui/TextAreaField` (new primitive);
  `src/app/(authorized)/account/poems/page.tsx` fills the slots; six new route files under
  `src/app/(authorized)/account/poems/collections/` and `src/app/@breadcrumbs/…`.
- **Tests**: unit and component tests per module; pgTAP; a web-qa pass and recorded scenarios.
- **Docs**: `docs/architecture.md`, `docs/state-management.md`, `CONTEXT.md`,
  `openspec/config.yaml`'s context line; ADR 0007's scope list and ADR 0009's "later features"
  note gain the collection entries; new ADR 0011 (private reader data read uncached under RLS,
  kept fresh with `refresh()`).
- **Deploy**: `npx supabase db push` for the new migration (added to `docs/environment.md`'s deploy
  checklist).
