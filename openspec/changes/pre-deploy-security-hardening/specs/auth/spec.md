## MODIFIED Requirements

### Requirement: Sign-in submission (FR-2)
The sign-in form SHALL call `signInAction`. The action SHALL validate input on the server against `signInSchema` (a valid email, a non-empty password and a non-empty captcha token) before any Supabase call. Invalid input SHALL return field errors, which the form shows. Valid input SHALL call Supabase `signInWithPassword` with the token as `captchaToken`; Auth's `captcha_failed` SHALL show the captcha failure message «Не удалось пройти проверку. Попробуйте ещё раз.», in a danger alert directly above the check block. On success the action SHALL set the session cookies and redirect to `/`. On failure the form SHALL show one form-level message chosen by failure kind. The wrong-credentials message SHALL be the same whether or not the email is registered, and after it the form SHALL show the password recovery offer (password-recovery FR-1); no other failure kind shows it.

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

#### Scenario: Captcha rejected
- **GIVEN** `signInWithPassword` returns error code `captcha_failed`
- **WHEN** the form is submitted
- **THEN** the alert reads the captcha failure message and the password recovery offer is not shown

### Requirement: Sign-up submission (FR-4)
The sign-up form SHALL call `signUpAction`. The action SHALL validate on the server against `signUpSchema` (a valid email, a password that meets the password rules of «Hardened password policy», and a non-empty captcha token). Valid input SHALL call Supabase `signUp` with the token as `captchaToken`; Auth's `captcha_failed` SHALL show the captcha failure message as a form-level message. Success SHALL replace the form with a "Проверьте почту" message naming the address, and the message SHALL be identical whether or not the address was already registered. A `weak_password` error SHALL show on the password field. Rate limit, missing config, other failures, and server errors SHALL show form-level messages.

#### Scenario: Short password is rejected on the server
- **GIVEN** `signUpAction` is called with a valid email and an 11-character password
- **WHEN** it runs
- **THEN** the result has a password `validationErrors` entry mentioning the 12-character minimum
- **AND** `signUp` has not been called

#### Scenario: Successful sign-up
- **GIVEN** `signUp` resolves without error
- **WHEN** the reader submits "reader@example.com" and a valid password
- **THEN** the form is replaced by a message containing "Проверьте почту" and "reader@example.com"

#### Scenario: Already-registered address
- **GIVEN** `signUp` resolves without error and returns a user with an empty `identities` array
- **WHEN** the form is submitted
- **THEN** the same "Проверьте почту" message is shown

#### Scenario: Weak password rejected by Supabase
- **GIVEN** `signUp` returns error code `weak_password`
- **WHEN** the form is submitted
- **THEN** the password field shows "Придумайте пароль надёжнее."

#### Scenario: Other sign-up failures
- **GIVEN** one of these:
  - `signUp` returns a rate-limit error;
  - creating the server client throws `SupabaseConfigError`;
  - `signUp` returns any other error, or the result carries `serverError`.
- **WHEN** the form is submitted
- **THEN** the alert reads, for each case in that order:
  - "Слишком много попыток. Попробуйте через несколько минут."
  - "Регистрация сейчас недоступна."
  - "Что-то пошло не так. Попробуйте ещё раз."

#### Scenario: Captcha rejected at sign-up
- **GIVEN** `signUp` returns error code `captcha_failed`
- **WHEN** the form is submitted
- **THEN** the alert reads the captcha failure message and no account results

## ADDED Requirements

### Requirement: Hardened password policy (pre-deploy-security-hardening FR-4)
Supabase Auth SHALL require reauthentication for a password change on a session older than 24 hours (`secure_password_change`), locally and hosted. The hosted plan (Free) has no leaked-password protection, so a new password (sign-up and recovery) SHALL have at least 12 characters (`MIN_PASSWORD_LENGTH`) and at least one lowercase Latin letter, one uppercase Latin letter, one digit and one special character from Supabase's set ``!@#$%^&*()_+-=[]{};'\:"|<>?,./`~``. Other characters, Cyrillic and spaces included, MAY appear besides these. The same rules SHALL apply in the app's schema, the local stack (`minimum_password_length`, `password_requirements`) and the hosted project. A short password SHALL show «Не менее 12 символов.»; a long enough password missing a required kind SHALL show «Добавьте строчную и заглавную латинские буквы, цифру и спецсимвол.» Sign-in SHALL keep accepting any password.

#### Scenario: Recovery still works with reauthentication on
- **GIVEN** `secure_password_change` is on
- **WHEN** a reader sets a new password from a fresh recovery link
- **THEN** the password changes

#### Scenario: Short password
- **GIVEN** the sign-up form
- **WHEN** a visitor signs up with an 11-character password
- **THEN** the field shows «Не менее 12 символов.» and no account is created

#### Scenario: A required kind of character is missing
- **GIVEN** the sign-up or new-password form
- **WHEN** a 12-character password lacks a lowercase letter, an uppercase letter, a digit or a special character
- **THEN** the field shows the composition message and Supabase is not called

#### Scenario: Existing weaker password
- **GIVEN** an account with an 8-character password
- **WHEN** its owner signs in
- **THEN** the sign-in succeeds
