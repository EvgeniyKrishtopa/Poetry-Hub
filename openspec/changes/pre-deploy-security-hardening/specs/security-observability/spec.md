## ADDED Requirements

### Requirement: Errors reach the error tracker (pre-deploy-security-hardening FR-12)
An unexpected server error and an unexpected browser error SHALL reach the configured error tracker. An event SHALL carry no cookie, request header, request body, user identity, email address, token, URL query string or exception message. Unexpected throws inside Server Actions, which never reach Next's error hook, SHALL be reported too. Only errors SHALL be sent: no performance traces and no session replay. Without a configured tracker the app SHALL run unchanged.

#### Scenario: Server error
- **GIVEN** a configured tracker
- **WHEN** a request throws on the server
- **THEN** an event arrives with no cookie, header or address

#### Scenario: Server Action throw
- **GIVEN** a configured tracker
- **WHEN** an action throws unexpectedly and answers its generic message
- **THEN** one event arrives, without the exception message or the input

#### Scenario: Browser error with a token in the URL
- **GIVEN** a page URL with a query string
- **WHEN** a script error occurs
- **THEN** the event's URLs carry no query string

#### Scenario: Not configured
- **GIVEN** no DSN
- **WHEN** the app builds and runs
- **THEN** it behaves as before and sends nothing

### Requirement: Security events as structured lines (pre-deploy-security-hardening FR-13)
The server SHALL write one structured log line for each failed sign-in, each captcha or rate-limit refusal, each `42501` refusal from an `admin_*` function, and each password change refused because the session is not a recovery session (`password-change-refused`; an unavailable check writes none). `sign-in-failed` means wrong credentials, a restricted account, an unconfirmed address or a wrong admin code; a captcha or rate-limit refusal writes only its own line, and an outage writes none. Rate-limit refusals are those of the auth forms, the contact form and the admin code limit, not of content writes. A line SHALL hold only the kind, the event name and the source: no address, form input, user id, token or client IP.

#### Scenario: Wrong password
- **GIVEN** a sign-in with a wrong password
- **WHEN** the action answers
- **THEN** one `sign-in-failed` line is written, holding no address

#### Scenario: Captcha refusal
- **GIVEN** a rejected captcha token on an auth form or the contact form
- **WHEN** the action answers
- **THEN** one `captcha-refused` line names the source

#### Scenario: Password change without a recovery session
- **GIVEN** a session that is not a recovery session
- **WHEN** `updatePasswordAction` refuses it
- **THEN** one `password-change-refused` line names the source `auth`

#### Scenario: Admin refusal
- **GIVEN** an `admin_*` call answers `42501`
- **WHEN** the app handles it
- **THEN** one `admin-refused` line is written
