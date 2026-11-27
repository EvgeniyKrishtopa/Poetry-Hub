## ADDED Requirements

### Requirement: Captcha on the auth forms (pre-deploy-security-hardening FR-5)
The sign-in form, the sign-up form and the recovery request SHALL each send a Turnstile token, which the action passes to Supabase Auth as `captchaToken`; Auth captcha SHALL be on, locally and hosted. A call without a token SHALL be refused before Supabase, and a token Auth rejects SHALL show a captcha failure notice. A token SHALL be used once: the widget resets after every submission, and the submit control stays disabled until a token exists. An expired token is dropped, disabling the control until a new one arrives. When no token can be obtained (JavaScript off, the widget blocked or failing), the form SHALL show, in a danger alert in place of the check block, «Для отправки формы нужна проверка. Включите JavaScript и обновите страницу.» and keep the submit control disabled. Google sign-in SHALL need no captcha.

#### Scenario: Widget cannot run
- **GIVEN** JavaScript is off, or Cloudflare's script is blocked
- **WHEN** a visitor opens the sign-in or sign-up page
- **THEN** a danger alert reads «Для отправки формы нужна проверка. Включите JavaScript и обновите страницу.» and the submit control is disabled

#### Scenario: No token
- **GIVEN** a call to the sign-in action without a captcha token
- **WHEN** it runs
- **THEN** it is refused and `signInWithPassword` is not called

#### Scenario: Rejected token
- **GIVEN** Auth answers `captcha_failed`
- **WHEN** the visitor submits sign-in, sign-up or the recovery request
- **THEN** the captcha notice shows, and no session, account or letter results

#### Scenario: Second attempt
- **GIVEN** a sign-in failed with wrong credentials
- **WHEN** the visitor presses the recovery offer
- **THEN** the request carries a new token, not the one already used

#### Scenario: Direct API call
- **GIVEN** captcha is on
- **WHEN** a script calls the password grant with the publishable key and no token
- **THEN** Auth refuses it

#### Scenario: Google sign-in
- **GIVEN** captcha is on
- **WHEN** a reader signs in with Google
- **THEN** the sign-in succeeds, and later session refreshes succeed

### Requirement: Captcha on the contact form (pre-deploy-security-hardening FR-6)
The contact action SHALL verify the Turnstile token with `siteverify` on the server before sending anything. A missing or rejected token, a missing secret, or an unreachable verifier SHALL refuse the send and keep the visitor's input. A filled honeypot SHALL still answer as sent without verifying or sending. The widget SHALL load only once the contact dialog is open.

#### Scenario: Dialog closed
- **GIVEN** a visitor on any page who has not opened the contact dialog
- **WHEN** the page loads
- **THEN** no request goes to Cloudflare from the contact form

#### Scenario: Valid token
- **GIVEN** `siteverify` accepts the token
- **WHEN** the visitor submits the form
- **THEN** one Telegram message is sent

#### Scenario: Missing or rejected token
- **GIVEN** no token, or one `siteverify` rejects
- **WHEN** the form is submitted
- **THEN** nothing is sent and the failure shows with the typed values kept

#### Scenario: Verifier unavailable
- **GIVEN** `TURNSTILE_SECRET_KEY` is unset, or `siteverify` cannot be reached
- **WHEN** the form is submitted
- **THEN** nothing is sent and the failure shows

#### Scenario: Honeypot
- **GIVEN** the hidden field is filled
- **WHEN** the form is submitted
- **THEN** it answers as sent, and neither `siteverify` nor Telegram is called
