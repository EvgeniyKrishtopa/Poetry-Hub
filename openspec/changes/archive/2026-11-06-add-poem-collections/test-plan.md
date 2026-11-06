# Test Plan

One row per acceptance criterion (a scenario's THEN) in this change's spec deltas. Levels:
**unit** (one module, its collaborators mocked), **integration** (a real local service: the
Supabase database, or a full Next build), **end-to-end** (a real browser against the dev server,
Gate 3 and recorded scenarios). Requirement IDs are this change's (`proposal.md`); a MODIFIED block
of an existing capability names its own ID in brackets.

## collection-management

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| FR-3 | Blank title: no request, «Обязательное поле.» under the title, focus on it | `NewCollectionForm` test: blank and spaces-only title → action not called, error text tied by `aria-describedby`, title focused; `collectionFormSchema` test: blank after trim → required | unit |
| FR-3 | 81-char title and 1001-char description: no request, both errors, focus on the title | `collectionFormSchema` test: limits counted in code points after CRLF normalization and trim (astral characters, 80/81, 1000/1001); `NewCollectionForm` test: both errors, focus on the first invalid field | unit |
| FR-3 | Server repeats the checks: a bypassed blank title stores nothing, answers `invalid` | `createCollectionAction` test: blank title → `invalid` with the title error, no session read, no RPC; pgTAP: the table check rejects a blank and an 81-char title, a 1001-char and an `''` description | unit, integration |
| FR-3 | Sending: «Создание…», form disabled, a double click creates once | `NewCollectionForm` test: pending → button text, fieldset disabled, second submit while in flight → one action call | unit |
| FR-3 | Profile not public: the not-public text and link, no form | `NewCollectionContent` test: `not-public` → `CollectionNotPublicNotice` with «Перейти к профилю автора» (`/account/author`), no form; profile read failure → throws | unit |
| FR-4 | Created: on `/account/poems` with «Сборник «<title>» создан.», listed; Back doesn't return to the filled form | `NewCollectionForm` test: `created` → list notice store `{ created, title }`, `router.replace(POEM_MANAGEMENT_PATH)`; `createCollectionAction` test: `created` → `refresh()` called, normalized title returned; pgTAP: create stores trimmed values for the caller's own profile; web-qa: create, the notice, the section lists it, Back lands on the page before the create form | unit, integration, end-to-end |
| FR-4 | Notice shows once: gone after a reload, collection still listed | `CollectionListNotice` test: shows the snapshot once and clears the store; web-qa: reload shows no notice | unit, end-to-end |
| FR-4 | Service unavailable: alert above the button, focused, values kept | `NewCollectionForm` test: `failed: unavailable` → alert text, `role="alert"`, position before the submit, focus, both drafts kept; `createOwnCollection` test: a 5xx classifies as `unavailable` | unit |
| FR-4 | Session expired: nothing stored, `/login` with the notice once | `NewCollectionForm` test: `failed: unauthenticated` → `markSessionExpired`, `router.replace(SIGN_IN_PATH)`, `router.refresh`; `createCollectionAction` test: `signed-out` → `failed: unauthenticated`, no RPC; web-qa: cookies cleared, then submit | unit, end-to-end |
| FR-5 | 51st collection in 30 days (10 of them deleted): nothing stored, the limit message | pgTAP: 50 creations then 10 deletes → the 51st answers `over-limit`, row count unchanged; the creation log prunes past 30 days; `createCollectionAction` test: `over-limit` → `failed: too-many-collections`; `NewCollectionForm` test: the limit text in the alert | integration, unit |
| FR-6 | Own collection: heading, description paragraph, both buttons, edit first | `CollectionContent` test: `<h1>` title, `<p>` description, `EditCollectionButton` before `DeleteCollectionButton`, edit link `href` | unit |
| FR-6 | Line breaks: two paragraphs, the first on two lines | `CollectionContent` test: `splitParagraphs` output as two `<p>`, the first keeping its `\n` with `whitespace-pre-line` | unit |
| FR-6 | No description: no empty paragraph | `CollectionContent` test: `null` description → no `<p>` | unit |
| FR-6 | Another author's collection: 404 | `getOwnCollection` test: no row → `not-found`, malformed id → `not-found` with no query, non-public profile → `not-found`; `CollectionContent` test: `not-found` → `notFound()`; pgTAP: another author's row invisible | unit, integration |
| FR-6 | Read fails: the generic error screen | `getOwnCollection` test: query error and profile read failure → `unavailable`; `CollectionContent` test: `unavailable` → throws | unit |
| FR-7 | Filled form: heading, stored title, stored description | `EditCollectionContent` test: the form gets the stored values (`null` → empty text area) and the digest key; `EditCollectionPage` test: heading «Редактирование сборника» | unit |
| FR-7 | Another author's collection: 404 | `EditCollectionContent` test: `not-found` → `notFound()`, `unavailable` → throws | unit |
| FR-8 | Only spaces added: back link stays, no save button | `isCollectionFormChanged` test: trailing/leading spaces, CRLF vs LF, blank vs `null` description → unchanged; `EditCollectionForm` test: back link shown, no save button | unit |
| FR-8 | Real change then discard: both fields stored, back link shown and focused, no request | `EditCollectionForm` test: change → save and discard shown; discard → drafts reset, errors and alert cleared, back link focused, action not called; discard disabled while sending | unit |
| FR-9 | Saved: on the collection page with «Изменения сохранены.» and the new title | `EditCollectionForm` test: `saved` → saved store `{ collectionId }`, guard off, `router.push(collectionPath)`; `SavedCollectionNotice` test: shown once for the matching id only; `updateCollectionAction` test: `updated` → `refresh()`, `saved`; pgTAP: only title and description change, `id`, `author_id`, `created_at` kept; web-qa: save, notice, new heading | unit, integration, end-to-end |
| FR-9 | Back after a save: the edit page shows saved values and the back link | `EditCollectionContent` test: the key changes with the stored values; web-qa: Back after a save | unit, end-to-end |
| FR-10 | 11th save in a minute: nothing changed, the limit message | pgTAP (`write_rate_limits.test.sql`): `collection_edit` allows 10 per minute, blocks the 11th, other scopes unchanged; `consumeCollectionEditAllowance` test: `false` → `too-many-saves`; `updateCollectionAction` test: no profile read and no RPC over the limit, invalid input counts nothing; `EditCollectionForm` test: the limit text | integration, unit |
| FR-11 | Service unavailable: alert above the form, focused, values kept | `EditCollectionForm` test: `failed: unavailable` → alert before the fields, focus, drafts kept, save enabled; `updateOwnCollection` test: 5xx → `unavailable` | unit |
| FR-11 | Deleted in another tab: `/account/poems` with «Сборник уже удалён.» once | `EditCollectionForm` test: `not-found` → list notice `{ already-deleted }`, `router.replace`; pgTAP: update of an unknown id → `not-found`; web-qa: delete in a second tab, then save | unit, integration, end-to-end |
| FR-11 | Profile no longer public: nothing saved, the not-public alert, values kept | `updateCollectionAction` test: not public → `failed: not-public`, no update RPC; pgTAP: update with a non-public own profile → `not-found`; `EditCollectionForm` test: the alert text | unit, integration |
| FR-11 | Session expired: nothing saved, `/login` with the notice | `EditCollectionForm` test: `failed: unauthenticated` → `markSessionExpired`, `router.replace(SIGN_IN_PATH)`; `updateCollectionAction` test: `signed-out` → nothing counted | unit |
| FR-12 | Header link blocked: the page stays, the dialog opens | the feature's `useLeaveGuard` test: same-origin link outside the allowed paths → default prevented, `onBlocked`; modifier clicks, `target`, external links pass; `CollectionLeaveDialog` test: link form text and button; web-qa: header link while changed | unit, end-to-end |
| FR-12 | The collection page is allowed; Back shows the unsaved values | `useLeaveGuard` test: `collectionPath` and `editCollectionPath` allowed; web-qa: link to the collection page and Back, draft kept | unit, end-to-end |
| FR-12 | Deleted while the draft was hidden: Back shows 404, no unsaved values | web-qa: draft, link to the collection page, delete, Back → 404 page | end-to-end |
| FR-12 | Unchanged form: links navigate with no dialog | `useLeaveGuard` test: inactive → no listener; `EditCollectionForm` test: guard inactive while unchanged, active while changed or sending, off after `saved` | unit |
| FR-12 | `beforeunload` and «Выйти» (the auth rows below) | `useLeaveGuard` test: `beforeunload` prevented while active; registration in the shared leave-block store, cleared on inactive and unmount, a pending question answered `dismissed`; web-qa: reload confirmation | unit, end-to-end |
| FR-13 | Cancel, ×, Escape: closed, nothing deleted, focus on «Удалить сборник» | `DeleteCollectionButton` test: each close path → action not called, opener focused; «Отмена» focused on open | unit |
| FR-13 | Deleted, others remain: notice, only the rest listed | `DeleteCollectionButton` test: `deleted` → list notice `{ deleted, title }`, `router.replace`; `deleteCollectionAction` test: `refresh()` on `deleted` only; pgTAP: delete returns the stored title; web-qa: delete one of two, no 404 flash | unit, integration, end-to-end |
| FR-13 | Last one deleted: notice, no section heading or list | `OwnCollectionsSection` test: zero rows → renders nothing; web-qa: delete the only collection | unit, end-to-end |
| FR-13 | Already deleted: `/account/poems` with «Сборник уже удалён.» once | `DeleteCollectionButton` test: `not-found` → list notice `{ already-deleted }`; pgTAP: delete of an unknown and another author's id → `not-found`, nothing changed | unit, integration |
| FR-13 | Failure: the failure text in the open dialog, collection kept | `DeleteCollectionButton` test: `failed: unavailable` and a rejection while online → text in `role="alert"` inside the dialog, dialog open; sending state holds the dialog open, buttons disabled, one call per double click | unit |
| FR-14 | Offline on the edit form: notice, save disabled, fields editable; back online restores | `EditCollectionForm` test with the connection hook mocked `offline`, `slow`, then `online`: notice text, `disabled` save, editable fields, discard and back link enabled; a rejection while offline → no alert; same for `NewCollectionForm`; web-qa: DevTools offline and slow | unit, end-to-end |
| FR-14 | Offline on the collection page: notice above the buttons, delete `aria-disabled`, edit link works | `CollectionActions` test: notice above the children; `DeleteCollectionButton` test: opener `aria-disabled="true"`, still focusable, click ignored | unit |
| FR-14 | Offline while the delete dialog is open: notice in the dialog, confirm disabled, «Отмена» enabled | `DeleteCollectionButton` test: status `offline` while open → notice inside the dialog, confirm natively `disabled`, cancel enabled; cancel → focus on the `aria-disabled` opener | unit |
| FR-15 | Back after a delete: only `/account/poems` or earlier, none lists it; the old address shows 404 | web-qa: open from `/account/poems`, delete, Back and Forward, then the old URL directly; action tests: `refresh()` after every successful write | end-to-end, unit |
| FR-16 | Guest on any of the three paths: redirect to `/login`, no content | proxy test (existing `/account/*` rule) extended with the three paths; `NewCollectionContent`, `CollectionContent`, `EditCollectionContent` tests: `requireSession()` called before any read, `unknown` → `SessionUnavailableAlert` | unit |
| NFR-1 | Direct calls: anon nothing, another author nothing, direct writes fail, only the owner's function calls change rows | pgTAP (`collections.test.sql`): anon select and execute denied; another author sees no rows; insert, update, delete denied for every role; the three functions resolve the owner from the session; delete works without a public profile | integration |
| NFR-2 | `"use client"` only in the listed modules | `collection-management` `boundaries` test: the client-module list | unit |
| NFR-3 | No import of `poems` or `poem-management`, none back; `navigator.onLine` absent; `beforeunload` only in the guard | `collection-management` `boundaries` test; `poem-management` `boundaries` test's `beforeunload` list gains the collection guard file | unit |
| NFR-4 | Keyboard only: every step works, focus where specified | component tests above for each focus target; `TextAreaField` test: label, `aria-describedby`, `aria-invalid`; `OwnCollectionsSection` test: `<section>` labelled by its `<h2>`; web-qa: keyboard pass over create, edit, delete | unit, end-to-end |
| NFR-5 | Failed save logged with operation and kind only | `write-log` test and DAL tests: the logged line matches `[collection-management] <operation> failed: <kind>` and contains no title, description, or id | unit |
| NFR-6 | No colour literals | `boundaries` test: no hex, `rgb(`, `hsl(` in the feature and `TextAreaField` | unit |
| NFR-7 | Copy matches the proposal's table | messages test: every key against the table's text; task 8.4 comparison | unit |
| NFR-8 | Build lists the three routes as partially prerendered | `npm run build` route list (task 8.4) | integration |

## poem-management

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| FR-1 [poem-management FR-2] | Author with poems: both links in one row, add first; the poem list; no collections heading | `MyPoemsContent` test: `actions` rendered after «Добавить новое произведение» in the row; route-file test: `CreateCollectionLink` in `actions` with `href` `/account/poems/collections/new`; `OwnCollectionsSection` test: zero rows → nothing | unit |
| FR-1 [poem-management FR-2] | Author without poems or collections: heading and both links, no list | `MyPoemsContent` test (existing case plus `actions`); `OwnCollectionsSection` test: zero rows → nothing | unit |
| FR-2 [poem-management FR-2] | Author with collections: section between the row and the poem list, newest first, links | `OwnCollectionsSection` test: `<h2>`, order by the DAL, `href` per id; `listOwnCollections` test: `created_at desc, id`; `MyPoemsContent` test: `beforeList` between the row and the list | unit |
| FR-2 [poem-management FR-2] | Collections read fails: both links, the section alert, the poem list | `OwnCollectionsSection` test: failure → `role="alert"` text, no heading; `MyPoemsContent` test: slots and list independent | unit |
| FR-2 [poem-management FR-2] | Only own poems and collections | existing poem test; pgTAP: RLS shows only own collections; `listOwnCollections` test: filtered by the author id | unit, integration |
| FR-2 [poem-management FR-2, FR-3] | Profile without a last name: no create-collection link, no section | `MyPoemsContent` test: not-public branch renders neither `actions` nor `beforeList`; `notices` still rendered by `MyPoemsPage` | unit |
| NFR-3 [poem-management NFR-3] | No import between the two features; `authors` imports neither; `beforeunload` only in the two guards | `poem-management` `boundaries` test extended: no `@/features/collection-management`; `authors` boundaries case extended | unit |
| NFR-3 [poem-management NFR-3] | One form implementation for poems | existing test, unchanged | unit |

## breadcrumbs

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| FR-17 | Create page trail, «Управление произведениями» a link | `matchRoute` test: `STATIC_ROUTES` row for `NEW_COLLECTION_PATH`; trail test for its items | unit |
| FR-17 | Collection page and edit page trails, the title linking on the edit page | `matchRoute` test: `own-collection` and `own-collection-edit` matches; trail tests with `getOwnCollectionTitle` mocked; `breadcrumbs-slot` test: the three slot pages exist; web-qa: both trails | unit, end-to-end |
| FR-17 | Not the author's collection: no trail | trail test: `not-found` and `unavailable` → no trail; `matchRoute` test: extra segments → no match | unit |

## auth

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| FR-12 [auth edit-poem FR-13] | Collection edit form changed, «Выйти» then «Продолжить редактирование»: no sign-out, changes kept | `EditCollectionForm` test: the registered question opens the sign-out form, `stay` answered; existing `SignOutButton` tests unchanged (the store contract is the same); web-qa | unit, end-to-end |
| FR-12 [auth edit-poem FR-13] | «Выйти без сохранения»: one sign-out request | `EditCollectionForm` test: `leave` answered; web-qa: signed out once | unit, end-to-end |
| FR-12 [auth edit-poem FR-13] | Confirmed, sign-out fails: dialog closed, failure shown, still signed in, changes kept | `EditCollectionForm` test: guard stays active after `leave`; existing `SignOutButton` failure tests | unit |
| FR-12 [auth edit-poem FR-13] | No unsaved changes: signs out with no dialog | `useLeaveGuard` test: inactive → nothing registered; existing `signOutWithConfirmation` test (no guard → sent) | unit |
