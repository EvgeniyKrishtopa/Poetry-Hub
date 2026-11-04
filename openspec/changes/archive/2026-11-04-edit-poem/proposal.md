# Proposal

## Why

Authors can create and delete poems but can't fix one: a typo in the title, a stanza rewritten, a
wrong genre, or an illustration they no longer want means deleting the poem and posting it again,
which loses its date and its place in the list. The owner's poem page `/account/poems/<poemId>`
already holds the delete button, so the edit entry sits next to it (user request, 2026-11-03).

The same request asks for one rule the create form and the profile editor lack today: when the
browser is offline or its connection is slow, the author is told so and can't press a save button that can only fail or hang.

## What Changes

- **Edit button** «Редактировать произведение» on the owner's poem page `/account/poems/<poemId>`,
  next to «Удалить произведение», and nowhere else. It opens the edit page
  `/account/poems/<poemId>/edit`.
- **Edit page**: the heading «Редактирование произведения» and the add form's fields, toolbar,
  limits, and checks, filled with the poem's stored title, text, genre, and illustration. It is the
  add form's component, not a copy (NFR-3). A poem that isn't the caller's renders the 404 page,
  like the owner's poem page.
- **Changed or not**: the form compares what it would store (each field after the same trimming
  the server applies) with what is stored. While nothing differs, the save button is not shown and
  the link «Вернуться на страницу произведения» stands in its place; as soon as something differs,
  «Сохранить изменения» replaces the link, with «Отменить изменения» next to it, which puts every
  field back to the stored values at once (the stored illustration included), with no confirmation
  and no request (spec-clarify, 2026-11-03). Typing a letter and deleting it again leaves the form
  unchanged.
- **Illustration**: a stored illustration shows as a preview with «Заменить иллюстрацию» (the
  picker) and «Удалить иллюстрацию». Removing it hides the preview; saving then removes the
  illustration from the poem and its file from Storage. A replacement is uploaded on save and the
  old file is removed after the poem points at the new one. Removal of an old file is best-effort,
  as in the delete flow: a file that can't be removed is logged and the save still counts.
- **Checks**: exactly the create flow's — the same field rules, browser check before sending,
  server check again, the illustration checked on pick, and focus on the first invalid field.
- **Saving**: the browser sends the poem id and the fields; the server takes the author from the
  session, and the database changes the poem only if it belongs to the caller's own public
  profile (the delete flow's rule). The id, the author, and the creation date never change.
  While sending: «Сохранение…», the whole form disabled and dimmed, a double click saves once.
- **On success**: the author lands on the poem page, which shows «Изменения сохранены.» once and
  the new content at once. Guests see the new content on their next load of the poem page or of
  the author's page.
- **Write limit**: at most 10 save attempts per author per minute (the profile editor's limit and
  its message «Слишком много сохранений. Попробуйте через минуту.»), counted per signed-in
  account, not per browser or address.
- **Failures**: a server or database failure shows its message in a `role="alert"` element above
  the form; every field keeps its value and the author can press «Сохранить изменения» again.
  Nothing retries on its own (design D9: the create, delete, and profile flows don't either).
- **Session expired**: nothing is saved; the author is taken to `/login`, which shows «Сессия
  истекла. Войдите снова.» once (the delete flow's notice); after signing in, the existing
  destination applies — the home page.
- **Poem gone meanwhile** (deleted in another tab): nothing is saved; the author is taken to
  `/account/poems`, which shows «Произведение уже удалено.» once (the delete flow's notice).
- **Profile no longer public meanwhile** (a name cleared in another tab): nothing is saved; the
  author stays on the form with every value, and the alert above it reads «Чтобы сохранять
  изменения, укажите имя и фамилию в профиле автора.» (spec-clarify, 2026-11-03).
- **Offline or slow**: while the browser reports no connection, a notice «Нет подключения к
  интернету. Сохранение станет доступно, когда связь восстановится.» is shown above the form; while
  the browser's own estimate reports a slow connection (Chrome and Edge only), a notice «Медленное
  подключение к интернету. Сохранение станет доступно, когда связь улучшится.» is shown instead. In
  both cases the save button is disabled and comes back with a normal connection. A save whose
  request fails because the connection dropped keeps every value. The same rule applies to the add
  form's «Добавить произведение» and to the profile editor's «Сохранить» and «Удалить» buttons, through one hook
  in `shared/` (spec-clarify, 2026-11-03).
- **Draft kept between the two pages**: going from the edit page to its poem page and back (by a
  link or the browser's Back/Forward) shows the edit form with the author's unsaved values. This
  is the route's own `Activity` state, which Next keeps for recently visited pages.
- **Leaving with unsaved changes**: while the form differs from what is stored, and while a save is
  still sending, a click on any
  link to a page other than this poem's page or its edit page does not navigate; a dialog «Есть
  несохранённые изменения» says «Сначала сохраните изменения.» with the button «Продолжить
  редактирование». Closing the tab, reloading, or typing another address shows the browser's own
  leave-page confirmation, where leaving stays possible. The header's «Выйти» asks first: the same
  dialog says «Если выйти сейчас, изменения пропадут.» with «Продолжить редактирование» and
  «Выйти без сохранения», and the sign-out runs only after the second (spec-clarify, 2026-11-03;
  revised in the PR #168 review, 2026-11-03: confirm instead of refuse). The browser's Back and Forward buttons are
  not blocked (the browser doesn't let a page cancel them); the draft then stays in the hidden page
  as above.
- **Database**: one new owner-only update operation; poem-management NFR-1's "nobody updates a
  poem" becomes "only the owner updates their own poem, through that operation". A new write-limit
  scope `poem_edit` (10 per minute) in the existing per-user limit function.
- Out of scope: editing from the list page or the public poem page, version history or undo,
  showing "edited" dates, detecting two tabs editing the same poem (the last save wins), automatic
  retries, probe requests to measure the connection (a slow connection is detected only from the
  browser's own estimate, so never in Safari or Firefox), blocking the
  browser's Back/Forward buttons, offline or slow handling for the delete dialog and the contact form.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `poem-management`: the edit button, the edit page and form, change detection, the illustration
  replace/remove, saving and its outcomes, the edit limit, the one-time saved notice, the leave
  guard, the kept draft, offline handling on the add and edit forms, freshness after an edit;
  NFR-1 (owner-only update), NFR-2 (new client modules and what the new store holds), NFR-3 (one
  form for create and edit), NFR-9 (the new route), and NFR-10 (logs of editing) change.
- `author-poems`: an edited poem shows on the public pages (the create flow's freshness rule,
  applied to edits).
- `author-profiles`: offline or slow notice and disabled «Сохранить» and «Удалить» in the profile
  editor; the per-user
  write limit gains the `poem_edit` scope.
- `breadcrumbs`: the trail of `/account/poems/<poemId>/edit`.
- `auth`: while the edit form holds unsaved changes, the header's «Выйти» signs out only after the
  author confirms in the edit form's dialog.

## UI copy

Every new user-facing string, verbatim.

| Key | Text |
| --- | --- |
| Owner's poem page: edit button | `Редактировать произведение` |
| Edit page: heading | `Редактирование произведения` |
| Edit page: breadcrumb's last item | `Редактирование` |
| Edit form: save button | `Сохранить изменения` |
| Edit form: save button while sending | `Сохранение…` |
| Edit form: discard button | `Отменить изменения` |
| Edit form: link shown while nothing changed | `Вернуться на страницу произведения` |
| Edit form: picker button with an illustration shown | `Заменить иллюстрацию` |
| Edit form: picker button with no illustration | `Выбрать иллюстрацию` (the add form's text) |
| Edit form: remove button | `Удалить иллюстрацию` |
| Edit form: over the limit | `Слишком много сохранений. Попробуйте через минуту.` (the profile editor's text) |
| Edit form: server unavailable | `Сохранение сейчас недоступно. Попробуйте позже.` (the add form's text) |
| Edit form: profile no longer public | `Чтобы сохранять изменения, укажите имя и фамилию в профиле автора.` |
| Edit form: unknown failure | `Что-то пошло не так. Попробуйте ещё раз.` (the add form's text) |
| Poem page: saved notice | `Изменения сохранены.` |
| Leave dialog: title | `Есть несохранённые изменения` |
| Leave dialog: body (a link) | `Сначала сохраните изменения.` |
| Leave dialog: body (sign-out) | `Если выйти сейчас, изменения пропадут.` |
| Leave dialog: stay button | `Продолжить редактирование` |
| Leave dialog: sign-out button (sign-out only) | `Выйти без сохранения` |
| Leave dialog: corner close button, accessible name | `Закрыть` (the existing text) |
| Add form, edit form, profile editor: offline notice | `Нет подключения к интернету. Сохранение станет доступно, когда связь восстановится.` |
| Add form, edit form, profile editor: slow connection notice | `Медленное подключение к интернету. Сохранение станет доступно, когда связь улучшится.` |
| `/account/poems`: poem gone | `Произведение уже удалено.` (the delete flow's text) |
| `/login`: session expired | `Сессия истекла. Войдите снова.` (the delete flow's text) |

Field labels, field errors, the toolbar, and «Выберите жанр» are the add form's existing copy.

## Mockups

Approved Claude Design canvas (2026-11-03): https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#play-f2a0b40a5e8c,
artboards 25-29, each in light and dark at 1280 px and 375 px. Artboard 27's sign-out form was
added to the same canvas on 2026-11-04.

| Screen | Artboard |
| --- | --- |
| `/account/poems/<id>` with «Редактировать произведение» and «Удалить произведение», and after a save | 25 · `/account/poems/[id]` — кнопки «Редактировать» и «Удалить», после сохранения (`OwnerPoem.dc.html`) |
| Edit page a-c: unchanged, changed, illustration removed | 26 · edit — a–c (`EditPoem.dc.html`) |
| Edit page d-f: sending, the four failures, field error | 26 · edit — d–f (`EditPoemStates.dc.html`) |
| Edit page g-j: offline, slow, loading, genres unavailable | 26 · edit — g–j (`EditPoemMore.dc.html`) |
| Leave dialog: link form and sign-out form | 27 · диалог «Есть несохранённые изменения» — уход по ссылке и выход из аккаунта (`LeaveDialog.dc.html`); the sign-out form added 2026-11-04 after the PR #168 review |
| `/account/poems/new` offline and slow | 28 (`NewPoemOffline.dc.html`) |
| `/account/author` offline and slow, view and one field in edit mode | 29 (`AuthorOffline.dc.html`) |

Where the mockups and the spec differ, the spec wins: the stored illustration's preview keeps an
empty `alt` (NFR-4), though artboard 26 labels it «Текущая иллюстрация».

## Requirements

Each requirement is specified with its scenarios in the delta specs. Summary:

| ID | Requirement | Spec |
| --- | --- | --- |
| FR-1 | Edit button on the owner's poem page, next to the delete button | poem-management |
| FR-2 | Edit page: heading, the add form filled with the stored values, 404, read failures | poem-management |
| FR-3 | Change detection: save and discard buttons only when a stored value would change, the back link otherwise | poem-management |
| FR-4 | Illustration: keep, replace, or remove; old file removed best-effort | poem-management |
| FR-5 | The create flow's field checks, in the browser and on the server | poem-management |
| FR-6 | Saving: owner from the session, sending state, success lands on the poem page with a one-time notice | poem-management |
| FR-7 | Edit limit: 10 save attempts per author per minute | poem-management, author-profiles |
| FR-8 | Failures: alert above the form, values kept, manual retry, no automatic retry | poem-management |
| FR-9 | Session expired: nothing saved, `/login` with the one-time notice | poem-management |
| FR-10 | Poem gone meanwhile: `/account/poems` with «Произведение уже удалено.»; profile no longer public: alert, values kept | poem-management |
| FR-11 | Offline or slow: notice and disabled save on the edit form, the add form, and the profile editor | poem-management, author-profiles |
| FR-12 | Draft kept between the poem page and the edit page | poem-management |
| FR-13 | Leave guard: links blocked with a dialog, the browser's own confirmation on close or reload, sign-out asks to confirm | poem-management, auth |
| FR-14 | Freshness: the edit shows to the author at once and to guests on their next load | poem-management, author-poems |
| FR-15 | Breadcrumb trail of the edit page | breadcrumbs |
| NFR-1 | Database integrity: only the owner updates, only through the update operation | poem-management (modifies NFR-1) |
| NFR-2 | Server-rendered pages; the new client modules and the new store hold no poem content | poem-management (modifies NFR-2) |
| NFR-3 | One form component for create and edit; the connection status in `shared/`, the leave guard beside the edit form | poem-management (modifies NFR-3) |
| NFR-4 | Accessible edit form, dialog, and notices | poem-management |
| NFR-5 | Logs of editing carry no poem content, ids, or paths | poem-management (modifies NFR-10) |
| NFR-6 | Design tokens only | poem-management |
| NFR-7 | Russian UI copy verbatim | poem-management |
| NFR-8 | The edit route is partially prerendered like the other management routes | poem-management (modifies NFR-9) |

## Impact

- **Database**: new migration — `public.update_my_poem(...)` (`security definer`, owner from
  `auth.uid()` and the public own profile), still no update grant or policy on `poems`;
  `write_rate_limits`' scope check and `consume_write_allowance`'s limits gain `poem_edit`
  (10 per minute); pgTAP in `supabase/tests/poems.test.sql` and `write_rate_limits.test.sql`.
- **Code**: `src/features/poem-management/` (route component, action, DAL write, the shared
  create/edit form, edit button, saved notice and its store, leave dialog);
  `src/features/authors/` (connection notice, disabled «Сохранить» and «Удалить» in the profile
  editor); `src/features/auth/` (`signOutWithConfirmation`, a client wrapper that asks the leave-block store
  before calling the sign-out action; `SignOutButton` calls it);
  `src/features/breadcrumbs/` (the edit route's trail); `src/shared/` (connection status hook,
  `ConnectionNotice`, the leave-block store); `src/app/(authorized)/account/poems/[poemId]/edit/` and its breadcrumb slot.
- **Tests**: unit and component tests per module; pgTAP; a web-qa pass and a recorded scenario for
  the edit flow.
- **Docs**: `docs/architecture.md`, `docs/state-management.md`; ADR 0007's scope list.
- **Deploy**: `npx supabase db push` for the new migration (added to the deploy checklist in
  `docs/environment.md`).
