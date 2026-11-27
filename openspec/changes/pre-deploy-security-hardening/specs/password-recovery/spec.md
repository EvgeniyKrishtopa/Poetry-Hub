## MODIFIED Requirements

### Requirement: Recovery request and its uniform answer (FR-2)
`requestRecoveryAction` SHALL validate the address on the server against the sign-in email schema plus a non-empty captcha token before any Supabase call; an invalid address SHALL return a field error and call nothing. A valid address SHALL call Supabase `resetPasswordForEmail` with the token as `captchaToken`. The action SHALL answer `sent` for every outcome except an invalid address, the IP-wide rate limit (`over_request_rate_limit`, or HTTP 429 on an error that carries no code at all, answered `rate-limited`), a rejected captcha (`captcha_failed`, answered with the captcha failure message, which Auth decides before it looks up any address), a missing config (`unavailable`) and any other failure (`unknown`). In particular the answer SHALL be the same for an address with an account, an address without one, a blocked address, and an address Supabase refuses a repeat letter for (`over_email_send_rate_limit`). On `sent` the form SHALL show, in a neutral notice and in place of the offer's text, «Если для этого адреса есть аккаунт, мы отправили письмо со ссылкой для восстановления пароля. Ссылка действует 1 час.» The button «Отправить письмо» SHALL stay after `sent`, under the same offline, slow and pending rules (FR-7), so the reader can ask for another letter. A browser drops the focus of a button that becomes disabled while its request is pending, so when the request ends and the focus is on nothing (the page body), the offer's button SHALL take it back; focus already on another element, such as the email field after an invalid address, SHALL stay where it is. The link's lifetime SHALL be 1 hour (Supabase `otp_expiry` 3600 s, locally and hosted). The submit wrapper SHALL pass only the address and a fresh captcha token to the action, so the password entry never reaches it, and the action SHALL NOT log the address. When the error carries a code, the code alone SHALL decide: `over_email_send_rate_limit` (which also arrives as 429) is answered `sent`, and a code the action does not list is answered `unknown`, even with HTTP 429, so that a renamed per-address code can never show the rate-limited answer for an address that has an account. The HTTP status decides only when the error carries no code.

#### Scenario: Invalid address
- **GIVEN** the form holds the email "not-an-email"
- **WHEN** the reader presses «Отправить письмо»
- **THEN** the email field shows «Введите корректный адрес электронной почты.» and takes focus
- **AND** `resetPasswordForEmail` has not been called

#### Scenario: Address with an account
- **GIVEN** `resetPasswordForEmail` resolves without error
- **WHEN** the reader presses «Отправить письмо»
- **THEN** the sent notice is shown

#### Scenario: Focus after a pressed offer
- **GIVEN** the reader pressed «Отправить письмо» from the keyboard and the browser dropped the focus while the button was disabled
- **WHEN** the request ends with the sent notice
- **THEN** the focus is on «Отправить письмо» again
- **AND** after an invalid address the focus stays on the email field

#### Scenario: Asking again after a sent letter
- **GIVEN** the sent notice is shown
- **WHEN** the reader presses «Отправить письмо» again
- **THEN** `requestRecoveryAction` runs again and the sent notice is shown again

#### Scenario: Address without an account
- **GIVEN** `resetPasswordForEmail` resolves without error for an address that has no account
- **WHEN** the reader presses «Отправить письмо»
- **THEN** the sent notice is shown, with the same text as for an address with an account

#### Scenario: Repeat letter within the minute
- **GIVEN** `resetPasswordForEmail` returns error code `over_email_send_rate_limit` together with HTTP status 429
- **WHEN** the reader presses «Отправить письмо»
- **THEN** the sent notice is shown, not the rate-limited alert
- **AND** one line naming the email send limit is logged, with no address

#### Scenario: Password never reaches the action
- **GIVEN** the sign-in form holds an address and a password
- **WHEN** the reader presses «Отправить письмо»
- **THEN** the action receives the address and a captcha token only

#### Scenario: The address stays in the field
- **GIVEN** the sign-in form holds an address and the offer is shown
- **WHEN** the reader presses «Отправить письмо», whatever the outcome
- **THEN** the email field still holds the same address

#### Scenario: A new sign-in attempt clears the old outcome
- **GIVEN** the sent notice or a recovery failure is shown
- **WHEN** the reader submits the sign-in form again
- **THEN** only the sign-in result is shown, in the one alert slot above the form

#### Scenario: IP-wide limit
- **GIVEN** `resetPasswordForEmail` returns error code `over_request_rate_limit`, or HTTP status 429 with no code
- **WHEN** the reader presses «Отправить письмо»
- **THEN** the alert above the form reads «Слишком много попыток. Попробуйте через несколько минут.»

#### Scenario: Unlisted code with status 429
- **GIVEN** `resetPasswordForEmail` returns an error code the action does not list, together with HTTP status 429
- **WHEN** the reader presses «Отправить письмо»
- **THEN** the alert above the form reads «Что-то пошло не так. Попробуйте ещё раз.», not the rate-limited text

#### Scenario: Supabase not configured
- **GIVEN** creating the server client throws `SupabaseConfigError`
- **WHEN** the reader presses «Отправить письмо»
- **THEN** the alert above the form reads «Восстановление пароля сейчас недоступно.»

#### Scenario: Any other failure
- **GIVEN** `resetPasswordForEmail` returns any other error, or the action result carries `serverError`
- **WHEN** the reader presses «Отправить письмо»
- **THEN** the alert above the form reads «Что-то пошло не так. Попробуйте ещё раз.»

#### Scenario: Captcha rejected on the request
- **GIVEN** `resetPasswordForEmail` returns error code `captcha_failed`
- **WHEN** the reader presses «Отправить письмо»
- **THEN** the alert above the form reads the captcha failure message, for any address

### Requirement: The new-password page needs a session (FR-4)
`/reset-password` SHALL be rendered per request. With the search parameter `status` equal to `updated` or `updated-sign-out-failed` it SHALL show the done notice of FR-6 and read no session. Otherwise it SHALL show the new-password form only to a request with a valid recovery session: a session whose `amr` claim holds an `otp` or `recovery` entry no older than 15 minutes. A signed-out request, and a signed-in request whose session is not a recovery session, SHALL be redirected to `/login?error=recovery-failed`. A request whose session belongs to a blocked or banned account (the caller's own `is_restricted()` answer is true) SHALL be treated as signed out: the same redirect, no form, no wording about a block (FR-10). When the session check, the recovery check or the restriction check cannot tell (Supabase unreachable or not configured, or a check fails), the page SHALL show «Восстановление пароля сейчас недоступно.» in an alert and no form. The form SHALL have one field, «Новый пароль» (`type="password"`, `autocomplete="new-password"`), and a submit button «Сохранить пароль».

#### Scenario: Signed in by the recovery link
- **GIVEN** the reader followed a valid recovery link less than 15 minutes ago
- **WHEN** `/reset-password` is requested
- **THEN** the form with the field «Новый пароль» and the button «Сохранить пароль» is shown

#### Scenario: Signed out
- **GIVEN** the request carries no session
- **WHEN** `/reset-password` is requested
- **THEN** the response redirects to `/login?error=recovery-failed`

#### Scenario: Signed in with a password or Google
- **GIVEN** the request carries a session whose `amr` holds only `password` or `oauth`
- **WHEN** `/reset-password` is requested
- **THEN** the response redirects to `/login?error=recovery-failed` and no form is shown

#### Scenario: Recovery session too old
- **GIVEN** the session's `otp` entry is older than 15 minutes
- **WHEN** `/reset-password` is requested
- **THEN** the response redirects to `/login?error=recovery-failed`

#### Scenario: A blocked account holds a session
- **GIVEN** the request carries a valid session whose caller is restricted (`is_restricted()` is true)
- **WHEN** `/reset-password` is requested
- **THEN** the response redirects to `/login?error=recovery-failed`, exactly as for a signed-out request, and no form is shown

#### Scenario: Restriction check unavailable
- **GIVEN** the request carries a valid recovery session and the restriction check fails (an RPC error or a non-boolean answer)
- **WHEN** `/reset-password` is requested
- **THEN** an alert reads «Восстановление пароля сейчас недоступно.» and no form is shown

#### Scenario: Session check unavailable
- **GIVEN** the session check returns `unknown`
- **WHEN** `/reset-password` is requested
- **THEN** an alert reads «Восстановление пароля сейчас недоступно.» and no form is shown

#### Scenario: Done notice needs no session
- **GIVEN** the request carries no session
- **WHEN** `/reset-password?status=updated` is requested
- **THEN** the done notice is shown and the response is not a redirect

## ADDED Requirements

### Requirement: The password action needs a recovery session (pre-deploy-security-hardening FR-3)
`updatePasswordAction` SHALL change the password only for a recovery session as defined in FR-4 of this capability. For any other session it SHALL return the link-expired failure, consume no allowance and not call `updateUser`. When the recovery check cannot tell, it SHALL return the unavailable failure and change nothing.

#### Scenario: Stolen password session
- **GIVEN** a session opened with a password
- **WHEN** `updatePasswordAction` is called with a valid new password
- **THEN** it answers the link-expired failure, no allowance is consumed and `updateUser` is not called

#### Scenario: Recovery session
- **GIVEN** a session opened by a recovery link 5 minutes ago
- **WHEN** the action is called with a valid new password
- **THEN** the password changes and the action redirects to the done page

#### Scenario: Window passed while the form was open
- **GIVEN** the form was rendered inside the window and 15 minutes have since passed
- **WHEN** the reader saves
- **THEN** the form shows the link-expired failure
