## Purpose

Gives the admin a list of users whose content or behaviour is under review, each with a ground, a status and a deadline, so a decision to restrict someone is recorded, visible, and made in two steps for harmful content: warning, then a decision.

## ADDED Requirements

### Requirement: Violation case (FR-1)
An admin SHALL be able to add a user to the review list, which opens a violation case holding the user, a ground the admin chooses when adding (`harmful-content` or `malicious-activity`; every way of adding asks for it, with `harmful-content` preselected), and optionally the poem or collection that prompted it. A user SHALL have at most one open case. Adding a user who already has an open case SHALL change nothing and answer `already-in-list`. Admins SHALL NOT be added, the calling admin included (`target-is-admin`), and neither SHALL a user who is already blocked or banned (`already-restricted`). An unknown user SHALL answer `not-found`. A recorded poem or collection that does not belong to that user, or that no longer exists, SHALL answer `content-not-found` and create no case.

#### Scenario: Add a user
- **GIVEN** a user with no open case
- **WHEN** an admin adds them and chooses a ground
- **THEN** one open case exists for them with that ground and no warning

#### Scenario: Add twice
- **GIVEN** a user with an open case
- **WHEN** an admin adds them again
- **THEN** the answer is `already-in-list` and there is still one open case and no new log row

#### Scenario: An admin cannot be added
- **GIVEN** a user who is an admin, or the calling admin
- **WHEN** an admin adds them
- **THEN** the answer is `target-is-admin` and no case is created

#### Scenario: A restricted user cannot be added
- **GIVEN** a user who is blocked or banned
- **WHEN** an admin adds them
- **THEN** the answer is `already-restricted` and no case is created

#### Scenario: Someone else's content cannot be attached
- **GIVEN** a poem that belongs to another user
- **WHEN** an admin adds a user with that poem as the prompting content
- **THEN** the answer is `content-not-found` and no case is created

#### Scenario: Content already deleted
- **GIVEN** a poem that was deleted in another tab
- **WHEN** an admin adds its author with that poem as the prompting content
- **THEN** the answer is `content-not-found` and no case is created

#### Scenario: A non-admin cannot add
- **GIVEN** a signed-in non-admin
- **WHEN** they call the add function directly
- **THEN** the call fails with a permission error and no case is created

#### Scenario: A removed case can be reopened
- **GIVEN** a user whose case was removed from the list
- **WHEN** an admin adds them again
- **THEN** a new open case exists for them with no warning

### Requirement: Add control on public pages (FR-2)
The public author page, poem page and collection page SHALL show an «add to review list» control to an admin only, and only on content that is not the admin's own. The decision SHALL come from `may_moderate_author`, as the admin delete control does. Used on a poem or collection page, it SHALL record that poem or collection with the case. Used on a user who already has an open case, it SHALL tell the admin they are already on the list. For every other reader the control SHALL NOT render, and nothing else on the page SHALL differ.

#### Scenario: Admin adds from a poem page
- **GIVEN** an admin on another author's poem page
- **WHEN** they use the control and choose a ground
- **THEN** the author has an open case with that ground recording that poem, and a notice confirms it

#### Scenario: Admin adds from the author page
- **GIVEN** an admin on another author's page
- **WHEN** they use the control and choose a ground
- **THEN** the author has an open case with that ground and no recorded content

#### Scenario: Already on the list
- **GIVEN** the author already has an open case
- **WHEN** an admin uses the control
- **THEN** a notice says they are already on the list and nothing changes

#### Scenario: Others never see it
- **GIVEN** a guest, a signed-in non-admin, the author, and an admin on their own page
- **WHEN** the page renders for each
- **THEN** no control to add to the list renders

### Requirement: Link and drop target on /admin (FR-3)
The `/admin` page SHALL show a link «Список нарушителей» at the top, leading to `/admin/violations`. A user row of the general list SHALL be draggable onto that link, and dropping it SHALL open the ground choice of FR-1 for that user, then add them to the review list as FR-1 does and tell the admin the result; cancelling the choice adds nobody. Each row SHALL also offer a plain button that opens the same choice, so the drop is never the only way.

#### Scenario: Link
- **GIVEN** an admin on `/admin`
- **WHEN** the page renders
- **THEN** a link «Список нарушителей» with `href` `/admin/violations` shows above the user list

#### Scenario: Drop a row
- **GIVEN** a user row in the general list
- **WHEN** the admin drops it on the link and chooses a ground
- **THEN** that user has an open case with that ground and a notice confirms it

#### Scenario: Drop, then cancel
- **GIVEN** a user row dropped on the link
- **WHEN** the admin cancels the ground choice
- **THEN** no case is created

#### Scenario: Drop of a user already on the list
- **GIVEN** a user with an open case
- **WHEN** the admin drops their row on the link
- **THEN** a notice says they are already on the list

#### Scenario: Button instead of a drop
- **GIVEN** a user row
- **WHEN** the admin uses the row's add button
- **THEN** the result is the same as a drop

### Requirement: Review list page (FR-4)
`/admin/violations` SHALL render for an admin only, with the same gate as `/admin` (signed out goes to `/login`, a non-admin gets the not-found screen with no trail, an unreadable check shows the service-unavailable state), and SHALL never be cached. It SHALL list open cases newest first, at most 100, rendered on the server, and SHALL say so when more open cases exist than it shows. Each case SHALL show the user's email, author name, ground, status, and, when recorded, the title of the poem or collection that prompted it with a link to it, or a note that it was deleted. It SHALL show the breadcrumb trail «Главная › Админка › Список нарушителей» to an admin only. An empty list SHALL show an empty state.

#### Scenario: Admin opens the page
- **GIVEN** two open cases
- **WHEN** an admin opens `/admin/violations`
- **THEN** both cases show, newest first, each with email, ground and status

#### Scenario: Signed-in non-admin
- **GIVEN** a signed-in user who is not an admin
- **WHEN** they request the page
- **THEN** the not-found screen shows, without a trail and with no case data

#### Scenario: Signed out
- **GIVEN** no session
- **WHEN** a browser requests the page
- **THEN** the response redirects to `/login`

#### Scenario: Empty list
- **GIVEN** no open case
- **WHEN** an admin opens the page
- **THEN** an empty state shows

#### Scenario: More cases than the cap
- **GIVEN** 101 open cases
- **WHEN** an admin opens the page
- **THEN** 100 cases show, newest first, with a line saying more exist

#### Scenario: A non-admin cannot list cases
- **GIVEN** a signed-in non-admin
- **WHEN** they call the list function directly
- **THEN** the call fails with a permission error and returns no rows

### Requirement: Case status and deadline (FR-5)
Each case SHALL show a status derived at read time, never stored: `waiting` when no warning has been sent, `warned` when a warning was sent less than 24 hours ago, and `deadline-passed` when it was sent 24 hours ago or more. The deadline SHALL be the warning's time plus 24 hours, shown with the status as an absolute date and time in UTC, labelled as UTC, in the same way the page's other dates are formatted (so the server and the browser print the same text). It SHALL NOT be a countdown. Nothing SHALL block or delete anything when the deadline passes.

#### Scenario: Waiting
- **GIVEN** an open case with no warning
- **WHEN** the page renders
- **THEN** the case shows `waiting` and no deadline

#### Scenario: Warned
- **GIVEN** a warning sent 2 hours ago
- **WHEN** the page renders
- **THEN** the case shows `warned` and the deadline as the warning's UTC date and time plus 24 hours

#### Scenario: Deadline passed
- **GIVEN** a warning sent 25 hours ago
- **WHEN** the page renders
- **THEN** the case shows `deadline-passed`, and the user is still not restricted

### Requirement: Switch the ground, remove from the list (FR-7)
An admin SHALL be able to switch an open case's ground between the two grounds, and to remove an open case from the list. Switching SHALL change only the ground: a warning already sent stays recorded, the status and deadline are unchanged, and the case stays warned (no second warning) even if the ground is switched back. Removing SHALL end the case without restricting the user and write no email. A removed case SHALL no longer show. Both SHALL answer `not-found` for a case that is already gone or resolved.

#### Scenario: Switch the ground
- **GIVEN** an open `harmful-content` case
- **WHEN** an admin switches it to `malicious-activity`
- **THEN** the case shows the new ground

#### Scenario: Switch keeps the warning
- **GIVEN** a `harmful-content` case warned 2 hours ago
- **WHEN** an admin switches it to `malicious-activity` and back
- **THEN** the case still shows `warned` with the original deadline and offers no warning action

#### Scenario: Remove
- **GIVEN** an open case
- **WHEN** an admin removes it
- **THEN** the case no longer shows, the user is unchanged, and no email is sent

#### Scenario: Case already gone
- **GIVEN** a case removed in another tab
- **WHEN** an admin removes or switches it
- **THEN** the answer is `not-found`

### Requirement: Restricting from the list (FR-8)
A case row SHALL offer block and ban, and the admin's choice SHALL be the same restriction the `/admin` list gives. For `malicious-activity` they SHALL be available at once and no warning SHALL be offered. For `harmful-content` they SHALL always be available, and when the case has no warning or its deadline has not passed, a block SHALL first open a confirmation that says so and runs only after the admin confirms. Otherwise (the deadline has passed, or the ground is `malicious-activity`) a block SHALL run on one click, as in the `/admin` list, with no extra confirmation. A ban SHALL always ask for confirmation, as in the `/admin` list, with the early-block line added when the block would be early. The deadline SHALL NOT be enforced by the database.

#### Scenario: Malicious ground
- **GIVEN** an open `malicious-activity` case
- **WHEN** the admin blocks the user from the row
- **THEN** the user is blocked with no warning step, and the standard notice is sent

#### Scenario: Harmful ground before the deadline
- **GIVEN** an open `harmful-content` case warned 2 hours ago
- **WHEN** the admin starts a block
- **THEN** a confirmation says the deadline has not passed, and the block runs only after the admin confirms

#### Scenario: Harmful ground after the deadline
- **GIVEN** an open `harmful-content` case whose deadline passed
- **WHEN** the admin blocks the user
- **THEN** the user is blocked on one click with no confirmation

#### Scenario: Harmful ground with no warning
- **GIVEN** an open `harmful-content` case with no warning
- **WHEN** the admin blocks the user
- **THEN** a confirmation says no warning was sent, and the block runs only after the admin confirms

#### Scenario: Ban always asks
- **GIVEN** any open case
- **WHEN** the admin bans the user
- **THEN** the ban confirmation naming the email shows

#### Scenario: Early ban of a harmful-content case
- **GIVEN** an open `harmful-content` case with no warning or a deadline that has not passed
- **WHEN** the admin bans the user
- **THEN** the ban confirmation also carries the early-block line

#### Scenario: Ban of a malicious-activity case
- **GIVEN** an open `malicious-activity` case
- **WHEN** the admin bans the user
- **THEN** the ban confirmation shows with no early-block line

### Requirement: Case resolution (FR-10)
A successful block or ban of a user SHALL close that user's open case in the same transaction, recording how it ended (`blocked` or `banned`). A user with no open case SHALL be restricted exactly as before.

#### Scenario: Block closes the case
- **GIVEN** a user with an open case
- **WHEN** an admin blocks them from any list
- **THEN** the case is closed as `blocked` and leaves the list

#### Scenario: Ban closes the case
- **GIVEN** a user with an open case
- **WHEN** an admin bans them
- **THEN** the case is closed as `banned`

#### Scenario: No case
- **GIVEN** a user with no open case
- **WHEN** an admin blocks them
- **THEN** they are blocked and nothing else changes

### Requirement: Audit of case events (FR-12)
Every successful change to a case SHALL append one row to `public.moderation_log` in the same transaction: a case added, its ground switched, a warning recorded as sent, and a case removed. The outcome of a standard notice (sent or failed) SHALL be recorded in the same table by a separate call made after the action has committed; that write is best effort, and its failure SHALL NOT change the action's result. A call that changes nothing SHALL write no row. The log SHALL NOT hold an email address or a message body. No client role SHALL read or write the case table.

#### Scenario: Add is logged
- **GIVEN** an admin adds a user
- **WHEN** the call succeeds
- **THEN** one log row records the admin, the action and the user id, and holds no address

#### Scenario: Tables are closed to clients
- **GIVEN** any signed-in user, admin included
- **WHEN** they select from the case table through the API
- **THEN** the request is refused

### Requirement: Rules text for the About page (FR-13)
The change SHALL deliver a document that compares the live About text with the two grounds and the one-day warning period, says which are covered and which are not, and proposes Russian wording for what is missing, for the owner to paste into Contentful. The app SHALL NOT edit Contentful.

#### Scenario: Document delivered
- **GIVEN** the live About text
- **WHEN** the change is complete
- **THEN** a document lists each ground and the warning period as covered or missing, and holds proposed wording for each missing one

### Requirement: Admin functions are closed to the web (NFR-2)
Every new database function SHALL be `security definer` with an empty `search_path`, SHALL start with the admin check, and SHALL be executable by `authenticated` only, so a signed-out API caller gets a permission error. The case table SHALL have no client grants.

#### Scenario: Signed-out caller
- **GIVEN** a request with only the publishable key
- **WHEN** it calls any new function
- **THEN** the call is refused

#### Scenario: Function inventory
- **GIVEN** the database after the migration
- **WHEN** the new functions are listed
- **THEN** each starts with the admin check and none is executable by `anon` or `public`

### Requirement: Public pages keep their rendering mode (NFR-4)
The admin-only controls this change adds to the author, poem and collection pages SHALL arrive through an admin-only slot inside their own `Suspense` boundary with an empty fallback. They SHALL NOT change those pages' rendering mode, and for a reader who is not signed in they SHALL make no admin or moderation-right call.

#### Scenario: Guest costs no call
- **GIVEN** no session
- **WHEN** the poem page renders
- **THEN** neither `is_admin()` nor `may_moderate_author` is called and the page stays prerendered or cached as before

#### Scenario: Build output unchanged
- **GIVEN** the change is complete
- **WHEN** `npm run build` runs
- **THEN** the author, poem and collection pages keep the rendering mode they had before the change
