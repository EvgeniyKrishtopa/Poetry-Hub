# Test Plan

One row per acceptance criterion (a scenario's THEN) in this change's spec deltas. Levels:
**unit** (one module, its collaborators mocked), **integration** (a real local service: the
Supabase database, or a full Next build), **end-to-end** (a real browser against the dev server,
Gate 3 and recorded scenarios). Requirement IDs are this change's (`proposal.md`); a MODIFIED block
of an existing capability names its own ID in brackets. A criterion carried over unchanged inside a
MODIFIED block is closed by its existing test, which must keep passing.

## collection-management

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| FR-2 [FR-6] | Own collection, empty, no free poems: heading, paragraph, edit and delete; no «Произведения», no manage button | `CollectionContent` test: choices `[]` → no `CollectionPoemList` heading, `CollectionActions` without `manageCollectionId` | unit |
| FR-2 [FR-6] | Collection with poems: «Произведения» and links in order between description and row; row edit → manage → delete | `CollectionPoemList` test: order as given, `href` from `ownPoemPagePath`; `CollectionContent` test: placement after the description; `CollectionActions` test: button order | unit |
| FR-2 [FR-6] | Empty collection, free poems: manage button shown, no «Произведения» | `CollectionContent` test: choices with one unselected → button, no list | unit |
| FR-2 [FR-6] | Every poem elsewhere: no button on the empty collection; button on the collection holding them | `CollectionContent` test: `[]` vs selected-only choices; pgTAP: `my_collection_poem_choices` returns nothing for the empty collection and the selected rows for the other | unit, integration |
| [FR-6] | Line breaks, no description, another author's → 404, read fails → error screen | existing `CollectionContent` tests, unchanged; new case: choices read `{ ok: false }` → throws | unit |
| FR-9 [FR-14] | Offline on the edit form, the collection page, the delete dialog | existing tests, unchanged; `ManageCollectionPoemsButton` test: `aria-disabled="true"` while offline, focusable, press ignored | unit |
| FR-9 [FR-14] | Offline on the poems page: notice above the list, boxes and save disabled, checked box stays; re-enabled online | `CollectionPoemsForm` test: status `offline` → notice, every checkbox and the button `disabled`, draft kept; back `online` → enabled | unit |
| FR-9 [FR-14] | Slow on the poems page: slow notice, everything frozen | `CollectionPoemsForm` test: status `slow` | unit |
| FR-9 [FR-14] | Connection drops during a save: offline notice, no alert, selection kept | `CollectionPoemsForm` test: action rejects while the status ref is `offline` → no alert, draft kept | unit |
| FR-9 [FR-14] | All of the above in a browser | web-qa: offline and slow on the collection page and the poems page | end-to-end |
| FR-13 [FR-16] | Guest on any of the four paths → `/login`, no content | `proxy` test for `/account/poems/collections/<id>/poems`; `CollectionPoemsContent` test: `requireSession()` called first | unit |
| NFR-2 | Only the listed modules are client modules | `collection-management` boundaries test: client-module list | unit |
| NFR-8 | Build lists the four routes as partially prerendered | `npm run build` output check (task 7.3) | integration |
| NFR-3 [NFR-3] | No imports of `poems`/`poem-management`, no `navigator.onLine`; `beforeunload` only in `hooks/use-leave-guard.ts` | `collection-management` boundaries test (expected path updated) | unit |
| FR-1 | Deleting a collection frees its poems | pgTAP: delete a collection → its poems keep `author_id`, `collection_id` null; web-qa: freed poem listed unchecked on another collection's page | integration, end-to-end |
| FR-1 | Deleting a poem takes it out of its collection | pgTAP: `delete_my_poem` on a collected poem → `my_collected_poems` no longer returns it | integration |
| FR-1 | A new poem is free | pgTAP: `create_my_poem` → `collection_id` null; `my_collection_poem_choices` lists it unselected | integration |
| FR-1 | Public pages unchanged | pgTAP: `anon` selects the pre-change column list unchanged, `collection_id` rejected; existing public poem tests pass | integration, unit |
| FR-3 | Opens the page; Back returns to the collection page | `ManageCollectionPoemsButton` test: `ready` → `router.push(collectionPoemsPath(id))`; `checkCollectionPoemsAction` test: non-empty choices → `ready`; web-qa: press, then Back | unit, end-to-end |
| FR-3 | Collection deleted: stays, «Сборник уже удалён.» under the row | action test: `getOwnCollection` `not-found` → `not-found`, no choices read; button and `CollectionActions` tests: alert below the row, `role="alert"`, focus on the button | unit |
| FR-3 | Nothing left: «Нет свободных произведений…» under the row | action test: choices `[]` → `nothing-to-manage`; button test: alert text | unit |
| FR-3 | Check fails: «Не удалось открыть…» | action test: collection or choices read failure → `failed: unavailable`; button test: that alert, also on a rejected call | unit |
| FR-3 | Session expired → `/login` with the notice | action test: `requireSession` unauthenticated → `failed: unauthenticated`; button test: `markSessionExpired`, `router.replace(SIGN_IN_PATH)` | unit |
| FR-4 | Collection and free poems: heading, hint, two boxes in order, other collection's poem absent, no save button | `CollectionPoemsContent` test: hint with the title; `CollectionPoemsForm` test: order and checked states as given, no button; pgTAP: choices exclude poems of another collection, order `created_at desc` | unit, integration |
| FR-4 | Nothing to manage: text and back link, no checkbox | `CollectionPoemsForm` test: `choices = []` → text and `ButtonLink` to the collection page | unit |
| FR-4 | Another author's collection → 404 | `CollectionPoemsContent` test: `getOwnCollection` `not-found` → `notFound()` | unit |
| FR-4 | Read fails → error screen | `CollectionPoemsContent` test: collection or choices read failure → throws | unit |
| FR-5 | One poem added → save shown and enabled | `isSelectionChanged` test; `CollectionPoemsForm` test: check a free poem → button enabled | unit |
| FR-5 | One poem removed → save shown | `CollectionPoemsForm` test: uncheck a selected poem | unit |
| FR-5 | Back to stored → no save button | `isSelectionChanged` test: same set in another order → unchanged; form test: check then uncheck → no button | unit |
| FR-5 | Back/Forward restores the saved state; a reload opens fresh | web-qa: save, Back, Forward → notice, disabled button, link; reload → none | end-to-end |
| FR-6 | Saved: stays, notice and link, button disabled, boxes show the stored selection; collection page lists the new set | `selectionDiff` test; action test: `saved` → `refresh()`; `use-collection-poems-form` test: `draft` reset inside the transition, `justSaved`; form test: notice `role="status"`, link, disabled button; pgTAP: save adds and removes; web-qa: collection page afterwards, no flash of the old selection | unit, integration, end-to-end |
| FR-6 | Sending: «Сохранение…», boxes disabled, one save on a double click | form test: pending → text, every checkbox `disabled`, second click sends nothing | unit |
| FR-6 | Change after a save hides notice and link, enables the button | form test: toggle after `saved` | unit |
| FR-7 | Eleventh save in a minute: nothing changed, the limit alert | action test: allowance `false` → `failed: too-many-saves`, no RPC; form test: alert text; pgTAP (`write_rate_limits.test.sql`): `collection_poems_save` 10 per minute | unit, integration |
| FR-8 | Unavailable: alert above the list, focused, selection kept | DAL test: 5xx → `unavailable`; form test: alert placement, focus, draft kept, button enabled | unit |
| FR-8 | Poem taken meanwhile: nothing saved, stale alert, list without it, stored selection | pgTAP: `stale` on a poem in another collection, another author's poem, a removed poem not in this collection, a deleted poem, with nothing written when one of several is bad; action test: `stale` → `refresh()`; form test: stale alert, `draft = null`; web-qa: two tabs | integration, unit, end-to-end |
| FR-8 | Stale save empties the list: alert above the empty-state text and link | form test: `stale` then `choices = []` → alert stays above the text | unit |
| FR-8 | Collection deleted meanwhile → `/account/poems` with «Сборник уже удалён.» | pgTAP: unknown and another author's collection → `not-found`; form test: `setListNotice({ kind: "already-deleted" })`, `router.replace(POEM_MANAGEMENT_PATH)` | integration, unit |
| FR-8 | Profile no longer public: not-public alert, selection kept | action test: `getOwnPublicAuthor` not public → `failed: not-public`, no RPC; pgTAP: non-public profile → `not-found` | unit, integration |
| FR-8 | Session expired → `/login` | action test: unauthenticated; form test: `markSessionExpired`, `router.replace` | unit |
| FR-10 | Save, then leave → stored and on the link's page | prompt test: `saved` → guard off, `router.push(href)`; web-qa | unit, end-to-end |
| FR-10 | Leave without saving → link's page, nothing stored | prompt test: `router.push(href)`, no action call | unit |
| FR-10 | Stay → dialog closes, selection kept, focus on the link | prompt test: «Остаться», ×, Escape → focus back on the opener | unit |
| FR-10 | Save from the dialog fails → dialog closes, alert on the page, selection kept | prompt test: `failed: unavailable` → closed, form alert shown | unit |
| FR-10 | Link clicked while a save is sending → waiting dialog, one save, then the link | prompt test: opened with a pending save → «Сохранение…», all buttons disabled, Escape ignored, no second action call, push on `saved` | unit |
| FR-10 | Offline dialog: save disabled, focus on «Остаться» | prompt test: status `offline` on open | unit |
| FR-10 | Unchanged selection → no dialog | moved guard test: `active` false → link navigates; form test: guard inactive after `saved` | unit |
| FR-10 | The moved guard passes the link's relative path | moved guard test: `onBlocked` receives `pathname + search + hash` | unit |
| FR-12 | Back after a save: collection page lists the poem; another collection's page doesn't | action test: `refresh()` on `saved`; web-qa: Back after a save, then the other collection's poems page | unit, end-to-end |
| FR-12 | Kept page with an unsaved draft over a fresh list | form test: new `choices` props with a non-null draft → a vanished poem has no box, the rest of the draft stays checked; web-qa: two collections, Back/Forward | unit, end-to-end |
| NFR-1 | Direct selects and updates of `collection_id` fail; `anon` can call nothing; others' ids answer `not-found`/`stale`; a save with one bad poem changes nothing | pgTAP (`collection_poems.test.sql`): as `anon`, another author, the owner; composite key rejects a cross-author membership; concurrent-save locking; 22023 input guard (1000 pass, 1001 fail); profile deletion with collected poems succeeds | integration |
| NFR-4 | Keyboard only: open, toggle with Space, save, leave via the dialog | form test: `<fieldset>` with `<legend>` «Произведения», each `<label>` tied; dialog test: accessible name; web-qa keyboard pass | unit, end-to-end |
| NFR-5 | A failed save logs operation and failure kind only | DAL tests: log line matches `[collection-management] <operation> failed: <kind>` and holds no id or title | unit |
| NFR-6 | No colour literals | boundaries test: no hex, `rgb(`, `hsl(` in the feature | unit |
| NFR-7 | Copy matches the proposal table | messages module compared with the table (task 7.3); component tests assert texts from the module | unit |

## poem-management

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| [FR-2] | Author with poems, without poems, with collections, collections read fails, only own poems | existing `MyPoemsContent` / `OwnCollectionsSection` tests, unchanged | unit |
| FR-11 [FR-2] | Collections with their poems: nested links in order, title-only collection, poem list still lists all | `OwnCollectionsSection` test: grouping by `collectionId`, order, `href`, no nested list when empty; collected poems read failing → section alert; pgTAP: `my_collected_poems` returns only own collected poems; web-qa | unit, integration, end-to-end |
| [NFR-1] | Existing database scenarios (insert, create, update, delete, illustration, hidden author) | existing pgTAP tests, unchanged | integration |
| NFR-1 [NFR-1] | `collection_id` not readable directly by any role; old columns still select | pgTAP: select of `collection_id` as `anon`, another author, the owner → permission denied; pre-change column list selects | integration |
| NFR-1 [NFR-1] | Editing keeps the collection | pgTAP: `update_my_poem` on a collected poem → same `collection_id` | integration |
| NFR-3 [NFR-3] | Static check and one form implementation | `poem-management` boundaries test with the moved guard path; existing form test unchanged | unit |

## breadcrumbs

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| [FR-17] | Create page, collection and edit pages | existing trail tests, unchanged | unit |
| FR-14 [FR-17] | Not the author's collection: no trail on the page, edit page, or poems page | `matchRoute` / trail test: `own-collection-poems` with a `not-found` title → no trail | unit |
| FR-14 [FR-17] | Poems page trail ends «Осенний цикл» (link) › «Произведения сборника» (current) | trail test for `own-collection-poems`; `app/tests/breadcrumbs-slot.test.ts` finds the slot page | unit |

## auth

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| [edit-poem FR-13] | Stays, confirms, sign-out fails, no unsaved changes | existing sign-out and edit-form tests, unchanged | unit |
| FR-10 [edit-poem FR-13] | Poems page: save then sign out → stored, exactly one sign-out | prompt test: sign-out form, `saved` → answer `leave` before `setDraft(null)`; a draft reset before the dialog's `close` event still yields one `leave`; web-qa | unit, end-to-end |
| FR-10 [edit-poem FR-13] | Poems page: save fails → no sign-out, dialog closes, alert, selection kept | prompt test: `failed` → answer `dismissed`, form alert | unit |
| FR-10 [edit-poem FR-13] | «Выйти» while a save is sending → waits, signs out only on success | prompt test: sign-out form opened with a pending save | unit |
