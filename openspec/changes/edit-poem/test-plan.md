# Test Plan

One row per acceptance criterion (a scenario's THEN) in this change's spec deltas. Levels:
**unit** (one module, its collaborators mocked), **integration** (a real local service: the
Supabase database, Storage, or a full Next build), **end-to-end** (a real browser against the dev
server, Gate 3 and recorded scenarios). Requirement IDs are this change's (`proposal.md`); a
MODIFIED block of the `poem-management` capability names its capability ID in brackets. Scenarios a
MODIFIED block carries over unchanged keep their existing tests and are listed once at the end.

## poem-management

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| FR-1 | Owner's poem page shows «Редактировать произведение» and «Удалить произведение» in one row, edit first; it links to `/account/poems/<id>/edit` | `OwnPoemContent` test: `ok` renders `EditPoemButton` before `DeletePoemButton`; `EditPoemButton` test: link named «Редактировать произведение» with `href` `/account/poems/<id>/edit` | unit |
| FR-1 | Not on the public poem page or `/account/poems` | `PoemPageContent` and `MyPoemsContent` tests: no link named «Редактировать произведение»; static check that `EditPoemButton` is rendered only by `OwnPoemContent` | unit |
| FR-2 | Filled form: heading, stored title, text, genre, illustration preview | `EditPoemPage` test (heading in the shell); `EditPoemContent` test: form receives stored values and the stored illustration URL; `EditPoemForm` test: inputs hold them; web-qa: open the edit page of a poem with an illustration | unit, end-to-end |
| FR-2 | Stored genre no longer offered → «—» selected, other fields stored | `EditPoemContent` test: genre id not in the list → initial `genreId` is the placeholder; `null` → «Без жанра» | unit |
| FR-2 | Another author's poem → 404 | `EditPoemContent` test: `not-found` calls `notFound()`, no form | unit |
| FR-2 | Read fails → generic error screen | `EditPoemContent` test: `unavailable` throws | unit |
| FR-2 | Genres can't be read → heading and the genres alert, no form | `EditPoemContent` test: genres failure renders the `role="alert"` text and no form | unit |
| FR-3 | Nothing changed → back link, no save button | `EditPoemForm` test: initial render has the link to `/account/poems/<id>` and no «Сохранить изменения» | unit |
| FR-3 | A real change → save (and discard) shown, link gone | `EditPoemForm` test: type in the title → «Сохранить изменения» and «Отменить изменения», no link; `isPoemFormChanged` unit test for each field | unit |
| FR-3 | Change undone → back link again | `EditPoemForm` test: type and delete a letter → link shown, no save button; `isPoemFormChanged` test | unit |
| FR-3 | Discarding restores every field and the stored preview, clears errors, sends nothing, focuses the back link | `EditPoemForm` test: change title, remove illustration, trigger a text error, press «Отменить изменения» → stored values, stored preview with both buttons, no error, action mock not called, focus on the link; `usePoemForm` `reset()` test; web-qa: discard after edits | unit, end-to-end |
| FR-3 | Trimming-only edit stays unchanged | `isPoemFormChanged` test: trailing spaces on the title and an empty line after the text → unchanged; `EditPoemForm` test shows the link | unit |
| FR-3 | Illustration removed, or a new valid file picked → changed | `isPoemFormChanged` test: `stored → none`, `none → new`, `stored → new`; rejected pick unchanged; `EditPoemForm` test with each | unit |
| FR-4 | Stored illustration shows preview, «Заменить иллюстрацию», «Удалить иллюстрацию» | `IllustrationField` test: `stored` state renders the image, picker label, remove label | unit |
| FR-4 | Remove and save → no image on the poem pages, old file gone | `updatePoemAction` test: `remove` → `keepIllustration: false`, path `null`, then `removeIllustrationBestEffort(replacedPath)`; pgTAP: `keep_illustration = false` with `null` clears the path and answers `replaced_path`; web-qa: remove and save, the old file URL is 404 | unit, integration, end-to-end |
| FR-4 | Replace and save → new image, old file gone | `updateOwnPoem` test: upload then RPC with the new path; action test: old path removed after the tag; pgTAP: a new path in the own folder replaces the old; web-qa: replace and save | unit, integration, end-to-end |
| FR-4 | Removing a newly picked file → no preview, «Выбрать иллюстрацию», stored not shown again | `IllustrationField` / `usePoemForm` test: `new → remove` ends in `none` | unit |
| FR-4 | Old file can't be removed → save succeeds, failure logged | `updatePoemAction` test: removal fails → result `saved`, log line written | unit |
| FR-4 | Failed update after upload → old image and file kept, new upload removed | `updateOwnPoem` test: RPC failure → `removeIllustrationBestEffort(newPath)`, no old-path removal; pgTAP: a failed call leaves the row unchanged | unit, integration |
| FR-5 | Empty title → message, focus, nothing sent | `EditPoemForm` test: clear title, submit → «Обязательное поле.» under the title, focus on it, action not called | unit |
| FR-5 | Bypassed form with a 10001-character text → nothing stored or uploaded, limit not counted, text named | `updatePoemAction` test: `invalid` with `text` error; allowance, upload, and RPC mocks not called | unit |
| FR-6 | Successful save lands on the poem page with «Изменения сохранены.», new content, original date | `useSavePoem` / `EditPoemForm` test: `saved` → store `{ poemId, kind: "saved" }`, `router.push("/account/poems/<id>")`; `CreatedPoemNotice` test: «Изменения сохранены.» for `saved`; pgTAP: `created_at` unchanged; web-qa: save and check the page | unit, integration, end-to-end |
| FR-6 | Notice only once (reload, link away and back, Back/Forward) | `CreatedPoemNotice` test through `useOneTimeValue` (read once, cleared, reveal with no value shows nothing); web-qa: reload and Back/Forward after a save | unit, end-to-end |
| FR-6 | Back after saving → edit page shows saved values and the back link | `EditPoemContent` test: the form key changes with the stored values; web-qa: save, press Back | unit, end-to-end |
| FR-6 | Sending state; double click sends once | `EditPoemForm` test with a pending action: «Сохранение…», fieldset disabled, second click ignored, one call | unit |
| FR-7 | Eleventh save in a minute → limit message, nothing uploaded, poem unchanged | `updatePoemAction` test: `too-many-saves` → no upload, no RPC, no tag; `EditPoemForm` test: message above the form; pgTAP: `poem_edit` blocks the 11th call | unit, integration |
| FR-7 | Window resets → save succeeds | pgTAP (`write_rate_limits.test.sql`): a window started over a minute ago allows again | integration |
| FR-7 | Field-rule failures don't count | `updatePoemAction` test: schema-invalid input → `consumePoemEditAllowance` not called | unit |
| FR-7 | Genre and file rejections count | `updatePoemAction` test: removed genre and bad file → allowance called once each, before the Contentful call and the file read | unit |
| FR-7 | Separate from the profile limit | pgTAP: 10 `profile_write` calls, then `poem_edit` allowed | integration |
| FR-8 | Server unavailable → alert above the form, focus, values kept, poem unchanged, button enabled | `EditPoemForm` test: `failed: unavailable` → alert text, focus, values kept, button enabled; web-qa: database stopped | unit, end-to-end |
| FR-8 | No automatic retry | `EditPoemForm` test with fake timers: after a failure, no second action call | unit |
| FR-9 | Session expired → `/login` with the notice, poem unchanged; after sign-in `/` | `EditPoemForm` test: `unauthenticated` → session-expired flag, `router.replace("/login")`, `router.refresh()`; existing sign-in tests cover `/`; web-qa: cookies cleared, save, sign in | unit, end-to-end |
| FR-10 | Deleted in another tab → `/account/poems` with «Произведение уже удалено.» | `EditPoemForm` test: `not-found` → deleted-notice store `already-deleted`, `router.replace("/account/poems")`; pgTAP: unknown id → `not-found`; web-qa: two tabs | unit, integration, end-to-end |
| FR-10 | Profile no longer public → hint above the form, focus, values kept, URL unchanged, poem unchanged | `updatePoemAction` test: not public → `failed: not-public`, no upload, no RPC; `EditPoemForm` test: the hint text, focus, no navigation; web-qa: clear the last name in a second tab, save | unit, end-to-end |
| FR-11 | Slow connection on the edit page → slow notice, save disabled, fields editable; normal again when the estimate improves | `useConnectionStatus` test (`2g`, `slow-2g`, `rtt` 1001 → `slow`; `change` event back to `4g` → `online`); `ConnectionNotice` test (slow text); `EditPoemForm` test with the hook mocked `slow` then `online`; web-qa: DevTools throttling in Chromium | unit, end-to-end |
| FR-11 | No estimate available → no notice, usual button rules | `useConnectionStatus` test: no `navigator.connection` → `online`; `ConnectionNotice` renders nothing | unit |
| FR-11 | Going offline on the edit page → offline notice, save disabled, typing works | `useConnectionStatus` test (`offline` event); `EditPoemForm` test with the hook `offline`; web-qa: DevTools offline | unit, end-to-end |
| FR-11 | Coming back online → notice gone, save enabled | `useConnectionStatus` test (`online` event); `EditPoemForm` test | unit |
| FR-11 | Add form offline → notice, «Добавить произведение» disabled | `NewPoemForm` test with the hook `offline` and `slow`; web-qa | unit, end-to-end |
| FR-11 | Connection lost during a save → offline notice, no alert, values kept; online again → notice gone, save enabled, no alert | `EditPoemForm` and `NewPoemForm` tests: rejected call while the latest status is `offline` → no alert; status back to `online` → no notice, no alert; rejected while `online` → unknown alert | unit |
| FR-12 | Round trip by link keeps «Черновик» and the save button | web-qa: edit, breadcrumb to the poem, «Редактировать произведение» back | end-to-end |
| FR-12 | Round trip by Back and Forward keeps the changed text | web-qa: edit, Back, Forward | end-to-end |
| FR-12 | Reload starts fresh | web-qa: reload, confirm leaving, stored values shown | end-to-end |
| FR-13 | Header link blocked → URL unchanged, dialog opens; after «Продолжить редактирование» changes kept | `useLeaveGuard` test: disallowed same-origin anchor click is prevented and calls `onBlocked`; `LeaveBlockedDialog` test; web-qa: «Наши авторы» in the header | unit, end-to-end |
| FR-13 | Sign-out blocked → dialog, still signed in, changes kept | leave-block store test; `useLeaveGuard` test (registers its block while active); `SignOutButton` test: block set → action not called, block called; web-qa | unit, end-to-end |
| FR-13 | Poem page allowed → navigates, no dialog | `useLeaveGuard` test: allowed pathname passes untouched; web-qa: breadcrumb to the poem title | unit, end-to-end |
| FR-13 | Closing the tab or reloading → browser confirmation | `useLeaveGuard` test: `beforeunload` event `defaultPrevented` while active; web-qa: reload shows the confirmation | unit, end-to-end |
| FR-13 | Leaving while the save is sending → blocked, confirmation on close; after success lands on the poem page | `EditPoemForm` test: guard active while pending, inactive after `saved` before `router.push`; web-qa: slow request, click a header link | unit, end-to-end |
| FR-13 | Unchanged form → nothing blocked | `useLeaveGuard` test: inactive adds no listener; `EditPoemForm` test: guard inactive initially | unit |
| FR-13 | Ctrl/Cmd-click opens a new tab, no dialog | `useLeaveGuard` test: modifier and middle clicks, `target="_blank"`, `download`, external origin pass | unit |
| FR-14 | Title change shows on `/account/poems` and the public author page | `updatePoemAction` test: `updateTag(poemsTag(authorId))` on `saved`; web-qa: both lists after a rename | unit, end-to-end |
| FR-14 | Guest after reload sees new content | web-qa: second browser context reloads the public poem page | end-to-end |
| NFR-4 | Dialog focus moves in on open and back to the header link on close | `LeaveBlockedDialog` / `EditPoemForm` test: focus inside on open, back to the previously focused element on close; web-qa keyboard pass | unit, end-to-end |
| NFR-6 | No colour literals or arbitrary colour classes | static check (task 6.3) over new and changed component files | unit |
| NFR-7 | Copy matches the table | tests assert each string verbatim against `poem-management-messages.ts` and `ConnectionNotice`; web-qa reads each state | unit, end-to-end |
| NFR-1 [NFR-1] | Update operation for the owner: four fields change, path cleared, old path answered, id/author/date unchanged | pgTAP (`poems.test.sql`) | integration |
| NFR-1 [NFR-1] | Update operation for anyone else: unchanged; B gets the unknown-id answer; guest rejected | pgTAP: author B → `not-found`; anon has no execute | integration |
| NFR-1 [NFR-1] | Non-public own profile → unchanged, unknown-id answer | pgTAP | integration |
| NFR-1 [NFR-1] | Path in another author's folder → rejected, unchanged | pgTAP: 23514 and the row unchanged | integration |
| NFR-1 [NFR-1] | Direct table update changes nothing (carried "Update and delete" scenario, now for any role) | pgTAP: `update poems` as `authenticated` and `anon` affects no row | integration |
| NFR-2 [NFR-2] | `"use client"` only in the listed modules | static check (task 6.3) | unit |
| NFR-3 [NFR-3] | No cross-feature imports; no `navigator.onLine` / `navigator.connection` outside `shared/`; no `beforeunload` outside the leave guard | static check (task 6.3); existing boundary lint | unit |
| NFR-3 [NFR-3] | Both forms render `PoemFormFields` and use `usePoemForm`, declaring no draft state themselves | static check (task 6.3) | unit |
| NFR-8 [NFR-9] | Build without env exits 0; the route list adds `/account/poems/[poemId]/edit` with the management marker, others unchanged | `npm run build` with no Supabase or Contentful env, route list compared (task 7.6) | integration |
| NFR-5 [NFR-10] | Failed update, upload, and old-file removal logs carry no title, text, id, path, user or profile id | `updateOwnPoem` and `updatePoemAction` tests: captured `console.error` lines checked for each value | unit |

## author-poems

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| FR-14 | Guest reloads the poem page → new heading, no image, unchanged date | web-qa: second browser context; `updatePoemAction` test for the tag expiry | end-to-end, unit |
| FR-14 | Author page list shows the new title | web-qa: guest loads the author page after a rename | end-to-end |

## author-profiles

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| FR-11 | Offline while editing a name → notice above the fields, «Сохранить» and «Удалить» disabled, draft kept | `AuthorProfileEditor` test with the hook `offline`: notice shown; `FieldEditActions` and `FieldActions` tests: buttons disabled; web-qa: DevTools offline on `/account/author` | unit, end-to-end |
| FR-11 | Slow connection → slow notice, «Сохранить» disabled | `AuthorProfileEditor` and `FieldEditActions` tests with the hook `slow` | unit |
| FR-11 | Back online → notice gone, «Сохранить» enabled | `AuthorProfileEditor` and `FieldEditActions` tests: `offline` then `online` | unit |
| FR-7 | `poem_edit`: first 10 allowed, 11th not | pgTAP (`write_rate_limits.test.sql`) | integration |
| FR-7 | Other scopes unchanged after `poem_edit` is used up | pgTAP: `profile_write` still allowed; existing scope tests green | integration |

## breadcrumbs

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| FR-15 | Own poem: «Главная» › «Мастерская поэта» › «Управление произведениями» › title › «Редактирование», title links to the poem page | `matchRoute` test for `/account/poems/<id>/edit` → `own-poem-edit`; trail build test with the title read; web-qa | unit, end-to-end |
| FR-15 | Not the author's poem → no trail | trail test: title read `not-found` → no trail | unit |

## auth

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| FR-13 | Unsaved changes → no sign-out request, dialog opens, header still shows «Выйти» | `SignOutButton` test: block set → `signOutAction` not called, block called; web-qa | unit, end-to-end |
| FR-13 | No unsaved changes → signed out as before | `SignOutButton` existing tests unchanged with the store empty | unit |

## Carried over unchanged

`poem-management` NFR-1 (direct insert, create for the caller, non-public insert, delete operation
for the owner and for anyone else, another author's illustration, hidden author), NFR-10 (failed
insert, failed delete and cleanup logs): their existing pgTAP and unit tests stay as they are and
must stay green.

Coverage: 77 criteria across five capabilities; every scenario has at least one row.
