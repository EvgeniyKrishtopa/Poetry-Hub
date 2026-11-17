## ADDED Requirements

### Requirement: Restricted account on ordering writes (admin-moderation FR-18)
When a move of a poem or a collection fails because the caller's account is blocked or banned (SQLSTATE `AM001`, message `account restricted`), the move action SHALL return a failure of its own kind `restricted`, not the generic failure and not the session-expired kind. The board SHALL snap the item back to its place, show one message that says the account is blocked and writes are off, and not retry. The order SHALL NOT be changed.

#### Scenario: Blocked user drags a poem
- **GIVEN** `move_my_poem` fails with `account restricted`
- **WHEN** a blocked user drops a poem in a new place
- **THEN** the poem returns to its place and the restricted message shows

#### Scenario: Not confused with an expired session
- **GIVEN** the failure is `account restricted`
- **WHEN** the move action classifies it
- **THEN** the result kind is `restricted`, not `session-expired`
