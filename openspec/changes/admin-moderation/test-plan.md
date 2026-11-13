# Test plan: admin-moderation

One row per acceptance criterion (each scenario's THEN). Levels: **unit** (isolated code, Supabase mocked),
**integration** (the real database on the local Supabase stack, or a real route/render against it),
**end-to-end** (a real browser against the local stack). Test files do not exist yet; names are the plan.
Database tests live in `supabase/tests/` (pgTAP): `admin_foundation.test.sql` (group 1), `admin_functions.test.sql`
(group 2). App tests live in `src/features/<name>/tests/`.

Identifiers FR-1..FR-13 and NFR-1..NFR-6 are in `specs/admin-moderation/spec.md`; FR-14 in `poem-management`,
FR-15 in `collection-management`, FR-16 and FR-17 in `auth`, FR-18 in `work-ordering`, FR-19 in `author-profiles`.

| Requirement ID | Tests | Level |
| --- | --- | --- |
| FR-1 listed user is an admin | pgTAP: `is_admin()` true for a row in `admins` | integration |
| FR-1 other signed-in caller is not | pgTAP: `is_admin()` false for a signed-in non-admin | integration |
| FR-1 signed-out caller can't ask | pgTAP: `is_admin()` refused for `anon` | integration |
| FR-1 role not grantable from a client | pgTAP: client insert/update/delete on `admins` refused, `is_admin()` still false | integration |
| FR-2 admin opens the page | `AdminPage` renders the list for an admin (mocked DAL); web-qa flow opens `/admin` as admin | unit; end-to-end |
| FR-2 signed-out visitor | `AdminPage` calls the `requireSession` redirect; web-qa flow: `/admin` signed out lands on `/login` | unit; end-to-end |
| FR-2 signed-in non-admin | `AdminPage` renders not-found with no data and no trail for a non-admin; breadcrumbs test: no row for `/admin` | unit |
| FR-2 admin check unavailable | `AdminPage` shows the unavailable state when the admin check returns `unknown` | unit |
| FR-20 admin sees the link | `AdminNavLink` test: renders «Админка» with `href` `/admin` for an admin (mocked session and RPC); web-qa flow clicks it | unit; end-to-end |
| FR-20 others never see it | `AdminNavLink` tests: guest, non-admin and unreadable session render nothing; layout test: no extra markup | unit |
| FR-20 guest costs no RPC | `AdminNavLink` test: `is_admin()` mock not called for a guest | unit |
| FR-3 first page | pgTAP: `admin_list_users` returns 25 newest first with 30 users; `AdminUserList` renders rows and a next link | integration; unit |
| FR-3 next page | `AdminPage` with `after` cursor renders the rest, no next link, a first-page link | unit |
| FR-3 fresh after an action | `refresh()` is called after a successful action and the row shows blocked (component test) | unit |
| FR-3 admin row has no controls | `AdminUserRow` renders the admin badge and no control when `is_admin` is true | unit |
| FR-3 filter by email | pgTAP: exact-email filter returns one row; `AdminPage` passes `email` from the URL | integration; unit |
| FR-3 filter ignores case and spaces | pgTAP: ` Foo@Example.com ` finds `foo@example.com` | integration |
| FR-3 non-admin cannot list | pgTAP: `admin_list_users` as non-admin fails with permission error, no rows | integration |
| FR-4 block an active user | pgTAP: restriction row, finite `banned_until`, sessions deleted; local-stack check that Auth refuses sign-in | integration |
| FR-4 unblock | pgTAP: restriction removed, `banned_until` cleared, sign-in possible | integration |
| FR-4 block twice | pgTAP: `already-restricted`, no second log row | integration |
| FR-4 banned users have no unblock | pgTAP: `admin_unblock_user` for a banned user answers `not-blocked`; component test: no unblock control on a banned row | integration; unit |
| FR-5 ban an active user | pgTAP: `banned` restriction, sessions gone, sha256 of the trimmed lower-cased email in `banned_emails` | integration |
| FR-5 ban a blocked user | pgTAP: restriction becomes `banned`, hash added | integration |
| FR-5 ban twice | pgTAP: `already-restricted` | integration |
| FR-6 revoke | pgTAP: all of the user's sessions removed, state unchanged; local-stack check that a refresh token stops working | integration |
| FR-6 nothing to revoke | pgTAP: `no-sessions`, no log row; action test maps it to its message | integration; unit |
| FR-6 sign in again | local-stack check: sign-in succeeds after a revoke (recorded in `_debug/`) | integration |
| FR-7 self-target | pgTAP: block/ban/revoke with own id answers `target-is-admin`, unchanged | integration |
| FR-7 another admin | pgTAP: ban of another admin answers `target-is-admin` | integration |
| FR-7 unknown id | pgTAP: `admin_revoke_sessions` answers `not-found` | integration |
| FR-8 delete another user's poem | pgTAP: row gone, creation-log row kept, returns `author_id` and `illustration_path`; action test: tag expired, file removal called | integration; unit |
| FR-8 unknown poem | pgTAP: `not-found` | integration |
| FR-8 illustration removal fails | action test: removal error does not undo the delete, redirects, logs kind only | unit |
| FR-8 admin removes another author's file | local-stack check: admin session removes the object, non-admin removes nothing | integration |
| FR-8 non-admin cannot delete another's poem | pgTAP: `admin_delete_poem` as non-admin fails, poem untouched | integration |
| FR-9 delete another user's collection | pgTAP: collection gone, poems free and placed first, returns `author_id` and `title` | integration |
| FR-9 unknown collection | pgTAP: `not-found` | integration |
| FR-9 non-admin cannot delete another's collection | pgTAP: `admin_delete_collection` as non-admin fails, collection untouched | integration |
| FR-10 admin sees the control | `AdminDeleteControl` renders for an admin on another's work (mocked session and RPC); web-qa flow | unit; end-to-end |
| FR-10 not on the admin's own work | pgTAP: `may_moderate_author` false for own profile; component test: nothing rendered | integration; unit |
| FR-10 others never see it | component tests: guest, non-admin, author render nothing; the RPC is not called for a guest; page markup identical otherwise | unit |
| FR-10 confirmation and result | component test for the dialog; web-qa flow deletes another user's poem and lands on the author page | unit; end-to-end |
| FR-10 cancel | component test: cancel deletes nothing | unit |
| FR-11 block is logged | pgTAP: one `moderation_log` row with admin, `block`, user id | integration |
| FR-11 content delete logged against its author | pgTAP: row with `delete-poem`, poem id, author's auth user id, no text | integration |
| FR-11 no-op writes no row | pgTAP: row count unchanged for every no-op answer | integration |
| FR-11 deleted account | pgTAP: log rows remain, restriction gone, hash still in `banned_emails` | integration |
| FR-11 log closed to clients | pgTAP: select/insert on `moderation_log` refused for `authenticated` | integration |
| FR-12 invalid target | action test: non-uuid returns validation error, no RPC call | unit |
| FR-12 block is one click | component test: activating block calls the action with no dialog | unit |
| FR-12 ban asks first | component test: ban opens a dialog naming the email, nothing runs until confirmed | unit |
| FR-12 target is an admin | action test maps `target-is-admin` to its message; row unchanged | unit |
| FR-12 session expired | action test: ended session returns the session-expired result, no RPC call | unit |
| FR-13 blocked user creates a poem | pgTAP: `create_my_poem` raises `AM001`, no row | integration |
| FR-13 refused before an upload | pgTAP: `can_create_poem` raises `AM001`; action test: no upload attempted | integration; unit |
| FR-13 blocked user deletes or moves | pgTAP: `delete_my_poem` and `move_my_poem` raise `AM001`, unchanged | integration |
| FR-13 direct profile update | pgTAP: update of own `author_profiles` row affects no row for a blocked user | integration |
| FR-13 direct upload | local-stack check: upload to both buckets refused for a blocked user | integration |
| FR-13 no writer unguarded | pgTAP: `pg_proc` check over volatile security-definer functions (and `can_create_poem`) with the explicit allowlist | integration |
| FR-13 unblocked user writes again | pgTAP: create succeeds after unblock | integration |
| FR-13 reading still works | pgTAP: public reads work for a blocked user; poem page renders | integration |
| NFR-1 anonymous call | pgTAP: every `admin_*` function refused for `anon` | integration |
| NFR-1 internal functions not callable | pgTAP: `delete_poem_of` and `delete_collection_of` refused for `authenticated`, poem untouched | integration |
| NFR-1 hook can't be probed | pgTAP: `reject_banned_signup` refused for `anon` and `authenticated` | integration |
| NFR-1 tables closed | pgTAP: all four tables refuse select and writes for client roles | integration |
| NFR-2 no secret in the source | Vitest repo scan: no service-role or secret-key variable name under `src/` | unit |
| NFR-3 public page stays cached | build output check that both routes keep their rendering mode with a dynamic hole; `npm run build` | integration |
| NFR-3 control calls the RPC only for a signed-in reader | component test: no RPC call for a guest or unknown session | unit |
| NFR-4 lint enforces the boundary | lint rule run on a fixture that imports `features/admin` internals | unit |
| NFR-4 poems and collections stay free of admin | extended `poems` and `collections` boundary tests | unit |
| NFR-5 copy from the messages file | component tests of the `/admin` page and the delete dialog: visible texts equal `admin-messages.ts` entries; a lint/grep check for raw colour values in admin styles | unit |
| NFR-6 failing action | action test: unexpected error logs action name and error kind only (spy on `console.error`) | unit |
| FR-14 blocked user creates a poem | form test: `restricted` result shows its message, keeps fields | unit |
| FR-14 blocked user deletes their own poem | `DeletePoemButton` test: restricted message, poem still listed | unit |
| FR-14 not confused with expired session | classifier test: `AM001` gives `restricted`, not `session-expired` | unit |
| FR-15 blocked user creates a collection | form test: restricted message, fields kept | unit |
| FR-15 blocked user saves collection poems | form test: restricted message, selection unchanged | unit |
| FR-15 not confused with expired session | classifier test, shared with FR-14 | unit |
| FR-16 blocked user signs in | `signInAction` test: banned Auth error returns `restricted`, no redirect; form shows the message | unit |
| FR-16 banned refresh read as signed out | `readClaimsState` test with the banned-refresh error shape | unit |
| FR-16 wrong credentials stay generic | `signInAction` test: `invalid_credentials` message unchanged | unit |
| FR-16 restricted session ends | local-stack check (recorded in `_debug/`) plus the `readClaimsState` test above | integration |
| FR-17 banned address | pgTAP: hook rejects a banned hash; `signUpAction` test: the fixed code maps to `check-email`; local-stack check that no user is created | integration; unit |
| FR-17 other address | pgTAP: hook allows an unbanned address | integration |
| FR-17 unexpected hook input | pgTAP: event without email is allowed | integration |
| FR-17 hook internal error | pgTAP: forced lookup failure still allows | integration |
| FR-17 ordinary sign-up error unchanged | `signUpAction` test: weak-password message not turned into `check-email` | unit |
| FR-18 blocked user drags a poem | board test: `restricted` result snaps the item back and shows the message | unit |
| FR-18 not confused with expired session | `run-move` classification test | unit |
| FR-19 blocked user saves a field | profile editor test: restricted message, typed value kept | unit |
| FR-19 blocked user uploads a photo | profile editor test: restricted message, stored photo unchanged | unit |
| FR-19 other failures keep their message | profile editor test: network failure still shows the generic message | unit |

Coverage: all 92 scenarios in the six spec deltas have at least one row (93 rows: NFR-3 has two). Whole-flow
web-qa (task 7.4) adds end-to-end coverage on top of the rows marked end-to-end.
