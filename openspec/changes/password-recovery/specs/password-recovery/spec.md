## ADDED Requirements

### Requirement: Recovery offer after a wrong-credentials sign-in (FR-1)
When a sign-in fails with the wrong-credentials failure, the sign-in form SHALL show, under the error alert, the offer «Забыли пароль? Мы можем отправить на этот адрес письмо со ссылкой для восстановления.» and a button «Отправить письмо». The offer SHALL appear after every wrong-credentials failure, whether or not the typed address has an account. It SHALL NOT appear after any other failure (email not confirmed, rate limited, blocked, unavailable, unknown), and not before a first failed attempt, except when `/login` is opened with `error=recovery-failed` (FR-3), and then only until the first sign-in submit: after it, only the last sign-in result decides whether the offer and any recovery notice are shown. The button SHALL submit the form's `email` field to `requestRecoveryAction` and SHALL ignore the password field.

#### Scenario: Offer after wrong credentials
- **GIVEN** `signInWithPassword` returns error code `invalid_credentials`
- **WHEN** the sign-in form is submitted
- **THEN** the alert reads «Неверный адрес электронной почты или пароль.»
- **AND** the offer and the button «Отправить письмо» are shown under it

#### Scenario: Same offer for an unknown address
- **GIVEN** `signInWithPassword` returns `invalid_credentials` for an address that has no account
- **WHEN** the sign-in form is submitted
- **THEN** the alert and the offer are exactly those of the previous scenario

#### Scenario: No offer after another failure
- **GIVEN** `signInWithPassword` returns `email_not_confirmed`, `user_banned`, `over_request_rate_limit` or any other error
- **WHEN** the sign-in form is submitted
- **THEN** the offer and the button are not shown

#### Scenario: The recovery-failed notice ends with the first sign-in
- **GIVEN** `/login?error=recovery-failed` is open, with its alert and the offer
- **WHEN** the reader submits the sign-in form and `signInWithPassword` returns `over_request_rate_limit`
- **THEN** only the rate-limited alert is shown, and the recovery-failed alert and the offer are gone

#### Scenario: No offer on a fresh form
- **GIVEN** the app is running
- **WHEN** a browser requests `/login`
- **THEN** the offer and the button are not shown

### Requirement: Recovery request and its uniform answer (FR-2)
`requestRecoveryAction` SHALL validate the address on the server against the sign-in email schema before any Supabase call; an invalid address SHALL return a field error and call nothing. A valid address SHALL call Supabase `resetPasswordForEmail`. The action SHALL answer `sent` for every outcome except an invalid address, the IP-wide rate limit (`over_request_rate_limit`, or HTTP 429 on an error that carries no code at all, answered `rate-limited`), a missing config (`unavailable`) and any other failure (`unknown`). In particular the answer SHALL be the same for an address with an account, an address without one, a blocked address, and an address Supabase refuses a repeat letter for (`over_email_send_rate_limit`). On `sent` the form SHALL show, in a neutral notice and in place of the offer's text, «Если для этого адреса есть аккаунт, мы отправили письмо со ссылкой для восстановления пароля. Ссылка действует 1 час.» The button «Отправить письмо» SHALL stay after `sent`, under the same offline, slow and pending rules (FR-7), so the reader can ask for another letter. The link's lifetime SHALL be 1 hour (Supabase `otp_expiry` 3600 s, locally and hosted). The submit wrapper SHALL pass only the `email` entry of the form data to the action, so the password entry never reaches it, and the action SHALL NOT log the address. When the error carries a code, the code alone SHALL decide: `over_email_send_rate_limit` (which also arrives as 429) is answered `sent`, and a code the action does not list is answered `unknown`, even with HTTP 429, so that a renamed per-address code can never show the rate-limited answer for an address that has an account. The HTTP status decides only when the error carries no code.

#### Scenario: Invalid address
- **GIVEN** the form holds the email "not-an-email"
- **WHEN** the reader presses «Отправить письмо»
- **THEN** the email field shows «Введите корректный адрес электронной почты.» and takes focus
- **AND** `resetPasswordForEmail` has not been called

#### Scenario: Address with an account
- **GIVEN** `resetPasswordForEmail` resolves without error
- **WHEN** the reader presses «Отправить письмо»
- **THEN** the sent notice is shown

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
- **THEN** the action receives the address only

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

### Requirement: The recovery link opens the new-password form (FR-3)
The recovery letter's link SHALL be `/auth/confirm?token_hash=<hash>&type=recovery` (the route's own rules are auth FR-5). A valid link SHALL open a session and take the reader to `/reset-password`. A link that is invalid, expired, already used, or belongs to a blocked or banned account SHALL take the reader to `/login?error=recovery-failed`, where the sign-in form SHALL show, in an alert, «Ссылка для восстановления недействительна или устарела. Введите адрес электронной почты и запросите новое письмо.» together with the recovery offer (FR-1), so a new letter is one press away. The notice SHALL be the same for every one of those causes.

#### Scenario: Valid link
- **GIVEN** `verifyOtp` succeeds for the link's hash and `type=recovery`
- **WHEN** the reader follows the link
- **THEN** they are redirected to `/reset-password`

#### Scenario: Expired link
- **GIVEN** `verifyOtp` returns an error for the link's hash
- **WHEN** the reader follows the link
- **THEN** they are redirected to `/login?error=recovery-failed`
- **AND** the sign-in form shows the alert above and the offer with the button «Отправить письмо»

#### Scenario: Blocked account follows a link
- **GIVEN** `verifyOtp` returns error code `user_banned`
- **WHEN** the reader follows the link
- **THEN** they land on the same `/login?error=recovery-failed` notice as for an expired link, and no wording says the account is blocked

#### Scenario: Asking again from the notice
- **GIVEN** `/login?error=recovery-failed` is open and the email field holds an address
- **WHEN** the reader presses «Отправить письмо»
- **THEN** `requestRecoveryAction` runs for that address and the sent notice is shown

### Requirement: The new-password page needs a session (FR-4)
`/reset-password` SHALL be rendered per request. With the search parameter `status` equal to `updated` or `updated-sign-out-failed` it SHALL show the done notice of FR-6 and read no session. Otherwise it SHALL show the new-password form only to a request with a valid session, and a signed-out request SHALL be redirected to `/login?error=recovery-failed`. When the session check cannot tell (Supabase unreachable or not configured), the page SHALL show «Восстановление пароля сейчас недоступно.» in an alert and no form. The form SHALL have one field, «Новый пароль» (`type="password"`, `autocomplete="new-password"`), and a submit button «Сохранить пароль».

#### Scenario: Signed in by the recovery link
- **GIVEN** the reader followed a valid recovery link
- **WHEN** `/reset-password` is requested
- **THEN** the form with the field «Новый пароль» and the button «Сохранить пароль» is shown

#### Scenario: Signed out
- **GIVEN** the request carries no session
- **WHEN** `/reset-password` is requested
- **THEN** the response redirects to `/login?error=recovery-failed`

#### Scenario: Session check unavailable
- **GIVEN** the session check returns `unknown`
- **WHEN** `/reset-password` is requested
- **THEN** an alert reads «Восстановление пароля сейчас недоступно.» and no form is shown

#### Scenario: Done notice needs no session
- **GIVEN** the request carries no session
- **WHEN** `/reset-password?status=updated` is requested
- **THEN** the done notice is shown and the response is not a redirect

### Requirement: New-password validation (FR-5)
`updatePasswordAction` SHALL validate the password on the server against the sign-up password schema (at least `MIN_PASSWORD_LENGTH` characters) before any limit check or Supabase call, and return a field error for a short or empty password: «Не менее 8 символов.» A password Supabase refuses as weak (`weak_password`) SHALL show «Придумайте пароль надёжнее.» under the field. A password equal to the current one (`same_password`) SHALL show «Новый пароль должен отличаться от прежнего.» under the field. A password that passes all three SHALL be saved with `updateUser`.

#### Scenario: Short password
- **GIVEN** the form holds the password "abc"
- **WHEN** the reader presses «Сохранить пароль»
- **THEN** the field shows «Не менее 8 символов.»
- **AND** no allowance is consumed and `updateUser` has not been called

#### Scenario: Weak password
- **GIVEN** `updateUser` returns error code `weak_password`
- **WHEN** the reader presses «Сохранить пароль» with a password of 8 characters
- **THEN** the field shows «Придумайте пароль надёжнее.»

#### Scenario: Same as the current password
- **GIVEN** `updateUser` returns error code `same_password`
- **WHEN** the reader presses «Сохранить пароль»
- **THEN** the field shows «Новый пароль должен отличаться от прежнего.»

#### Scenario: Valid password
- **GIVEN** `updateUser` resolves without error
- **WHEN** the reader presses «Сохранить пароль» with a password of 8 or more characters
- **THEN** the action redirects to the success page of FR-6

### Requirement: Success notice and the end of the sessions (FR-6)
After `updateUser` succeeds, the action SHALL end the account's sessions on every device (`signOut` with scope `global`) and then redirect, outside every `try`, to `/reset-password?status=updated`. It SHALL NOT call `refresh()` and SHALL NOT swap the form for the notice in place: ending the session re-renders the page, and a page that needs a session would send a reader who has just succeeded to the expired-link notice. The page at that address SHALL show the success notice «Пароль изменён. Войдите с новым паролем.» and a link «Перейти ко входу» to `/login`. A failed sign-out SHALL NOT undo the change: the action SHALL redirect to `/reset-password?status=updated-sign-out-failed`, where the notice reads «Пароль изменён, но завершить прежние сессии не удалось. Если пароль знал кто-то ещё, смените его ещё раз позже.» with the same link, and SHALL log one line with the failure kind only.

#### Scenario: Password changed
- **GIVEN** `updateUser` resolves without error and `signOut` resolves without error
- **WHEN** the reader presses «Сохранить пароль»
- **THEN** `signOut` is called with scope `global`
- **AND** `redirect` is called with `/reset-password?status=updated`
- **AND** the page there shows «Пароль изменён. Войдите с новым паролем.» and a link «Перейти ко входу» to `/login`

#### Scenario: Sign-out fails after the change
- **GIVEN** `updateUser` resolves and `signOut` returns an error
- **WHEN** the reader presses «Сохранить пароль»
- **THEN** `redirect` is called with `/reset-password?status=updated-sign-out-failed`
- **AND** the page there shows the sign-out-failed notice and the link «Перейти ко входу»
- **AND** one line naming the failed sign-out is logged, with no password

#### Scenario: The page after success does not bounce
- **GIVEN** the session was ended by the action
- **WHEN** the browser follows the redirect
- **THEN** the done notice is shown and the reader is not sent to `/login?error=recovery-failed`

### Requirement: Offline guard (FR-7)
While `useConnection()` reports anything but online (offline or slow), the recovery button of the sign-in form and the new-password form's field and submit button SHALL be disabled, and each surface SHALL show its own standard `ConnectionNotice` (the component's default offline and slow texts) directly above its button or form: the recovery button's notice sits above that button, the new-password form's above the form. The Google button's own notice on `/login` is unchanged, so an offline `/login` that shows the offer shows two notices, each beside its own button. Both SHALL be enabled again when the connection returns. While a request of this flow is pending, that is sent and not yet answered, a click on a submit button or the Enter key in a field SHALL NOT send a second request: the buttons are disabled and a second submit is ignored. A pending request SHALL also disable the submit button. On the sign-in form, which has two submit buttons in one `<form>`, a pending sign-in or a pending recovery request SHALL disable both «Войти» and «Отправить письмо», so two requests never run at once from that form.

#### Scenario: Offline form
- **GIVEN** the browser is offline
- **WHEN** `/reset-password` is open
- **THEN** the field and «Сохранить пароль» are disabled and the connection notice is shown above the form

#### Scenario: Offline recovery button
- **GIVEN** the recovery offer is shown and the browser goes offline
- **WHEN** the reader looks at the offer
- **THEN** «Отправить письмо» is disabled and the connection notice is shown

#### Scenario: Two notices on an offline sign-in page
- **GIVEN** the recovery offer is shown and the browser is offline
- **WHEN** `/login` is rendered
- **THEN** a standard connection notice is shown directly above «Отправить письмо», and the Google button keeps its own notice above it

#### Scenario: A second click while pending sends nothing
- **GIVEN** a recovery request, or a new-password request, has been sent and has no response yet
- **WHEN** the reader clicks the submit button again, or presses Enter in a field
- **THEN** no second request is sent and the action has been called once

#### Scenario: One pending request blocks both buttons
- **GIVEN** the offer is shown on the sign-in form
- **WHEN** a sign-in or a recovery request is pending
- **THEN** both «Войти» and «Отправить письмо» are disabled until it finishes

#### Scenario: Back online
- **GIVEN** the form was disabled by the offline guard
- **WHEN** the connection returns
- **THEN** the field and the button are enabled and the notice is gone

### Requirement: Failure notices above the form (FR-8)
Every failure of the new-password step SHALL show one `Alert` of tone `danger` above the form, chosen by failure kind: a missing or ended session («Ссылка для восстановления устарела. Запросите новое письмо.», with a link «Перейти ко входу» to `/login`, and no form: there is nothing left to save), the limit (FR-9, «Слишком много попыток. Попробуйте через несколько минут.»), a missing config or an unreachable service («Восстановление пароля сейчас недоступно.»), and any other failure («Что-то пошло не так. Попробуйте ещё раз.»). Field problems (FR-5) show under the field, not in the alert. The form SHALL keep no password after a failed submit.

#### Scenario: Session ended while the form was open
- **GIVEN** the session is gone when the action runs
- **WHEN** the reader presses «Сохранить пароль»
- **THEN** the alert above the form reads «Ссылка для восстановления устарела. Запросите новое письмо.» with a link «Перейти ко входу», and no form is shown
- **AND** no allowance is consumed and `updateUser` has not been called

#### Scenario: Any other failure
- **GIVEN** `updateUser` returns any other error, or the action result carries `serverError`
- **WHEN** the reader presses «Сохранить пароль»
- **THEN** the alert above the form reads «Что-то пошло не так. Попробуйте ещё раз.»

#### Scenario: Password is not kept
- **GIVEN** any failed submit
- **WHEN** the form re-renders
- **THEN** the password field is empty

### Requirement: Limits (FR-9)
The letter request SHALL be limited by Supabase alone (one letter per address per minute and the project's hourly cap); the app SHALL add no counter for it and SHALL map the refusals as FR-2 says. The new-password step SHALL count one attempt against the scope `password_reset`, 5 per 1 minute per account, with `consume_write_allowance` (ADR 0007), after the session check and before `updateUser`. Over the limit the action SHALL return the limit failure and SHALL NOT call `updateUser`. A failed allowance check SHALL fail closed, with the generic failure notice. The migration SHALL add the scope to the function's limits and to `write_rate_limits_scope_check`.

#### Scenario: Sixth attempt within a minute
- **GIVEN** a session that already consumed 5 `password_reset` attempts in the current minute
- **WHEN** `consume_write_allowance('password_reset')` is called again
- **THEN** it returns `false`
- **AND** the alert above the form reads «Слишком много попыток. Попробуйте через несколько минут.» and `updateUser` is not called

#### Scenario: Window restarts
- **GIVEN** the window of a `password_reset` counter has passed
- **WHEN** `consume_write_allowance('password_reset')` is called
- **THEN** it returns `true` and the counter restarts at 1

#### Scenario: Allowance check fails
- **GIVEN** the `consume_write_allowance` call returns an error
- **WHEN** the reader presses «Сохранить пароль»
- **THEN** `updateUser` is not called and the alert reads «Что-то пошло не так. Попробуйте ещё раз.»

#### Scenario: Unknown scope still refused
- **GIVEN** the migration is applied
- **WHEN** a row with the scope `anything_else` is inserted into `write_rate_limits`
- **THEN** the constraint rejects it

### Requirement: A blocked account is not revealed (FR-10)
No step of the recovery flow SHALL show wording that says an address or account is blocked or banned. The letter request answers as for any address (FR-2); a link of a blocked account reads as an invalid link (FR-3); an attempt to save a password from an existing restricted session SHALL fail closed through `assert_not_restricted()` and show the generic failure notice.

#### Scenario: Blocked address asks for a letter
- **GIVEN** the address belongs to a blocked account
- **WHEN** the reader presses «Отправить письмо»
- **THEN** the sent notice is shown, with the same text as for any address

#### Scenario: Restricted session tries to save
- **GIVEN** `consume_write_allowance` raises because the caller is restricted
- **WHEN** the reader presses «Сохранить пароль»
- **THEN** `updateUser` is not called and the alert reads «Что-то пошло не так. Попробуйте ещё раз.»

### Requirement: Reset-password trail (FR-11)
`/reset-password` SHALL show the trail «Главная › Новый пароль». The path SHALL be named once in `shared/config/account-paths.ts` and the `@breadcrumbs` slot SHALL have a page at the same URL path.

#### Scenario: Trail
- **GIVEN** any visitor
- **WHEN** they open `/reset-password`
- **THEN** the trail items read, in order, «Главная», «Новый пароль»

### Requirement: Reset-password head (FR-12)
`/reset-password` SHALL declare `robots` `noindex, follow`, a plain title «Новый пароль» and its canonical URL, and SHALL NOT carry a description, an Open Graph tag or a Twitter card, like `/login` and `/signup`.

#### Scenario: Head
- **GIVEN** the application is running
- **WHEN** a crawler requests `/reset-password`
- **THEN** the HTML has `<meta name="robots" content="noindex, follow">`, a canonical link `<SITE_URL>/reset-password`, and no `description`, `og:` or `twitter:` tag

### Requirement: Reset-password is not in the sitemap (FR-13)
`/sitemap.xml` SHALL NOT list `/reset-password`.

#### Scenario: Not listed
- **GIVEN** any state of the database
- **WHEN** a crawler requests `/sitemap.xml`
- **THEN** no listed URL is `/reset-password`

### Requirement: No secrets in logs, URLs or retained state (NFR-1)
No log line, error, action result, URL or retained form state of the recovery flow SHALL hold a password, an email address, a token or a token hash. A log line SHALL name the operation and the failure kind only. The recovery offer SHALL NOT put the address in a URL.

#### Scenario: Failed request logs nothing sensitive
- **GIVEN** `resetPasswordForEmail` returns an error for the address "reader@example.test"
- **WHEN** the action runs
- **THEN** no logged line contains "reader@example.test"

#### Scenario: Failed save logs nothing sensitive
- **GIVEN** `updateUser` returns an error for the password "correct-horse-battery"
- **WHEN** the action runs
- **THEN** no logged line contains "correct-horse-battery"

### Requirement: Accessible forms (NFR-2)
The recovery button, the `/reset-password` form, their alerts and the success notice SHALL follow auth NFR-3: every field has a label, an error is tied to its field with `aria-describedby` and `aria-invalid`, an alert has `role="alert"`, the sent notice is a polite live region (`role="status"`) because its page does not reload, and each done notice of FR-6 (the success one and the sign-out-failed one) receives focus when the page loads, because it is the main content of a freshly loaded page where a live region may announce nothing.

#### Scenario: Field error wiring
- **GIVEN** the new-password form shows a field error
- **WHEN** the DOM is inspected
- **THEN** the input has `aria-invalid="true"` and `aria-describedby` pointing at the error text

#### Scenario: Done notice takes focus
- **GIVEN** `/reset-password?status=updated` or `?status=updated-sign-out-failed` has just loaded
- **WHEN** the page is first rendered in the browser
- **THEN** the done notice has focus

#### Scenario: Sent notice is a live region
- **GIVEN** the recovery request answers `sent`
- **WHEN** the notice appears
- **THEN** it is inside an element with `role="status"`

### Requirement: Tokens-only styles and no new dependency (NFR-3)
The new components SHALL use design tokens and existing `shared/ui` primitives only (no color literals), and the change SHALL add no npm dependency and no environment variable.

#### Scenario: Dependencies and colors
- **GIVEN** the change is built
- **WHEN** `package.json` and the new component styles are inspected
- **THEN** no dependency was added and no color literal appears

### Requirement: The new-password page is rendered per request (NFR-4)
`/reset-password` SHALL never be served from a shared cache: it reads the session on every request.

#### Scenario: Build route table
- **GIVEN** `npm run build` has run
- **WHEN** the route table is read
- **THEN** `/reset-password` is not a static or cached route
