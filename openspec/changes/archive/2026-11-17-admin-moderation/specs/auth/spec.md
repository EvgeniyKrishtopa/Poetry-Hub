## ADDED Requirements

### Requirement: Sign-in refused for a restricted account (admin-moderation FR-16)
When Supabase Auth refuses a sign-in because the account is blocked or banned, `signInAction` SHALL return a failure of its own kind `restricted`, and the form SHALL show one form-level message that says the account is blocked, and does not say why. Sign-in of a user who is not restricted SHALL be unchanged. Supabase's refusal of a refresh for such an account SHALL end the session the way an expired session ends (the proxy reads it as signed out).

#### Scenario: Blocked user signs in
- **GIVEN** `signInWithPassword` returns the Auth error for a banned user
- **WHEN** the form is submitted
- **THEN** a `role="alert"` element shows the blocked-account message and no redirect happens

#### Scenario: Banned refresh is read as signed out
- **GIVEN** a refresh that fails with the Auth error for a banned user
- **WHEN** the claims result is read by `readClaimsState`
- **THEN** the state is signed out, not unknown

#### Scenario: Wrong credentials stay generic
- **GIVEN** `signInWithPassword` returns `invalid_credentials`
- **WHEN** the form is submitted
- **THEN** the wrong-credentials message shows, unchanged

#### Scenario: Restricted session ends
- **GIVEN** a signed-in user whose account is then blocked
- **WHEN** their access token expires and the proxy tries to refresh
- **THEN** the refresh is refused and the request is treated as signed out

### Requirement: Banned email can't sign up (admin-moderation FR-17)
A sign-up whose trimmed, lower-cased email hashes into `public.banned_emails` SHALL be rejected by the Before User Created auth hook with one fixed error code, so no account is created and no confirmation email is sent. `signUpAction` SHALL map exactly that code to its `check-email` answer, so the response is the same for every address and does not reveal that one is banned; every other sign-up error SHALL keep its existing mapping. The hook SHALL allow the sign-up on any input it does not recognise and on any internal error, and SHALL NOT be executable by `anon`, `authenticated` or `public`.

#### Scenario: Banned address
- **GIVEN** the hash of an email is in `banned_emails`
- **WHEN** someone signs up with that email
- **THEN** no user is created, and the form still shows the check-email answer

#### Scenario: Other address
- **GIVEN** an address not in `banned_emails`
- **WHEN** someone signs up with it
- **THEN** the account is created as before

#### Scenario: Unexpected hook input
- **GIVEN** a hook event with no email field
- **WHEN** the hook runs
- **THEN** it allows the sign-up

#### Scenario: Hook internal error
- **GIVEN** the hook's lookup raises an error
- **WHEN** a sign-up runs
- **THEN** the sign-up is allowed

#### Scenario: Ordinary sign-up error is unchanged
- **GIVEN** `signUp` returns the existing weak-password error
- **WHEN** `signUpAction` runs
- **THEN** the weak-password message shows, not the `check-email` answer
