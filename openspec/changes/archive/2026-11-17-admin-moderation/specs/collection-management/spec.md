## ADDED Requirements

### Requirement: Restricted account on collection writes (admin-moderation FR-15)
When a collection write (create, edit, delete, poems save) fails because the caller's account is blocked or banned (SQLSTATE `AM001`, message `account restricted`), the Server Action SHALL return a failure of its own kind `restricted`, not the generic failure and not the session-expired kind. The page SHALL show one message that says the account is blocked and writes are off, keep the user's input on screen, and not retry. The collection and its poems SHALL NOT be changed.

#### Scenario: Blocked user creates a collection
- **GIVEN** the create function fails with `account restricted`
- **WHEN** a blocked user submits the new-collection form
- **THEN** the form shows the restricted message, keeps its fields, and no collection is stored

#### Scenario: Blocked user saves collection poems
- **GIVEN** the save function fails with `account restricted`
- **WHEN** the user saves their selection
- **THEN** the page shows the restricted message and the membership is unchanged

#### Scenario: Not confused with an expired session
- **GIVEN** the failure is `account restricted`
- **WHEN** the action classifies it
- **THEN** the result kind is `restricted`, not `session-expired`
