## ADDED Requirements

### Requirement: Restricted account on profile writes (admin-moderation FR-19)
When a profile field save or a photo upload or removal fails because the caller's account is blocked or banned (the pre-check `consume_write_allowance` raising SQLSTATE `AM001`, message `account restricted`, before any update or upload), the action SHALL return a failure of its own kind `restricted`, not the generic "unavailable" failure. The editor SHALL show one message that says the account is blocked and writes are off, keep the typed value, and not retry. The stored profile SHALL NOT change.

#### Scenario: Blocked user saves a field
- **GIVEN** the pre-check raises `AM001` for a blocked user
- **WHEN** they save their name
- **THEN** the editor shows the restricted message and keeps the typed value

#### Scenario: Blocked user uploads a photo
- **GIVEN** the pre-check raises `AM001` for a blocked user
- **WHEN** they pick a photo
- **THEN** the editor shows the restricted message and the stored photo is unchanged

#### Scenario: Other failures keep their message
- **GIVEN** the update fails with a network error
- **WHEN** the user saves
- **THEN** the generic unavailable message shows, unchanged
