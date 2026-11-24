## MODIFIED Requirements

### Requirement: Sign-in page (FR-1)
`/login` SHALL render a sign-in form with a labelled email field, a labelled password field, a "Войти" submit button, and a link to `/signup`. Below the form it SHALL render a "Войти через Google" button (google-sign-in FR-G1), shown to every visitor, separated from the form by the word "или".

#### Scenario: Sign-in page renders
- **GIVEN** the app is running
- **WHEN** a browser requests `/login`
- **THEN** the page shows a textbox labelled "Электронная почта", a password input labelled "Пароль", a button "Войти", and a link with `href` `/signup`

#### Scenario: Google button on the sign-in page
- **GIVEN** the app is running and no session exists
- **WHEN** a browser requests `/login`, including after signing out of an account made through Google
- **THEN** the page shows an enabled button "Войти через Google" below the sign-in form's "Войти" button

### Requirement: Sign-up page (FR-3)
`/signup` SHALL render a sign-up form with a labelled email field, a labelled password field, a "Зарегистрироваться" submit button, and a link to `/login`. Below the form it SHALL render a "Зарегистрироваться через Google" button (google-sign-in FR-G1), separated from the form by the word "или". `/signup` SHALL show the google-sign-in notice above the Google button for its `error` parameter (`google-cancelled`, `google-failed`, `google-blocked`) and no alert for any other value.

#### Scenario: Sign-up page renders
- **GIVEN** the app is running
- **WHEN** a browser requests `/signup`
- **THEN** the page shows labelled "Электронная почта" and "Пароль" inputs, a button "Зарегистрироваться", and a link with `href` `/login`

#### Scenario: Google button on the sign-up page
- **GIVEN** the app is running
- **WHEN** a browser requests `/signup`
- **THEN** the page shows an enabled button "Зарегистрироваться через Google" below the sign-up form's "Зарегистрироваться" button

#### Scenario: Unknown error value
- **GIVEN** the app is running
- **WHEN** a browser requests `/signup?error=anything-else`
- **THEN** no alert is shown

### Requirement: Email confirmation route (FR-5)
`GET /auth/confirm` SHALL verify `token_hash` with Supabase `verifyOtp` when `type` is `email`.
- On success it SHALL set the session cookies and redirect with 303 to `/`.
- A missing hash, any other `type`, a failed verification, or missing config SHALL redirect with 303 to `/login?error=confirm-failed`.
- The handler SHALL read no redirect-target parameter.

`/login` SHALL show "Ссылка для подтверждения недействительна или устарела. Войдите или зарегистрируйтесь снова, чтобы получить новую ссылку." when `error=confirm-failed` is present (inside the sign-in form, as before), the google-sign-in notice above the Google button for `google-cancelled`, `google-failed` and `google-blocked`, and no alert for any other value.

#### Scenario: Valid link
- **GIVEN** `verifyOtp` succeeds
- **WHEN** `GET /auth/confirm?token_hash=abc&type=email` is handled
- **THEN** the response is a 303 redirect to `/`

#### Scenario: Invalid link
- **GIVEN** any one of these:
  - the request has no `token_hash`;
  - the request has `type=recovery`;
  - `verifyOtp` returns an error;
  - the Supabase config is invalid.
- **WHEN** `/auth/confirm` is handled
- **THEN** the response is a 303 redirect to `/login?error=confirm-failed`
- **AND** `verifyOtp` is not called when the hash is missing or the type is not `email`

#### Scenario: No open redirect
- **GIVEN** the request also carries `next=https://evil.example`
- **WHEN** `/auth/confirm` succeeds
- **THEN** the redirect target is still `/`

#### Scenario: Confirm-failed message
- **GIVEN** the app is running
- **WHEN** a browser requests `/login?error=confirm-failed`
- **THEN** the confirm-failed message is shown in a `role="alert"` element

#### Scenario: Google notice on the sign-in page
- **GIVEN** the app is running
- **WHEN** a browser requests `/login?error=google-failed`
- **THEN** "Не удалось войти через Google. Попробуйте ещё раз." is shown in a `role="alert"` element
