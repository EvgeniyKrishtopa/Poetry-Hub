## MODIFIED Requirements

### Requirement: Sign-in submission (FR-2)
The sign-in form SHALL call `signInAction`. The action SHALL validate input on the server against `signInSchema` (a valid email and a non-empty password) before any Supabase call. Invalid input SHALL return field errors, which the form shows. Valid input SHALL call Supabase `signInWithPassword`. On success the action SHALL set the session cookies and redirect to `/`. On failure the form SHALL show one form-level message chosen by failure kind. The wrong-credentials message SHALL be the same whether or not the email is registered, and after it the form SHALL show the password recovery offer (password-recovery FR-1); no other failure kind shows it.

#### Scenario: Invalid input is rejected on the server
- **GIVEN** `signInAction` is called with email "not-an-email" and an empty password
- **WHEN** it runs
- **THEN** the result has `validationErrors` for both fields
- **AND** `signInWithPassword` has not been called
- **AND** the form shows a field error for each field

#### Scenario: Successful sign-in
- **GIVEN** `signInWithPassword` resolves without error
- **WHEN** `signInAction` runs with valid input
- **THEN** `redirect` is called with `/`

#### Scenario: Wrong credentials
- **GIVEN** `signInWithPassword` returns error code `invalid_credentials`
- **WHEN** the form is submitted
- **THEN** a `role="alert"` element reads "Неверный адрес электронной почты или пароль."
- **AND** the password recovery offer is shown under it

#### Scenario: Email not confirmed
- **GIVEN** `signInWithPassword` returns error code `email_not_confirmed`
- **WHEN** the form is submitted
- **THEN** the alert reads "Сначала подтвердите адрес электронной почты: ссылка в письме, которое мы отправили."
- **AND** the password recovery offer is not shown

#### Scenario: Rate limited
- **GIVEN** `signInWithPassword` returns error code `over_request_rate_limit` or HTTP status 429
- **WHEN** the form is submitted
- **THEN** the alert reads "Слишком много попыток. Попробуйте через несколько минут."

#### Scenario: Supabase not configured
- **GIVEN** creating the server client throws `SupabaseConfigError`
- **WHEN** the form is submitted
- **THEN** the alert reads "Вход сейчас недоступен."

#### Scenario: Any other failure
- **GIVEN** `signInWithPassword` returns any other error, or the action result carries `serverError`
- **WHEN** the form is submitted
- **THEN** the alert reads "Что-то пошло не так. Попробуйте ещё раз."

### Requirement: Email confirmation route (FR-5)
`GET /auth/confirm` SHALL verify `token_hash` with Supabase `verifyOtp` when `type` is `email` or `recovery`.
- On success with `type=email` it SHALL set the session cookies and redirect with 303 to `/`.
- On success with `type=recovery` it SHALL set the session cookies and redirect with 303 to `/reset-password`.
- The `type` decides first, before the hash or the config is looked at. For `type=email`, any other `type`, or no `type`: a missing hash, a failed verification of an `email` link, or missing config SHALL redirect with 303 to `/login?error=confirm-failed`.
- For `type=recovery`: a missing hash, a failed verification, or missing config SHALL redirect with 303 to `/login?error=recovery-failed`.
- The handler SHALL read no redirect-target parameter.

`/login` SHALL show "Ссылка для подтверждения недействительна или устарела. Войдите или зарегистрируйтесь снова, чтобы получить новую ссылку." when `error=confirm-failed` is present (inside the sign-in form, as before), "Ссылка для восстановления недействительна или устарела. Введите адрес электронной почты и запросите новое письмо." with the password recovery offer when `error=recovery-failed` is present (password-recovery FR-3), the google-sign-in notice above the Google button for `google-cancelled`, `google-failed` and `google-blocked`, and no alert for any other value.

#### Scenario: Valid link
- **GIVEN** `verifyOtp` succeeds
- **WHEN** `GET /auth/confirm?token_hash=abc&type=email` is handled
- **THEN** the response is a 303 redirect to `/`

#### Scenario: Valid recovery link
- **GIVEN** `verifyOtp` succeeds
- **WHEN** `GET /auth/confirm?token_hash=abc&type=recovery` is handled
- **THEN** `verifyOtp` is called with `type` `recovery`
- **AND** the response is a 303 redirect to `/reset-password`

#### Scenario: Invalid link
- **GIVEN** any one of these, with a `type` that is not `recovery`:
  - the request has no `token_hash`;
  - the request has a `type` that is neither `email` nor `recovery`, or none;
  - `verifyOtp` returns an error for an `email` link;
  - the Supabase config is invalid.
- **WHEN** `/auth/confirm` is handled
- **THEN** the response is a 303 redirect to `/login?error=confirm-failed`
- **AND** `verifyOtp` is not called when the hash is missing or the type is neither `email` nor `recovery`

#### Scenario: Invalid recovery link
- **GIVEN** a `recovery` link with no `token_hash`, or `verifyOtp` returns an error for it, or the Supabase config is invalid
- **WHEN** `/auth/confirm?type=recovery` is handled
- **THEN** the response is a 303 redirect to `/login?error=recovery-failed`, whichever of the three it was (the type is read before the hash or the config)

#### Scenario: No open redirect
- **GIVEN** the request also carries `next=https://evil.example`
- **WHEN** `/auth/confirm` succeeds, for `type=email` or `type=recovery`
- **THEN** the redirect target is still `/` or `/reset-password`

#### Scenario: Confirm-failed message
- **GIVEN** the app is running
- **WHEN** a browser requests `/login?error=confirm-failed`
- **THEN** the confirm-failed message is shown in a `role="alert"` element

#### Scenario: Recovery-failed message
- **GIVEN** the app is running
- **WHEN** a browser requests `/login?error=recovery-failed`
- **THEN** the recovery-failed message is shown in a `role="alert"` element
- **AND** the password recovery offer is shown

#### Scenario: Google notice on the sign-in page
- **GIVEN** the app is running
- **WHEN** a browser requests `/login?error=google-failed`
- **THEN** "Не удалось войти через Google. Попробуйте ещё раз." is shown in a `role="alert"` element

## ADDED Requirements

### Requirement: Google hint on the password forms (password-recovery FR-14)
`/login` SHALL always show, directly under the Google button, the line «Регистрировались через Google? Войдите кнопкой «Войти через Google».», and `/signup` SHALL always show, directly under its Google button, the line «Уже регистрировались через Google? Нажмите «Зарегистрироваться через Google»: вы войдёте в тот же аккаунт.» Each line is static text: it SHALL NOT depend on the address or password typed, on a previous failure, or on anything read about an account, and no sign-in or sign-up answer SHALL say how an address was registered (owner, 2026-11-25; the answers stay identical for every address, FR-2 here and FR-4).

#### Scenario: Hint on a fresh sign-in page
- **GIVEN** the app is running
- **WHEN** a browser requests `/login`
- **THEN** the sign-in hint is shown directly under «Войти через Google»

#### Scenario: Hint on a fresh sign-up page
- **GIVEN** the app is running
- **WHEN** a browser requests `/signup`
- **THEN** the sign-up hint is shown directly under «Зарегистрироваться через Google»

#### Scenario: The hint does not depend on a failure
- **GIVEN** the sign-in form shows any failure, or none
- **WHEN** the page renders
- **THEN** the sign-in hint is shown unchanged

#### Scenario: Answers stay generic
- **GIVEN** an address that is tied to a Google account, and an address with no account
- **WHEN** each is used on the sign-in form with a wrong password, and on the sign-up form
- **THEN** the sign-in alert is the same wrong-credentials text for both, and the sign-up answer is the same check-email notice for both
