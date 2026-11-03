## ADDED Requirements

### Requirement: Session-expired notice on sign-in (delete-poem FR-6)
When a write in the app found the session expired and sent the reader to `/login`, the sign-in page SHALL show «Сессия истекла. Войдите снова.» above the sign-in form in a `role="status"` element, once. The notice SHALL NOT appear when `/login` is opened any other way, and SHALL NOT change where a successful sign-in leads.

#### Scenario: Sent from an expired delete
- **GIVEN** an author whose session expired confirms a poem delete
- **WHEN** they land on `/login`
- **THEN** «Сессия истекла. Войдите снова.» is shown above the form in a `role="status"` element

#### Scenario: Only once
- **GIVEN** the notice is shown on `/login`
- **WHEN** the reader reloads the page, or leaves and returns with the browser's Back or Forward button
- **THEN** the notice is not shown again

#### Scenario: Plain visit
- **GIVEN** a signed-out visitor
- **WHEN** they open `/login` from the header link or by URL
- **THEN** no session-expired notice is shown

#### Scenario: Sign-in destination unchanged
- **GIVEN** the notice is shown
- **WHEN** the reader signs in successfully
- **THEN** they are redirected to `/`, as in FR-2
