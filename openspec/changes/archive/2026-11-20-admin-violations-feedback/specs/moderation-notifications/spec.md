## Purpose

Lets the admin tell a user what is happening: a warning the admin writes, and a fixed email that goes out automatically after every restricting action, so the user hears about a decision from the site and not from a broken account.

## ADDED Requirements

### Requirement: Warning form (FR-6)
A `harmful-content` case that has no warning SHALL offer a «send warning» action that opens a modal. The modal SHALL show the user's email address filled in and read-only, a message field (required, trimmed, at most 2000 characters), a send button, and a cancel button. On a confirmed send it SHALL show a success notice and the case SHALL become `warned`. A case that already has a warning SHALL NOT offer the action, and the function SHALL answer `already-warned`. A case that is closed or gone SHALL answer `not-found`, a user who is already blocked or banned `already-restricted`, and a user with no email address `no-address`; none of them sends an email. A `malicious-activity` case SHALL NOT offer it, and the function SHALL answer `wrong-ground`. The admin SHALL NOT be able to change the address.

#### Scenario: Modal opens filled in
- **GIVEN** an open `harmful-content` case with no warning
- **WHEN** the admin opens the warning form
- **THEN** the modal shows the user's address, read-only, and an empty message field

#### Scenario: Successful send
- **GIVEN** the modal with a valid message
- **WHEN** the admin sends it
- **THEN** one email goes to that address in a fixed frame (a fixed subject, then the admin's message, then a fixed block that states the reason for the ground and that the user has one day from the email to respond), a success notice shows, the modal closes, and the case shows `warned` with a deadline 24 hours ahead

#### Scenario: Empty or too long message
- **GIVEN** the modal
- **WHEN** the admin sends an empty or whitespace-only message, or one over 2000 characters
- **THEN** the field shows its error and no email is sent

#### Scenario: Second warning
- **GIVEN** a case already warned
- **WHEN** a warning is requested for it
- **THEN** the answer is `already-warned`, no email is sent, and the row offers no send action

#### Scenario: Malicious ground has no warning
- **GIVEN** an open `malicious-activity` case
- **WHEN** a warning is requested for it
- **THEN** the answer is `wrong-ground` and no email is sent

### Requirement: Warning delivery and retries (FR-11)
Sending the warning SHALL check the case, send the email under a key that is the same for every attempt on that case, and mark the case `warned` only after the email service accepts it. The message text SHALL NOT be stored. A retry of the same send SHALL NOT deliver a second email and SHALL NOT restart the deadline. A send that fails SHALL leave the case `waiting`, keep the modal open with the text in place, and show a notice that names the failure kind, so the admin can retry.

#### Scenario: Retry after a lost answer
- **GIVEN** a send whose answer never reached the admin, though the email service accepted it and the case was marked `warned`
- **WHEN** the admin sends again from the same modal
- **THEN** the user has received one email, a notice says the case was already warned, the row refreshes to `warned`, and the deadline still counts from the first recording

#### Scenario: Email accepted but the case not marked
- **GIVEN** the email service accepted the message but marking the case failed, so it is still `waiting`
- **WHEN** the admin sends again
- **THEN** the user still has one email, the case becomes `warned`, and the deadline counts from that second recording

#### Scenario: Key conflict means already accepted
- **GIVEN** the email service answers that this case's key was already used with a different body (`invalid_idempotent_request`), which it says only when an earlier request with that key was accepted
- **WHEN** the admin sends the warning
- **THEN** the case is marked `warned` and no failure is shown

#### Scenario: A request still in progress is not accepted
- **GIVEN** the email service answers with a conflict that says a request with this case's key is still in progress (`concurrent_idempotent_requests`), or with a 409 whose kind can't be read
- **WHEN** the admin sends the warning
- **THEN** the case stays `waiting`, the modal stays open with the message read-only, and a notice says the email was not confirmed

#### Scenario: Unknown outcome keeps the text
- **GIVEN** a send that timed out, failed on the network, got a service answer of 500 or more or a 409 that is not an accepted-key conflict, or whose answer never arrived
- **WHEN** the modal stays open
- **THEN** the message field is read-only, so a retry carries the same text

#### Scenario: A refusal leaves the text editable
- **GIVEN** a send refused with a missing config or a service answer below 500 other than a 409
- **WHEN** the modal stays open
- **THEN** the message field stays editable

#### Scenario: The lock lives only in the open modal
- **GIVEN** a locked modal
- **WHEN** the admin cancels and reopens it
- **THEN** the message field is empty and editable, and a different text that meets the same key's conflict still marks the case `warned`

#### Scenario: Email service refuses or errors
- **GIVEN** the email service answers with an error
- **WHEN** the admin sends the warning
- **THEN** the case stays `waiting`, the modal stays open with the message kept, and a notice says the email was not sent

#### Scenario: Connection lost
- **GIVEN** the admin's connection is down
- **WHEN** they send
- **THEN** a notice says there is no connection, the modal stays open with the message kept, and no case changes

### Requirement: Standard action emails (FR-9)
After a successful block, ban, admin delete of a poem, or admin delete of a collection, the app SHALL send the affected user one standard email automatically, with no form and no admin input. The subject SHALL be fixed per action and hold no user text. The body SHALL name the action (the deleted poem's or collection's title for a delete, taken from the database's answer and never from the browser) and SHALL state the reason: the ground of the user's open case at that moment, or a general reason when there is none. Unblock and revoke sessions SHALL send nothing. The email SHALL go to the address the account holds at that time.

#### Scenario: Block sends the notice
- **GIVEN** a user with an open `harmful-content` case
- **WHEN** an admin blocks them
- **THEN** one email goes to them saying the account was blocked for harmful content, and the admin's row shows the block and that the notice was sent

#### Scenario: Ban sends the notice
- **GIVEN** a user with no open case
- **WHEN** an admin bans them
- **THEN** one email goes to them saying the account was banned for a violation of the rules, in general terms

#### Scenario: Admin deletes a poem
- **GIVEN** an admin deletes another user's poem
- **WHEN** the delete succeeds
- **THEN** its author gets one email naming the poem by title and saying it was removed

#### Scenario: Admin deletes a collection
- **GIVEN** an admin deletes another user's collection
- **WHEN** the delete succeeds
- **THEN** its author gets one email naming the collection by title and saying it was removed

#### Scenario: A title with line breaks
- **GIVEN** a poem whose title holds a line break
- **WHEN** an admin deletes it
- **THEN** the email's subject is the fixed one and the title appears only in the body

#### Scenario: Unblock and revoke send nothing
- **GIVEN** a blocked user, or a user with sessions
- **WHEN** an admin unblocks them or revokes their sessions
- **THEN** no email is sent

#### Scenario: A no-op action sends nothing
- **GIVEN** an action that answered `already-restricted` or `not-found`
- **WHEN** the action finishes
- **THEN** no email is sent

### Requirement: Notice failure never undoes the action (FR-14)
The standard email SHALL be sent only after the restricting action committed. A send that fails with a temporary failure (a timeout, a network error, a service answer of 500 or more, or a 409 that is not an accepted-key conflict) SHALL be retried once, with the same key. A missing config and a service answer below 500 other than a 409 SHALL NOT be retried. A send that still fails, or fails with one of those, SHALL leave the action done, SHALL record the notice as failed, and SHALL tell the admin the action was done but the email was not sent. A user with no email address SHALL count as a failed send, recorded as failed and shown to the admin as «no address on file». A failure SHALL NOT change the action's result for the page's data. After an admin delete, which sends the admin to the author's page, the notice outcome SHALL still be shown there, once.

#### Scenario: Email service down
- **GIVEN** the email service is unreachable
- **WHEN** an admin blocks a user
- **THEN** the user is blocked, the admin sees the block done and a line saying the email was not sent, and the notice is recorded as failed

#### Scenario: Conflict on the retry counts as sent
- **GIVEN** the first send timed out and the retry answers that the key was already used with a different body (`invalid_idempotent_request`)
- **WHEN** an admin bans a user
- **THEN** the notice is recorded as sent

#### Scenario: A retry still in progress is not sent
- **GIVEN** the first send timed out and the retry answers with a conflict that says a request with that key is still in progress
- **WHEN** an admin bans a user
- **THEN** the ban stands, the notice is recorded as failed, and the admin sees the email was not sent

#### Scenario: One retry succeeds
- **GIVEN** the first send times out and the retry succeeds
- **WHEN** an admin bans a user
- **THEN** the user has one email and the admin sees the notice as sent

#### Scenario: Failed notice after a delete
- **GIVEN** the email service is down
- **WHEN** an admin deletes another user's poem and lands on the author's page
- **THEN** the page shows once that the poem was deleted but the email was not sent, and a reload does not show it again

#### Scenario: No address on file
- **GIVEN** an account with no email address
- **WHEN** an admin blocks it
- **THEN** the block stands and the admin sees «no address on file»

#### Scenario: Email settings missing
- **GIVEN** the email variables are unset
- **WHEN** an admin blocks a user
- **THEN** the block stands, no retry is made, the admin sees the email was not sent, and the server log holds the reason `config` and no value

#### Scenario: A refusal is not retried
- **GIVEN** the email service answers 422
- **WHEN** an admin bans a user
- **THEN** one request is made, the ban stands, and the admin sees the email was not sent

### Requirement: Failures surfaced to the admin (FR-15)
Every admin action of this change (add to the list, switch the ground, remove, send the warning, block or ban from the list) SHALL show a specific notice for each of: no connection, a server error, a session that ended, and the target having changed in another tab. The target-changed notices SHALL cover a case that is already removed, resolved, or gone with its deleted account (one notice, since an account's deletion removes its case and the database answers `not-found` for both), a user already blocked or banned, and a poem or collection already deleted when it is the content a case would record. A failed action SHALL NOT change the row. After a target-changed notice that means the case is over (a case already removed, resolved or gone, or a user already blocked or banned) the row SHALL keep its notice and lose its action buttons, and SHALL leave the list the next time the page loads: the page is not refreshed at once, because the refresh would remove the notice with the row. After a notice that leaves the case open but changed (a warning already sent, a ground already switched) the row SHALL be refreshed to the current state.

#### Scenario: Session ended
- **GIVEN** the admin's session ended
- **WHEN** they add a user to the list or send a warning
- **THEN** a notice says the session ended and nothing changes

#### Scenario: Prompting content already deleted
- **GIVEN** a poem was deleted in another tab
- **WHEN** the admin adds its author with that poem as the prompting content
- **THEN** a notice says the poem no longer exists and no case is created

#### Scenario: Offline
- **GIVEN** the admin's connection is down
- **WHEN** they add a user to the list
- **THEN** a notice says there is no connection and nothing changes

#### Scenario: Server error
- **GIVEN** the server answers with an error
- **WHEN** the admin removes a case
- **THEN** a notice says the action failed and the case is still shown

#### Scenario: User blocked in another tab
- **GIVEN** a user was blocked in another tab
- **WHEN** the admin blocks them from this tab
- **THEN** a notice says they are already restricted, and the row keeps it with no action buttons until the page loads again

#### Scenario: Case removed in another tab
- **GIVEN** a case was removed in another tab
- **WHEN** the admin sends the warning for it
- **THEN** a notice says the case no longer exists, no email is sent, and the row keeps the notice with no action buttons until the page loads again

#### Scenario: Account deleted in another tab
- **GIVEN** an account was deleted in another tab, which removed its case
- **WHEN** the admin acts on that case
- **THEN** the same «case no longer exists» notice shows as when the case was removed, and the row behaves the same way

### Requirement: Email delivery module (NFR-1, NFR-3)
Email SHALL be sent through one server-only module. It SHALL read `RESEND_API_KEY` and `EMAIL_FROM` lazily on each send; an unset or malformed value SHALL be a `config` failure that names the variable and never its value. It SHALL send plain text, SHALL time out, and SHALL return failures as values (`config`, `timeout`, `network`, `conflict` for a key already used with a different body (`invalid_idempotent_request`, which proves an earlier request was accepted), `http` with the status). Any other HTTP 409, a request still in progress (`concurrent_idempotent_requests`) included, SHALL be `http` with status 409. Only the `name` field of a 409 body SHALL be read, never its message. No log line, error or result SHALL hold the API key, a recipient address, or a message body. The key SHALL NOT be prefixed `NEXT_PUBLIC_`, and no service-role or secret database key SHALL exist in `src/`.

#### Scenario: Config missing
- **GIVEN** `RESEND_API_KEY` is unset
- **WHEN** a send is attempted
- **THEN** it fails with reason `config` and no request leaves the server

#### Scenario: Service rejects
- **GIVEN** the email service answers 422
- **WHEN** a send is attempted
- **THEN** it fails with reason `http` and status 422, and nothing logged holds the address or the body

#### Scenario: Timeout
- **GIVEN** the email service does not answer in time
- **WHEN** a send is attempted
- **THEN** it fails with reason `timeout`

#### Scenario: No secret in the client bundle
- **GIVEN** a production build
- **WHEN** the client output is searched for the key's variable name
- **THEN** it is not found, and no file in `src/` reads a service-role or secret database key
