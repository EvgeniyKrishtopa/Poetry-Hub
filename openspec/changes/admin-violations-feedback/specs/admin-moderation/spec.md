## MODIFIED Requirements

### Requirement: Block and unblock (FR-4)
An admin SHALL be able to block an active user, and unblock a blocked user. Blocking SHALL, in one transaction, record a `blocked` restriction, set `auth.users.banned_until` to a finite far-future time (not `infinity`) so Supabase Auth refuses sign-in and refresh, end all the user's sessions, and close the user's open violation case if there is one (`violation-review` FR-10). After a successful block the app SHALL send the standard email of `moderation-notifications` FR-9. Unblocking SHALL remove the restriction and clear the Auth ban, and send no email. Blocking an already blocked or banned user SHALL change nothing, send nothing, and answer `already-restricted`. Unblocking a user who is not blocked SHALL answer `not-blocked`. A banned user SHALL NOT be unblockable in the app.

#### Scenario: Block an active user
- **GIVEN** an active user with two sessions
- **WHEN** an admin blocks them
- **THEN** the user's row shows "blocked", both sessions are gone, Auth refuses their sign-in, and the standard email is sent

#### Scenario: Block closes an open case
- **GIVEN** an active user with an open violation case
- **WHEN** an admin blocks them
- **THEN** the case is closed as `blocked` in the same transaction

#### Scenario: Unblock
- **GIVEN** a blocked user
- **WHEN** an admin unblocks them
- **THEN** their row shows "active", they can sign in again, and no email is sent

#### Scenario: Block twice
- **GIVEN** a blocked user
- **WHEN** an admin blocks them again
- **THEN** the answer is `already-restricted`, no second log row is written, and no email is sent

#### Scenario: Banned users have no unblock
- **GIVEN** a banned user
- **WHEN** the admin views their row
- **THEN** no unblock control shows, and calling `admin_unblock_user` for them answers `not-blocked`

### Requirement: Ban (FR-5)
An admin SHALL be able to ban an active or blocked user. Banning SHALL, in one transaction, record a `banned` restriction (replacing a `blocked` one), set the Auth ban, end all sessions, add the hash of the user's lower-cased email to `public.banned_emails`, and close the user's open violation case if there is one. The stored value SHALL be the SHA-256 digest (hex) of the trimmed, lower-cased email, never the email; the hook computes the same digest and looks it up by equality. After a successful ban the app SHALL send the standard email of `moderation-notifications` FR-9.

#### Scenario: Ban an active user
- **GIVEN** an active user
- **WHEN** an admin bans them
- **THEN** their row shows "banned", their sessions are gone, `banned_emails` holds the hash of their email, and the standard email is sent

#### Scenario: Ban a blocked user
- **GIVEN** a blocked user
- **WHEN** an admin bans them
- **THEN** their restriction becomes `banned`, the email hash is added, and the standard email is sent

#### Scenario: Ban closes an open case
- **GIVEN** a user with an open violation case
- **WHEN** an admin bans them
- **THEN** the case is closed as `banned` in the same transaction

#### Scenario: Ban twice
- **GIVEN** a banned user
- **WHEN** an admin bans them again
- **THEN** the answer is `already-restricted` and no email is sent

### Requirement: Delete any poem (FR-8)
An admin SHALL be able to delete any user's poem through `admin_delete_poem(poem_id)`. It SHALL have the same effect as `delete_my_poem` for the poem's author (remove the row, keep the creation-log row, renumber nothing), and return `{ status: "deleted", author_id, illustration_path, title }`, or `{ status: "not-found" }` for an unknown id. The app SHALL then expire the author's works cache tag and remove the illustration file using the admin's own session; the `poem-illustrations` bucket SHALL allow an admin to select and delete any author's file, and no one else beyond the owner. After a successful delete the app SHALL send the standard email of `moderation-notifications` FR-9 to the author, naming the poem's title.

#### Scenario: Delete another user's poem
- **GIVEN** a poem of another user, with an illustration
- **WHEN** an admin deletes it
- **THEN** the poem is gone from every page, its illustration file is removed, the author's works are fresh, and the author gets the standard email naming the poem

#### Scenario: Unknown poem
- **GIVEN** a poem id that does not exist
- **WHEN** an admin deletes it
- **THEN** the answer is `not-found` and no email is sent

#### Scenario: Illustration removal fails
- **GIVEN** the poem is deleted but removing its file fails
- **WHEN** the action finishes
- **THEN** the delete still stands, the admin lands on the author page, and the log line holds the failure kind only

#### Scenario: Admin removes another author's file
- **GIVEN** a file in another author's folder of `poem-illustrations`
- **WHEN** an admin removes it with their own session
- **THEN** the object is removed; the same call by a non-admin removes nothing

#### Scenario: A non-admin cannot delete another's poem
- **GIVEN** a signed-in non-admin and a poem of another user
- **WHEN** they call `admin_delete_poem` directly
- **THEN** the call fails with a permission error and the poem is untouched

### Requirement: Delete any collection (FR-9)
An admin SHALL be able to delete any user's collection through `admin_delete_collection(collection_id)`. It SHALL have the same effect as `delete_my_collection` for the collection's author (the collection's poems become free poems, placed first among that author's free poems; the advisory lock taken is the target author's) and return `{ status: "deleted", author_id, title }`, or `{ status: "not-found" }`. The app SHALL expire the author's works cache tag, and after a successful delete SHALL send the standard email of `moderation-notifications` FR-9 to the author, naming the collection's title.

#### Scenario: Delete another user's collection
- **GIVEN** a collection of another user holding two poems
- **WHEN** an admin deletes it
- **THEN** the collection is gone, both poems are free poems of their author, and the author gets the standard email naming the collection

#### Scenario: Unknown collection
- **GIVEN** a collection id that does not exist
- **WHEN** an admin deletes it
- **THEN** the answer is `not-found` and no email is sent

#### Scenario: A non-admin cannot delete another's collection
- **GIVEN** a signed-in non-admin and a collection of another user
- **WHEN** they call `admin_delete_collection` directly
- **THEN** the call fails with a permission error and the collection is untouched

### Requirement: Audit log (FR-11)
Every successful admin function that changes data SHALL append one row to `public.moderation_log` in the same transaction, holding the admin's id, the action, the target user id (for a deleted poem or collection, the auth user id of its author), the target kind and id, and the time. No reason is asked for or stored anywhere. A call that changes nothing (`already-restricted`, `not-blocked`, `no-sessions`, `not-found`, `target-is-admin`, `already-in-list`, `already-warned`) SHALL NOT write a row. The log SHALL NOT hold the text of deleted content, an email address, or a message body. The case and notice events of `violation-review` FR-12 SHALL use the same table. No client role SHALL be able to read or write the table. The log's user ids SHALL carry no foreign key, so deleting an account leaves its rows; a restriction row SHALL be deleted with its account, and a banned email SHALL stay banned.

#### Scenario: Block is logged
- **GIVEN** an admin blocks a user
- **WHEN** the call succeeds
- **THEN** one log row records the admin, `block`, and the user id

#### Scenario: Content delete is logged against its author
- **GIVEN** an admin deletes another user's poem
- **WHEN** the call succeeds
- **THEN** one log row records `delete-poem`, the poem id, and the author's auth user id, and holds no poem text

#### Scenario: No-op writes no row
- **GIVEN** a blocked user
- **WHEN** an admin blocks them again
- **THEN** the log row count is unchanged

#### Scenario: Deleted account
- **GIVEN** a banned user with log rows
- **WHEN** the account is deleted in Supabase
- **THEN** the log rows remain, the restriction row is gone, and the email hash is still in `banned_emails`

#### Scenario: Log is closed to clients
- **GIVEN** any signed-in user, admin included
- **WHEN** they select from `moderation_log` through the API
- **THEN** the request is refused

## REMOVED Requirements

### Requirement: User list (FR-3)
**Reason**: The exact-email filter is dropped from `/admin` (the list is short and the review list replaces the lookup), and the requirement's scenarios for it cannot be kept in a modified copy.
**Migration**: Replaced by "User list without a filter (FR-3)" under ADDED Requirements, which keeps every other rule and scenario of the old block.

## ADDED Requirements

### Requirement: User list without a filter (FR-3)
The `/admin` page SHALL list users newest first, 10 per page, paged by a keyset cursor in the URL (`after`, built from `created_at` and `id`) with a next link and a link back to the first page, rendered on the server. No page SHALL be held in client state. Each row SHALL show the user's email, their author name when set, when they joined, when they last signed in, and their state: active, blocked, or banned. Admins SHALL NOT be listed: `admin_list_users` SHALL leave out every user present in `public.admins` (the caller included) before it pages, so each page stays full and the cursor is unaffected, and it SHALL NOT return an admin flag, since no row is an admin. The page SHALL NOT offer an email filter and SHALL NOT read an `email` query parameter. The page SHALL show the review-list link and drop target of `violation-review` FR-3 above the list. The list SHALL come from `admin_list_users()`, which returns rows to an admin only.

#### Scenario: First page
- **GIVEN** 15 users who are not admins exist
- **WHEN** an admin opens `/admin`
- **THEN** 10 rows show, newest first, with a link to the next page

#### Scenario: Next page
- **GIVEN** the first page is shown
- **WHEN** the admin follows the next-page link
- **THEN** the remaining 5 rows show, the URL carries the cursor, there is no further next link, and a link leads back to the first page

#### Scenario: Fresh after an action
- **GIVEN** the admin is on the second page
- **WHEN** they block a user there
- **THEN** the same page re-renders with that row showing "blocked"

#### Scenario: Admins are not listed
- **GIVEN** users exist and one or more of them, the caller included, are admins
- **WHEN** an admin opens `/admin`
- **THEN** no admin has a row, so no row offers a block, ban, or revoke control for an admin

#### Scenario: Admins don't take a place on a page
- **GIVEN** 12 users exist and 2 of them are admins
- **WHEN** an admin opens `/admin`
- **THEN** 10 rows show with no link to a next page, and every page before the last is full

#### Scenario: No email filter
- **GIVEN** an admin on `/admin`
- **WHEN** the page renders
- **THEN** it has no email field or find button, and a request carrying `?email=` shows the unfiltered list

#### Scenario: Review-list link at the top
- **GIVEN** an admin on `/admin`
- **WHEN** the page renders
- **THEN** the link «Список нарушителей» shows above the user list

#### Scenario: A non-admin cannot list users
- **GIVEN** a signed-in non-admin
- **WHEN** they call `admin_list_users()` directly
- **THEN** the call fails with a permission error and returns no rows
