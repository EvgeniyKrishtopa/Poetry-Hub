## ADDED Requirements

### Requirement: Restricted account on poem writes (admin-moderation FR-14)
When a poem write (create, edit, delete) fails because the caller's account is blocked or banned (SQLSTATE `AM001`, message `account restricted`), the Server Action SHALL return a failure of its own kind `restricted`, not the generic failure and not the session-expired kind. The page SHALL show one message that says the account is blocked and writes are off, keep the user's input on screen, and not retry. The poem SHALL NOT be changed.

#### Scenario: Blocked user creates a poem
- **GIVEN** the create function fails with `account restricted`
- **WHEN** a blocked user submits the add-poem form
- **THEN** the form shows the restricted message, keeps its fields, and no poem is stored

#### Scenario: Blocked user deletes their own poem
- **GIVEN** the delete function fails with `account restricted`
- **WHEN** the user confirms the delete
- **THEN** the page shows the restricted message and the poem still exists

#### Scenario: Not confused with an expired session
- **GIVEN** the failure is `account restricted`
- **WHEN** the action classifies it
- **THEN** the result kind is `restricted`, not `session-expired`
