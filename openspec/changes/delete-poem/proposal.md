# Proposal

## Why

Authors can publish poems but can't take one back: a poem posted by mistake, or one the author no
longer stands behind, stays on their public page forever. The management area already shows each
own poem on `/account/poems/<poemId>`, so that page is where the author removes it (user request,
2026-10-29).

## What Changes

- **Delete button** «Удалить произведение» (danger style) on the owner's poem page
  `/account/poems/<poemId>`, and nowhere else: not on the public poem page, not in the list.
- **Confirmation dialog** before anything is deleted, built on the existing `shared/ui` `Dialog`:
  title «Удалить произведение?», the poem's title in the body, buttons «Отмена» and «Удалить»,
  focus on «Отмена» when it opens. Closing it in any way deletes nothing (clarify, 2026-10-29).
- **Deleting**: the browser sends only the poem's id. The server takes the author from the
  session, and the database deletes the poem only if it belongs to the caller's own profile
  (clarify, 2026-10-29: the author id never comes from the browser). The poem's illustration file
  is removed after the row, best-effort: a file that can't be removed is logged and the delete
  still counts as done (clarify, 2026-10-29).
- **While deleting**: «Удаление…» on the confirm button, both buttons disabled, the dialog can't be
  closed, a double click deletes once.
- **On success**: the author is taken to `/account/poems` (replacing the deleted poem's page in
  the history), which shows «Произведение «<title>» удалено.» once (clarify, 2026-10-29: the
  create flow's one-time notice pattern, no toast system).
- **Nothing to delete** (the poem was already deleted in another tab, or isn't the caller's): the
  author is taken to `/account/poems`, which shows «Произведение уже удалено.» once; nothing is
  changed or revealed (clarify, 2026-10-29).
- **On failure**: «Не удалось удалить произведение. Попробуйте позже.» inside the dialog; the dialog
  stays open, the author stays on the poem page, and nothing changes.
- **Session expired** (it can't be refreshed): nothing is deleted; the author is taken to `/login`,
  which shows «Сессия истекла. Войдите снова.» once. After signing in, the existing login
  destination applies; there is no return-to parameter (clarify, 2026-10-29).
- **Expired access token, live session**: the request's existing session refresh (auth FR-6)
  renews it, so the delete just works; no extra step in the delete itself (clarify, 2026-10-29).
- **Fresh pages**: after a delete, the poem is gone from `/account/poems` and the public author
  page, and both its public page and its management page are 404, on the next request and in the
  browser tab that ran the delete. Other open tabs or browsers may show the old page until they
  reload (clarify, 2026-10-29), as when creating a poem (FR-12 of add-poem-creation).
- **Database**: one new owner-only delete operation. The rule "nobody deletes a poem" in
  poem-management NFR-1 becomes "only the owner deletes their own poem, through that operation".
- **Create limit counts creations** (Gate 1, user decision 2026-10-29): the 100-per-30-days
  limit now counts the poems an author created in the window, deleted ones included, so a
  create → delete loop can't reset it. Deletes need no limit of their own: an author can delete
  only what they created. Recorded as ADR 0010, amending ADR 0009.
- Out of scope: deleting from the list page, bulk delete, undo or soft delete (trash), editing a
  poem, live updates in other open browsers, returning to the poem page after signing in again.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `poem-management`: the delete button, the dialog, the delete itself and its outcomes, the
  one-time notices on `/account/poems`, freshness after a delete; FR-6 (the create limit counts
  creations, not live poems), NFR-1 (owner-only delete), NFR-2
  (the new client modules and what the notice store holds), and NFR-10 (logs of deletion) change.
- `author-poems`: one cached read per author — deleting a poem expires that author's tag too.
- `auth`: `/login` shows a one-time «Сессия истекла. Войдите снова.» after a write found the
  session expired.

## UI copy

Every new user-facing string, verbatim.

| Key | Text |
| --- | --- |
| Owner's poem page: delete button | `Удалить произведение` |
| Dialog: title | `Удалить произведение?` |
| Dialog: body | `«<title>» будет удалено без возможности восстановления.` |
| Dialog: cancel | `Отмена` |
| Dialog: confirm | `Удалить` |
| Dialog: confirm while sending | `Удаление…` |
| Dialog: failure | `Не удалось удалить произведение. Попробуйте позже.` |
| `/account/poems`: deleted notice | `Произведение «<title>» удалено.` |
| `/account/poems`: already deleted notice | `Произведение уже удалено.` |
| Dialog: corner close button, accessible name | `Закрыть` (the contact dialog's existing text) |
| `/login`: session expired notice | `Сессия истекла. Войдите снова.` (the profile editor's existing text) |

## Mockups

Approved Claude Design canvas (2026-10-29): https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#page-dcb81aee8d83,
artboards 22-24, each in light and dark at 1280 px and 375 px.

| Screen | Artboard |
| --- | --- |
| `/account/poems/<id>` with «Удалить произведение» (loaded, loading, 404) and the dialog (confirm, sending, error) | 22 · `/account/poems/[id]` — удаление: кнопка и диалог (`DeletePoem.dc.html`) |
| `/account/poems` after a delete: deleted, already deleted, over the loading skeleton, over the list error | 23 · `/account/poems` — после удаления (`AfterDelete.dc.html`) |
| `/login` with the session-expired notice, and a plain visit | 24 · `/login` — Вход после истёкшей сессии (`Login.dc.html`) |

The mockups add a `--on-danger` token (text on a danger fill: `#ffffff` light, `#0a0a0a` dark) and a
neutral `Alert` tone (`muted` left border) for the `/login` notice (design D7).

## Requirements

Each requirement is specified with its scenarios in the delta specs. Summary:

| ID | Requirement | Spec |
| --- | --- | --- |
| FR-1 | Delete button on the owner's poem page only | poem-management |
| FR-2 | Confirmation dialog; closing it deletes nothing | poem-management |
| FR-3 | Deleting: only the poem id sent, owner from the session, row then illustration, sending state, redirect, one-time deleted notice | poem-management |
| FR-4 | Nothing to delete: redirect with a one-time already-deleted notice, nothing changed | poem-management |
| FR-5 | Failure: alert in the open dialog, nothing changed | poem-management |
| FR-6 | Session expired: nothing deleted, `/login` with a one-time notice | poem-management, auth |
| FR-7 | Expired access token with a live session: the delete succeeds | poem-management |
| FR-8 | Freshness: the deleted poem is gone everywhere on the next request | poem-management, author-poems |
| FR-9 | The create limit counts creations in the window, deleted poems included | poem-management (modifies FR-6) |
| NFR-1 | Database integrity: only the owner deletes, only through the delete operation | poem-management (modifies NFR-1) |
| NFR-2 | Server-rendered pages; the new client modules and the notice stores hold no poem data beyond the title shown | poem-management (modifies NFR-2) |
| NFR-3 | Module boundaries: no new import direction between features | poem-management |
| NFR-4 | Accessible dialog, alert, and notices | poem-management |
| NFR-5 | Logs of deletion carry no poem content or ids | poem-management (modifies NFR-10) |
| NFR-6 | Design tokens only; danger tone for the button and the confirm | poem-management |
| NFR-7 | Russian UI copy verbatim | poem-management |

## Impact

- **Database**: new migration — `public.delete_my_poem(poem_id uuid)` (`security definer`, owner
  from `auth.uid()`), still no delete grant or policy on `poems`; a `poem_creations` log filled by
  an insert trigger on `poems` (backfilled), which `poem_create_status` now counts; pgTAP tests in
  `supabase/tests/poems.test.sql`. The `poem-illustrations` bucket's owner delete policy already
  exists.
- **Code**: `src/features/poem-management/` (action, DAL write, button, dialog, deleted notice,
  store); `src/features/auth/` (the sign-in page's session-expired notice); `src/shared/ui/Dialog`
  (a way to keep it open while a request runs); `src/shared/ui/Button` (a `danger` variant);
  `src/shared/lib/one-time-notice/` (the one-time-notice hook, shared with the created notice, and
  a small store for the session-expired notice, written by `poem-management` and read by `auth`).
- **Tests**: unit and component tests per feature; pgTAP; a web-qa pass and recorded scenario for
  the delete flow.
- **Docs**: `docs/architecture.md`, `docs/state-management.md`; new ADR 0010 (row-creating limits
  count creations, not live rows), ADR 0009's status line.
- **Deploy**: `npx supabase db push` for the new migration (added to the deploy checklist in
  `docs/environment.md`).
