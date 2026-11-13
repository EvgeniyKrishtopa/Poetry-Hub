## ADDED Requirements

### Requirement: Admin role (FR-1)
The database SHALL hold the admin role as rows of `public.admins`, keyed by auth user id. The role belongs to the site owner alone: the owner adds their own row by SQL, and the app has no way to add or remove one. No client role SHALL be able to read, insert, update, or delete a row there, and no app code SHALL write it. `public.is_admin()` SHALL return whether the caller (`auth.uid()`) has a row. It SHALL take no argument and SHALL be executable by `authenticated` only, so a signed-out API caller gets a permission error, not an answer.

#### Scenario: A listed user is an admin
- **GIVEN** a user id has a row in `public.admins`
- **WHEN** that user calls `is_admin()` with their session
- **THEN** the result is `true`

#### Scenario: Any other signed-in caller is not
- **GIVEN** a signed-in user with no row in `public.admins`
- **WHEN** they call `is_admin()`
- **THEN** the result is `false`

#### Scenario: A signed-out caller can't ask
- **GIVEN** a request with only the publishable key and no session
- **WHEN** it calls `is_admin()`
- **THEN** the call is refused

#### Scenario: The role cannot be granted from a client
- **GIVEN** a signed-in non-admin user with the publishable key
- **WHEN** they try to insert into `public.admins` through the API
- **THEN** the request is refused and `is_admin()` is still `false` for them

### Requirement: Admin page access (FR-2)
`/admin` SHALL render for an admin only. A signed-out request SHALL be redirected to `/login`. A signed-in non-admin request SHALL get the not-found screen (a soft 404, status 200, as on the public pages), the same screen as an unknown URL, with no breadcrumb trail. When the session or the admin check cannot be told (Supabase unreachable), the page SHALL show the existing "service unavailable" state, not the admin tools and not a 404. The page SHALL never be cached.

#### Scenario: Admin opens the page
- **GIVEN** a signed-in admin
- **WHEN** they request `/admin`
- **THEN** the page shows the user list

#### Scenario: Signed-out visitor
- **GIVEN** no session
- **WHEN** a browser requests `/admin`
- **THEN** the response redirects to `/login`

#### Scenario: Signed-in non-admin
- **GIVEN** a signed-in user who is not an admin
- **WHEN** they request `/admin`
- **THEN** the not-found screen shows, without a breadcrumb trail, and carries no admin data

#### Scenario: Admin check unavailable
- **GIVEN** the admin check fails with an outage
- **WHEN** an admin requests `/admin`
- **THEN** the page shows the "service unavailable" state and no user data

### Requirement: Admin link in the header (FR-20)
The site header SHALL show a link to `/admin` to a signed-in admin, and to no one else (guest, signed-in non-admin, unreadable session). It SHALL be a dynamic island in the header's `nav`, read inside its own `Suspense` boundary with an empty fallback, and SHALL call the `is_admin()` RPC only for a signed-in reader. It SHALL NOT change the header's prerendered shell or its layout for anyone else.

#### Scenario: Admin sees the link
- **GIVEN** a signed-in admin
- **WHEN** any page renders
- **THEN** the header shows «Админка» with `href` `/admin`

#### Scenario: Others never see it
- **GIVEN** a guest, a signed-in non-admin, and a session that can't be read
- **WHEN** a page renders for each
- **THEN** the header has no link to `/admin` and no gap where it would be

#### Scenario: Guest costs no RPC
- **GIVEN** a guest
- **WHEN** a page renders
- **THEN** `is_admin()` is not called

### Requirement: User list (FR-3)
The `/admin` page SHALL list users newest first, 25 per page, paged by a keyset cursor in the URL (`after`, built from `created_at` and `id`) with a next link and a link back to the first page, rendered on the server. No page SHALL be held in client state. Each row SHALL show the user's email, their author name when set, when they joined, when they last signed in, and their state: active, blocked, or banned. A row of an admin SHALL be marked as an admin and SHALL show no block, ban, or revoke control; `admin_list_users` SHALL return the flag for it. The page SHALL offer an exact-email filter: the whole address, not a part of it, compared after trimming and lower-casing both the input and the stored address. The list SHALL come from `admin_list_users()`, which returns rows to an admin only.

#### Scenario: First page
- **GIVEN** 30 users exist
- **WHEN** an admin opens `/admin`
- **THEN** 25 rows show, newest first, with a link to the next page

#### Scenario: Next page
- **GIVEN** the first page is shown
- **WHEN** the admin follows the next-page link
- **THEN** the remaining 5 rows show, the URL carries the cursor, there is no further next link, and a link leads back to the first page

#### Scenario: Fresh after an action
- **GIVEN** the admin is on the second page
- **WHEN** they block a user there
- **THEN** the same page re-renders with that row showing "blocked"

#### Scenario: An admin's row has no controls
- **GIVEN** the list shows the admin's own row
- **WHEN** an admin views it
- **THEN** the row is marked as an admin and has no block, ban, or revoke control

#### Scenario: Filter by email
- **GIVEN** a user with a known email
- **WHEN** the admin filters by that exact email
- **THEN** only that user's row shows

#### Scenario: Filter ignores case and spaces
- **GIVEN** a user stored as `foo@example.com`
- **WHEN** the admin filters by ` Foo@Example.com `
- **THEN** that user's row shows

#### Scenario: A non-admin cannot list users
- **GIVEN** a signed-in non-admin
- **WHEN** they call `admin_list_users()` directly
- **THEN** the call fails with a permission error and returns no rows

### Requirement: Block and unblock (FR-4)
An admin SHALL be able to block an active user, and unblock a blocked user. Blocking SHALL, in one transaction, record a `blocked` restriction, set `auth.users.banned_until` to a finite far-future time (not `infinity`) so Supabase Auth refuses sign-in and refresh, and end all the user's sessions. Unblocking SHALL remove the restriction and clear the Auth ban. Blocking an already blocked or banned user SHALL change nothing and answer `already-restricted`. Unblocking a user who is not blocked SHALL answer `not-blocked`. A banned user SHALL NOT be unblockable in the app.

#### Scenario: Block an active user
- **GIVEN** an active user with two sessions
- **WHEN** an admin blocks them
- **THEN** the user's row shows "blocked", both sessions are gone, and Auth refuses their sign-in

#### Scenario: Unblock
- **GIVEN** a blocked user
- **WHEN** an admin unblocks them
- **THEN** their row shows "active" and they can sign in again

#### Scenario: Block twice
- **GIVEN** a blocked user
- **WHEN** an admin blocks them again
- **THEN** the answer is `already-restricted` and no second log row is written

#### Scenario: Banned users have no unblock
- **GIVEN** a banned user
- **WHEN** the admin views their row
- **THEN** no unblock control shows, and calling `admin_unblock_user` for them answers `not-blocked`

### Requirement: Ban (FR-5)
An admin SHALL be able to ban an active or blocked user. Banning SHALL, in one transaction, record a `banned` restriction (replacing a `blocked` one), set the Auth ban, end all sessions, and add the hash of the user's lower-cased email to `public.banned_emails`. The stored value SHALL be the SHA-256 digest (hex) of the trimmed, lower-cased email, never the email; the hook computes the same digest and looks it up by equality.

#### Scenario: Ban an active user
- **GIVEN** an active user
- **WHEN** an admin bans them
- **THEN** their row shows "banned", their sessions are gone, and `banned_emails` holds the hash of their email

#### Scenario: Ban a blocked user
- **GIVEN** a blocked user
- **WHEN** an admin bans them
- **THEN** their restriction becomes `banned` and the email hash is added

#### Scenario: Ban twice
- **GIVEN** a banned user
- **WHEN** an admin bans them again
- **THEN** the answer is `already-restricted`

### Requirement: Revoke sessions (FR-6)
An admin SHALL be able to end all sessions of any non-admin user without changing the account's state. The user's refresh tokens SHALL stop working, and the user SHALL be able to sign in again. When the user has no session to end, the function SHALL change nothing, answer `no-sessions`, and write no log row.

#### Scenario: Revoke
- **GIVEN** an active user signed in on two devices
- **WHEN** an admin revokes their sessions
- **THEN** neither device can refresh its session and the user's state is still "active"

#### Scenario: Nothing to revoke
- **GIVEN** a user with no sessions
- **WHEN** an admin revokes their sessions
- **THEN** the answer is `no-sessions`, the page says there were none, and the log row count is unchanged

#### Scenario: Sign in again
- **GIVEN** a user whose sessions were revoked
- **WHEN** they sign in with the right credentials
- **THEN** sign-in succeeds

### Requirement: Admins can't be moderated, and can't lock themselves out (FR-7)
`admin_block_user`, `admin_ban_user`, and `admin_revoke_sessions` SHALL refuse the caller's own id and any id present in `public.admins`, answering `target-is-admin`, and SHALL change nothing. A target that does not exist SHALL answer `not-found`.

#### Scenario: Self-target
- **GIVEN** an admin
- **WHEN** they call `admin_block_user` with their own id
- **THEN** the answer is `target-is-admin` and their account is unchanged

#### Scenario: Another admin
- **GIVEN** two admins
- **WHEN** one calls `admin_ban_user` for the other
- **THEN** the answer is `target-is-admin`

#### Scenario: Unknown id
- **GIVEN** no user has the id
- **WHEN** an admin calls `admin_revoke_sessions` for it
- **THEN** the answer is `not-found`

### Requirement: Delete any poem (FR-8)
An admin SHALL be able to delete any user's poem through `admin_delete_poem(poem_id)`. It SHALL have the same effect as `delete_my_poem` for the poem's author (remove the row, keep the creation-log row, renumber nothing), and return `{ status: "deleted", author_id, illustration_path }`, or `{ status: "not-found" }` for an unknown id. The app SHALL then expire the author's works cache tag and remove the illustration file using the admin's own session; the `poem-illustrations` bucket SHALL allow an admin to select and delete any author's file, and no one else beyond the owner.

#### Scenario: Delete another user's poem
- **GIVEN** a poem of another user, with an illustration
- **WHEN** an admin deletes it
- **THEN** the poem is gone from every page, its illustration file is removed, and the author's works are fresh

#### Scenario: Unknown poem
- **GIVEN** a poem id that does not exist
- **WHEN** an admin deletes it
- **THEN** the answer is `not-found`

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
An admin SHALL be able to delete any user's collection through `admin_delete_collection(collection_id)`. It SHALL have the same effect as `delete_my_collection` for the collection's author (the collection's poems become free poems, placed first among that author's free poems; the advisory lock taken is the target author's) and return `{ status: "deleted", author_id, title }`, or `{ status: "not-found" }`. The app SHALL expire the author's works cache tag.

#### Scenario: Delete another user's collection
- **GIVEN** a collection of another user holding two poems
- **WHEN** an admin deletes it
- **THEN** the collection is gone and both poems are free poems of their author

#### Scenario: Unknown collection
- **GIVEN** a collection id that does not exist
- **WHEN** an admin deletes it
- **THEN** the answer is `not-found`

#### Scenario: A non-admin cannot delete another's collection
- **GIVEN** a signed-in non-admin and a collection of another user
- **WHEN** they call `admin_delete_collection` directly
- **THEN** the call fails with a permission error and the collection is untouched

### Requirement: Admin delete control on public pages (FR-10)
The public poem page and the public collection page SHALL show a delete control to an admin only, and only on content the admin does not own: on the admin's own poems and collections the ordinary owner controls apply and no admin control renders. The decision SHALL come from `may_moderate_author(author_profile_id)`, which is true only for an admin who is not that profile's owner, and is executable by `authenticated` only. It SHALL ask for confirmation naming the target before deleting, and after a successful delete SHALL send the admin to the author's page. For every other reader (guest, signed-in non-admin, the author, an admin on their own work) the control SHALL NOT render, and nothing else on the page SHALL differ for the admin. The control SHALL reach the page through a slot the route file fills, the content component calling a render function the route file supplies, with the target's id, title and author id (the route file builds the redirect path), and SHALL NOT render on a soft 404.

#### Scenario: Admin sees the control
- **GIVEN** a signed-in admin
- **WHEN** they open another user's poem page
- **THEN** a delete control shows

#### Scenario: Not on the admin's own work
- **GIVEN** a signed-in admin
- **WHEN** they open their own poem page
- **THEN** no admin delete control shows and the owner's delete button does

#### Scenario: Others never see it
- **GIVEN** a guest, and a signed-in non-admin
- **WHEN** each opens the same poem page
- **THEN** no admin delete control is in the page

#### Scenario: Confirmation and result
- **GIVEN** an admin on a poem page
- **WHEN** they open the control and confirm
- **THEN** the poem is deleted and the browser lands on the author's page

#### Scenario: Cancel
- **GIVEN** the confirmation is open
- **WHEN** the admin cancels
- **THEN** nothing is deleted

### Requirement: Audit log (FR-11)
Every successful admin function that changes data SHALL append one row to `public.moderation_log` in the same transaction, holding the admin's id, the action, the target user id (for a deleted poem or collection, the auth user id of its author), the target kind and id, and the time. No reason is asked for or stored anywhere. A call that changes nothing (`already-restricted`, `not-blocked`, `no-sessions`, `not-found`, `target-is-admin`) SHALL NOT write a row. The log SHALL NOT hold the text of deleted content. No client role SHALL be able to read or write the table. The log's user ids SHALL carry no foreign key, so deleting an account leaves its rows; a restriction row SHALL be deleted with its account, and a banned email SHALL stay banned.

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

### Requirement: Admin action failures (FR-12)
Each admin Server Action SHALL validate its input on the server (a uuid target), and SHALL return a discriminated result. A function answer other than success SHALL show a specific message (already restricted, not blocked, no sessions, target is an admin, not found). A permission failure, a session that expired mid-action, and an outage SHALL each show their own message, and none SHALL change the page's data. Block, unblock, and revoke SHALL run on one click, since each can be undone or repeated. Ban SHALL ask for confirmation naming the user's email, because the app cannot undo it.

#### Scenario: Invalid target
- **GIVEN** a target id that is not a uuid
- **WHEN** an admin action is called with it
- **THEN** a validation error is returned and no SQL function is called

#### Scenario: Block is one click
- **GIVEN** an active user's row
- **WHEN** the admin activates block
- **THEN** the block runs with no dialog

#### Scenario: Ban asks first
- **GIVEN** an active user's row
- **WHEN** the admin activates ban
- **THEN** a dialog names the user's email and nothing changes until it is confirmed

#### Scenario: Target is an admin
- **GIVEN** the function answers `target-is-admin`
- **WHEN** the action returns
- **THEN** the page shows the target-is-admin message and the row is unchanged

#### Scenario: Session expired
- **GIVEN** the admin's session ended
- **WHEN** they confirm an action
- **THEN** the page shows the session-expired message and nothing changes

### Requirement: Restricted accounts can't write (FR-13)
A blocked or banned account SHALL be refused by every write of user content, with the dedicated SQLSTATE `AM001` and the message `account restricted`, before any row changes: every `security definer` writer (poem, collection and ordering writers, `ensure_my_author_profile`, `consume_write_allowance`) and `can_create_poem()` SHALL call `assert_not_restricted()` first, and the policies for direct profile updates and for owner uploads and deletes in the `author-photos` and `poem-illustrations` buckets SHALL include `not is_restricted()`. Reading public content SHALL be unaffected. Unblocking SHALL restore writes at once.

#### Scenario: Blocked user tries to create a poem
- **GIVEN** a blocked user whose access token is still valid
- **WHEN** they call `create_my_poem`
- **THEN** the call fails with `account restricted` and no poem is stored

#### Scenario: Blocked user is refused before an upload
- **GIVEN** a blocked user creating a poem with an illustration
- **WHEN** the create action runs
- **THEN** `can_create_poem()` fails with `AM001` and nothing is uploaded

#### Scenario: Blocked user deletes or moves
- **GIVEN** a blocked user
- **WHEN** they call `delete_my_poem` or `move_my_poem`
- **THEN** each fails with `account restricted` and nothing changes

#### Scenario: Direct profile update
- **GIVEN** a blocked user
- **WHEN** they update their own `author_profiles` row through the API
- **THEN** no row is updated

#### Scenario: Direct upload
- **GIVEN** a blocked user
- **WHEN** they upload to their own folder of `author-photos` or `poem-illustrations`
- **THEN** the upload is refused

#### Scenario: No writer is left unguarded
- **GIVEN** every volatile `security definer` function in `public` that `authenticated` can execute
- **WHEN** a test inspects each
- **THEN** each calls `assert_not_restricted()` or is on the explicit allowlist (the admin functions and read-only helpers)

#### Scenario: Unblocked user writes again
- **GIVEN** a user just unblocked
- **WHEN** they create a poem
- **THEN** it is stored

#### Scenario: Reading still works
- **GIVEN** a blocked user
- **WHEN** they open a public poem page
- **THEN** it renders

### Requirement: Admin functions are closed to the web (NFR-1)
Every `admin_*` function and `assert_admin()` SHALL be `security definer` with an empty `search_path`, SHALL NOT be executable by `anon` or `public`, and SHALL fail for any caller not in `public.admins` before reading or changing data. `may_moderate_author(author_profile_id)` is not an `admin_*` function: it is executable by `authenticated` only and answers `false`, never an error, for a non-admin. The internal functions `delete_poem_of` and `delete_collection_of` SHALL NOT be executable by `public`, `anon`, or `authenticated`. `reject_banned_signup` SHALL be executable by `supabase_auth_admin` only. `public.admins`, `account_restrictions`, `banned_emails`, and `moderation_log` SHALL have RLS on, no policies, and no client grants.

#### Scenario: Anonymous call
- **GIVEN** a request with only the publishable key and no session
- **WHEN** it calls any `admin_*` function
- **THEN** the call is refused

#### Scenario: Internal functions are not callable
- **GIVEN** a signed-in non-admin user
- **WHEN** they call `delete_poem_of` with another author's profile and poem id through the API
- **THEN** the call is refused and the poem is untouched

#### Scenario: The hook can't be probed
- **GIVEN** a signed-in or anonymous caller
- **WHEN** they call `reject_banned_signup` through the API
- **THEN** the call is refused

#### Scenario: Tables are closed
- **GIVEN** any client role
- **WHEN** it selects from or writes any of the four tables
- **THEN** the request is refused

### Requirement: No service-role key (NFR-2)
The app SHALL NOT read or hold a service-role or secret Supabase key. Admin power SHALL come only from the admin's own session and the guarded SQL functions.

#### Scenario: No secret in the source
- **GIVEN** the repository
- **WHEN** `src/` is searched for service-role or secret-key variable names
- **THEN** there are none

### Requirement: Rendering modes of admin routes (NFR-3)
`/admin` SHALL be dynamic and uncached. Public poem and collection pages SHALL keep their rendering mode; the admin control SHALL be a dynamic island read inside its own `Suspense` boundary, and SHALL call the `may_moderate_author` RPC only for a signed-in reader. The build SHALL succeed with no Supabase env.

#### Scenario: Public page stays cached
- **GIVEN** a production build
- **WHEN** the poem page route is inspected
- **THEN** it keeps its rendering mode, with a dynamic hole for the admin control

### Requirement: Admin module boundaries (NFR-4)
`src/features/admin/` SHALL follow the feature layout, SHALL import only `@/features/auth` (session accessors) and the illustrations bucket constant from `@/features/poems`, server side and one way (the target's title and author id come from the render function the route file supplies), and SHALL expose only `AdminPage`, `AdminNavLink` and `AdminDeleteControl` from `index.ts`. Only `src/app/` SHALL import `@/features/admin`; `poems`, `collections` and `auth` SHALL NOT. `PoemPage` and `PublicCollectionPage` SHALL take a `moderation` render function, called by their content component after its own read succeeds. Server-only code SHALL start with `import "server-only"`.

#### Scenario: Lint enforces the boundary
- **GIVEN** an import of a file inside `features/admin/` from another feature
- **WHEN** lint runs
- **THEN** it fails

#### Scenario: Poems and collections stay free of admin
- **GIVEN** the boundary tests of `poems` and `collections`
- **WHEN** a file in either imports `@/features/admin`
- **THEN** the test fails

### Requirement: Tokenised, Russian admin UI (NFR-5)
Styles of the admin UI SHALL use design tokens only. All user-facing copy SHALL be Russian and live in `admin-messages.ts`.

The admin UI (`/admin`, the header link and the admin delete control) is used by the site owner alone, so accessibility work for it is deliberately not required (owner's decision, 2026-11-13). The project's primitives keep whatever accessibility they already have; nothing here adds or tests more.

#### Scenario: Copy comes from the messages file
- **GIVEN** the `/admin` page, the header link and the admin delete dialog
- **WHEN** they render
- **THEN** every visible text comes from `admin-messages.ts` and no colour is a raw value

### Requirement: No personal data or content in logs (NFR-6)
No log line, error, or action result of the app SHALL hold an email, a poem or collection text, or an access token. A log line SHALL name only the action and the failure kind.

The hosting platform's request logs of the admin's own `/admin?email=` filter are outside this requirement.

#### Scenario: Failing action
- **GIVEN** an admin action fails with an unexpected error
- **WHEN** the server logs it
- **THEN** the line holds the action name and error kind only
