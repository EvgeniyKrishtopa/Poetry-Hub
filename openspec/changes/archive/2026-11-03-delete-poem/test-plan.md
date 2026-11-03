# Test Plan

One row per acceptance criterion (a scenario's THEN) in this change's spec deltas. Levels:
**unit** (one module, its collaborators mocked), **integration** (a real local service: the
Supabase database, Storage, or a full Next build), **end-to-end** (a real browser against the dev
server, Gate 3 and recorded scenarios). Scenarios a MODIFIED block carries over unchanged keep their
existing tests and are listed once at the end.

## poem-management

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| FR-1 | Owner's poem page shows «Удалить произведение» below the poem | `OwnPoemContent` test: `ok` result renders `PoemArticle` then `DeletePoemButton` with the poem's id and title | unit |
| FR-1 | Not on the public poem page or `/account/poems` | `PoemPageContent` and `MyPoemsContent` tests: no button named «Удалить произведение»; static check that `DeletePoemButton` is rendered only by `OwnPoemContent` | unit |
| FR-1 | No button without the poem (another author's id → 404) | `OwnPoemContent` test: `not-found` calls `notFound()` and renders no button | unit |
| FR-2 | Dialog opens titled «Удалить произведение?», body names the title, focus on «Отмена», nothing sent | `DeletePoemButton` test: open → dialog name, body text, `document.activeElement` is «Отмена», action mock not called | unit |
| FR-2 | Each cancel path (Отмена, corner button, Escape, backdrop) closes, deletes nothing, focus back on the opener | `DeletePoemButton` test, one case per path: action not called, dialog closed, opener focused; `Dialog` test for backdrop and Escape with `closable` true | unit |
| FR-3 | Successful delete lands on `/account/poems` with «Произведение «Первый снег» удалено.», list without the poem | `DeletePoemButton` test: `deleted` → store `{deleted, title}`, `router.replace("/account/poems")`; `DeletedPoemNotice` test: renders the text | unit |
| FR-3 | Poem row and illustration file are gone | pgTAP: owner's `delete_my_poem` removes the row and returns the path; action test: `removeIllustrationBestEffort` called with the returned path after `updateTag`; web-qa: delete a poem with an illustration, the file URL is 404 | integration, unit, end-to-end |
| FR-3 | Sending state: «Удаление…», all three controls disabled, Escape leaves it open | `DeletePoemButton` test with a pending action; `Dialog` test: `closable={false}` disables the corner button, prevents `cancel`, and re-opens on a forced close; web-qa: Escape twice while pending | unit, end-to-end |
| FR-3 | Double click sends one request | `DeletePoemButton` test: two synchronous clicks → action called once | unit |
| FR-3 | Illustration removal fails → still deleted, notice shown, failure logged | `delete-poem-cleanup.actions` test (real cleanup helper): Storage remove rejects → result `deleted`, `console.error` with the operation and kind only; `illustration-cleanup` test: a returned or thrown Storage error is swallowed and logged by kind; action test: a throwing helper still answers `deleted` | unit |
| FR-3 | Notice not shown again after reload, link away and back, Back/Forward | `use-one-time-value` test: cleared store, Activity hide dismisses, Strict Mode re-run keeps it; `DeletedPoemNotice` test: second mount with an empty store renders nothing; web-qa: reload and Back/Forward | unit, end-to-end |
| FR-3 | Back from `/account/poems` skips the deleted poem's page | `DeletePoemButton` test: `replace`, not `push`; web-qa: Back after a delete | unit, end-to-end |
| FR-4 | Deleted in another tab → `/account/poems` with «Произведение уже удалено.» | action test: RPC `not-found` → `not-found`, no tag expired; `DeletePoemButton` test: `not-found` → `{already-deleted}` and `router.replace`; web-qa: two tabs | unit, end-to-end |
| FR-4 | Another author's poem stays; same answer as a missing poem | pgTAP: author B's call on A's poem → `not-found`, row kept; unknown id → identical answer | integration |
| FR-5 | Database unreachable → alert in the dialog (`role="alert"`), page unchanged, poem exists | `poem-delete` test: 5xx / network → `unavailable`; `DeletePoemButton` test: `failed` → alert text, dialog open, no navigation; web-qa: stop the database and confirm | unit, end-to-end |
| FR-5 | Reopened after a failure → no alert | `DeletePoemButton` test: failure, «Отмена», open again → no alert | unit |
| FR-5 | Retry hides the alert while sending and succeeds | `DeletePoemButton` test: failure then pending → alert gone; then `deleted` → navigation | unit |
| FR-6 | Expired session → poem kept, lands on `/login` with «Сессия истекла. Войдите снова.» | action test: signed-out → `unauthenticated`, no RPC; `poem-delete` test: rejected JWT → `unauthenticated`; `DeletePoemButton` test: flag set, `router.replace("/login")`, `router.refresh()`; web-qa: clear the auth cookies, then confirm (header shows signed-out links) | unit, end-to-end |
| FR-7 | Refreshable session → deleted as usual | action test: `getSessionState` signed-in after a refresh → RPC runs, `deleted`; web-qa: expire the access-token cookie only, keep the refresh token, then confirm | unit, end-to-end |
| FR-8 | Author page doesn't list the poem; poem URL is 404 after a delete | action test: `updateTag(poemsTag(authorId))` exactly once on `deleted`, never on `not-found` or failure; web-qa: cached author page and poem page, delete, then open both | unit, end-to-end |
| FR-9 (FR-6) | 100 creations then 10 deletes → over-limit, nothing stored, from the form and directly | pgTAP: `poem_creations` filled by the trigger; 100 creations, 10 deletes → `create_my_poem` and `can_create_poem` answer `over-limit`, no row added | integration |
| NFR-1 | Direct update and delete on the table change nothing | pgTAP: `delete from poems` and `update poems` as the owner affect 0 rows / are rejected | integration |
| NFR-1 | Owner's delete operation deletes and names the illustration path | pgTAP: `delete_my_poem` returns `deleted` with `author_id` and `illustration_path` | integration |
| NFR-1 | Another author and a guest can't delete via the operation | pgTAP: B → `not-found`, row kept; anon → permission denied | integration |
| NFR-1 | Another author's illustration can't be removed through Storage | pgTAP: storage.objects delete as B in A's folder removes nothing | integration |
| NFR-2 | `"use client"` only in the form, created notice, delete button and dialog, deleted notice | static check in `poem-management` tests (search for the directive in the feature and the route folder) | unit |
| NFR-3 | `poems`, `authors`, `auth` don't import `@/features/poem-management` | static import check; lint's boundary rule | unit |
| NFR-4 | Dialog is a modal named «Удалить произведение?», Tab stays inside | `Dialog` test: `aria-labelledby` names the title, `showModal` used; web-qa: Tab cycles inside | unit, end-to-end |
| NFR-4 | Focus on «Удалить» after a failure | `DeletePoemButton` test | unit |
| NFR-4 | Deleted notice is `role="status"` | `DeletedPoemNotice` test | unit |
| NFR-5 (NFR-10) | Failed delete and cleanup logs carry no title, poem id, path, user or profile id | `poem-delete` and action tests: assert the logged lines against the title, the id, the path, and the profile id | unit |
| NFR-6 | No colour literals in new and changed component files | literal search in the static check; `Button` test: `danger` variant uses token classes | unit |
| NFR-7 | Every string matches the UI copy table | `DeletePoemButton`, `DeletedPoemNotice` tests assert the strings verbatim from the table | unit |

## author-poems

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| FR-8 (NFR-4) | Public pages after a delete: list without the poem, poem URL 404, other authors not re-read | action test: only the deleted poem's author tag expired; web-qa: guest opens the author page and the poem URL | unit, end-to-end |

## auth

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| FR-6 | Notice «Сессия истекла. Войдите снова.» above the form, `role="status"` | `SessionExpiredNotice` test with the flag set; `SignInPanel` test: notice before the form | unit |
| FR-6 | Not shown again after reload or Back/Forward | `use-one-time-value` test; `SessionExpiredNotice` test: empty store → nothing | unit |
| FR-6 | No notice on a plain visit | `SessionExpiredNotice` test: flag unset → renders nothing | unit |
| FR-6 | Sign-in still redirects to `/` | existing `signInAction` test, unchanged | unit |

## Carried over unchanged

poem-management FR-6 (the five original limit scenarios), NFR-1 (direct insert, create operation
for the caller, non-public insert, hidden author), NFR-10 (failed insert log), and author-poems
NFR-4 (one entry serves both areas, failure is short-lived) keep their existing tests in
`supabase/tests/poems.test.sql` and the feature test folders; they must stay green after the
`poem_create_status` rewrite.
