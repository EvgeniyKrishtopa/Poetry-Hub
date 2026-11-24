# google-sign-in Specification

## Purpose
TBD - created by archiving change google-sign-in. Update Purpose after archive.
## Requirements
### Requirement: Starting a Google sign-in (FR-G1)
Pressing the Google button on `/login` or `/signup` SHALL send the browser to Google's account chooser through Supabase Auth, remembering which page it started on. If the attempt cannot be started (missing configuration, an Auth error, a server error), the page SHALL stay where it is and show "Не удалось войти через Google. Попробуйте ещё раз." in a `role="alert"` element, with the button enabled again. At most one Google alert SHALL show at a time: this one replaces any FR-G4 or FR-G5 notice already on the page.

#### Scenario: Button starts the flow
- **GIVEN** Supabase Auth returns an authorize address for the Google provider
- **WHEN** the visitor presses «Войти через Google» on `/login`
- **THEN** the browser is redirected to that address
- **AND** the address Google returns to is the site's `/auth/callback` with `from=sign-in`

#### Scenario: Sign-up page remembers its origin
- **GIVEN** Supabase Auth returns an authorize address for the Google provider
- **WHEN** the visitor presses «Зарегистрироваться через Google» on `/signup`
- **THEN** the address Google returns to is `/auth/callback` with `from=sign-up`

#### Scenario: Start fails
- **GIVEN** starting the flow returns an Auth error, or the Supabase configuration is missing
- **WHEN** the visitor presses the Google button
- **THEN** no redirect happens
- **AND** the alert reads "Не удалось войти через Google. Попробуйте ещё раз."
- **AND** the button is enabled

#### Scenario: Retry from a page with a notice
- **GIVEN** `/login?error=google-cancelled` shows the cancelled notice
- **WHEN** the visitor presses the Google button and the start fails
- **THEN** exactly one Google alert is on the page, and it reads "Не удалось войти через Google. Попробуйте ещё раз."

#### Scenario: Pending
- **GIVEN** the visitor has pressed the Google button
- **WHEN** the start request is still running
- **THEN** the button is disabled and marked busy

### Requirement: Google button offline (FR-G2)
While the browser reports that it is offline or the connection is slow, the Google button SHALL be disabled and the site's neutral connection notice SHALL show above it, reading "Нет подключения к интернету. Вход через Google станет доступен, когда связь восстановится." offline and "Медленное подключение к интернету. Вход через Google станет доступен, когда связь улучшится." when slow. The password form stays usable. When the connection is back, the notice SHALL disappear and the button SHALL be enabled.

#### Scenario: Offline
- **GIVEN** the browser is offline
- **WHEN** `/login` or `/signup` is shown
- **THEN** the Google button is disabled
- **AND** the connection notice shows above it
- **AND** pressing the button starts nothing

#### Scenario: Slow connection
- **GIVEN** the connection is reported as slow
- **WHEN** the page is shown
- **THEN** the Google button is disabled and the slow-connection notice shows

#### Scenario: Back online
- **GIVEN** the Google button is disabled because the browser was offline
- **WHEN** the browser goes back online
- **THEN** the notice disappears and the button is enabled

### Requirement: Finishing the sign-in (FR-G3)
`GET /auth/callback` SHALL exchange the `code` Supabase sends back for a session. On success it SHALL set the session cookies and redirect with 303 to `/`, signed in, whether the account was just created or already existed, except for the case in FR-G6.

#### Scenario: New account through sign-up
- **GIVEN** a Google account whose address has no account on the site
- **WHEN** the visitor completes Google's chooser after pressing «Зарегистрироваться через Google»
- **THEN** an account is created, the response is a 303 redirect to `/`, and the header shows the visitor as signed in
- **AND** no confirmation email is sent

#### Scenario: Returning user through sign-in
- **GIVEN** an account that was created through Google
- **WHEN** the visitor signs out and then completes «Войти через Google» on `/login`
- **THEN** the response is a 303 redirect to `/` and the visitor is signed in to the same account

#### Scenario: New account through the sign-in page
- **GIVEN** an address with no account
- **WHEN** the visitor completes «Войти через Google» on `/login`
- **THEN** an account is created and the visitor lands on `/`, signed in, with no notice

### Requirement: Cancelled or failed Google sign-in (FR-G4)
When the visitor cancels on Google's screen, `/auth/callback` SHALL redirect with 303 back to the page the attempt started on, which SHALL show "Вы отменили вход через Google. Попробуйте ещё раз." When the callback has no `code`, the exchange fails for any reason other than FR-G5, or the configuration is missing, it SHALL redirect the same way, and the page SHALL show "Не удалось войти через Google. Попробуйте ещё раз." Each notice is a `role="alert"` element directly above the Google button (below the session-expired notice, above the connection notice), never inside the password form, and the button stays usable.

#### Scenario: Cancelled on the sign-up page
- **GIVEN** the attempt started on `/signup`
- **WHEN** Supabase returns to the callback with exactly the parameter set recorded for a cancel in task 1.2
- **THEN** the response is a 303 redirect to `/signup?error=google-cancelled`
- **AND** the page shows the cancelled notice and the enabled Google button

#### Scenario: Unknown refusal is a failure, not a cancel
- **GIVEN** the callback carries `error=access_denied` with an `error_code` that is neither the recorded cancel nor a known block
- **WHEN** it is handled
- **THEN** the redirect carries `error=google-failed`, not `google-cancelled`

#### Scenario: Exchange fails
- **GIVEN** the attempt started on `/login` and the code exchange returns an error other than a blocked account
- **WHEN** `/auth/callback` is handled
- **THEN** the response is a 303 redirect to `/login?error=google-failed`
- **AND** the page shows the failed notice

#### Scenario: No code
- **GIVEN** a request to `/auth/callback` with neither `code` nor `error`
- **WHEN** it is handled
- **THEN** the response is a 303 redirect to `/login?error=google-failed`
- **AND** no exchange is attempted

#### Scenario: Unknown origin
- **GIVEN** a request whose `from` is missing or any value other than `sign-in` or `sign-up`
- **WHEN** it fails
- **THEN** the redirect goes to `/login`

### Requirement: Blocked address (FR-G5)
When the address chosen on Google is banned (a new account refused by the site's ban list) or belongs to a blocked account, `/auth/callback` SHALL redirect with 303 back to the page the attempt started on, with no session, and the page SHALL show "Вход с этим адресом невозможен." in a `role="alert"` element. The notice SHALL NOT say why. The password sign-up keeps admin-moderation FR-17 unchanged.

#### Scenario: Banned address signs up
- **GIVEN** the address's hash is in the ban list and it has no account
- **WHEN** the visitor completes Google's chooser from `/signup`
- **THEN** no account is created
- **AND** the response is a 303 redirect to `/signup?error=google-blocked` showing the blocked notice

#### Scenario: Blocked account signs in
- **GIVEN** an account created through Google that the admin has since blocked
- **WHEN** the visitor completes «Войти через Google» on `/login`
- **THEN** no session is set
- **AND** the response is a 303 redirect to `/login?error=google-blocked`

#### Scenario: A block reported as access denied is not a cancel
- **GIVEN** Supabase returns to `/auth/callback` with `error=access_denied` and an error code that marks a blocked account or the ban list's refusal
- **WHEN** it is handled
- **THEN** the redirect carries `error=google-blocked`, not `google-cancelled`

### Requirement: Account already exists (FR-G6)
When the attempt started on `/signup` and the address already had an account (created through Google or with a password), `/auth/callback` SHALL sign the visitor in to that account and redirect with 303 to `/?auth-notice=account-exists`, and `/` SHALL show "Аккаунт с этой почтой уже есть — вы вошли в него." in a `role="status"` element. No second account SHALL be created. An attempt that started on `/login` SHALL show no such notice.

#### Scenario: Existing Google account presses sign-up
- **GIVEN** an account that was created through Google in an earlier sign-in
- **WHEN** the visitor completes «Зарегистрироваться через Google» on `/signup`
- **THEN** the response is a 303 redirect to `/?auth-notice=account-exists`
- **AND** the visitor is signed in and `/` shows the account-exists notice

#### Scenario: Existing password account presses sign-up
- **GIVEN** a confirmed account with a password for the same address
- **WHEN** the visitor completes «Зарегистрироваться через Google» on `/signup`
- **THEN** the visitor is signed in to that same account (same user id), and `/` shows the account-exists notice

#### Scenario: Unconfirmed password account counts as existing
- **GIVEN** a password sign-up for the same address whose confirmation link was never used, and Supabase links the Google sign-in to it (task 1.2)
- **WHEN** the visitor completes «Зарегистрироваться через Google» on `/signup`
- **THEN** `/` shows the account-exists notice

#### Scenario: Notice only for its own value
- **GIVEN** the app is running
- **WHEN** a browser requests `/` with no `auth-notice`, or with any other value
- **THEN** no account-exists notice is shown

### Requirement: Fixed redirect targets (FR-G7)
`/auth/callback` SHALL answer only GET, and its redirect target SHALL be one of `/`, `/?auth-notice=account-exists`, `/login?error=google-<reason>` or `/signup?error=google-<reason>`, never taken from a request parameter. Every response SHALL carry `Cache-Control: private, no-store`.

#### Scenario: No open redirect
- **GIVEN** a successful exchange and a request that also carries `next=https://evil.example`
- **WHEN** `/auth/callback` is handled
- **THEN** the redirect target is `/`

#### Scenario: Only GET
- **GIVEN** the app is running
- **WHEN** a POST is sent to `/auth/callback`
- **THEN** the answer is 405 and no code exchange happens

#### Scenario: Not cacheable
- **GIVEN** any outcome
- **WHEN** `/auth/callback` answers
- **THEN** the response carries `Cache-Control: private, no-store`

### Requirement: Nothing personal in logs (NFR-G1)
A failed start, and a callback that ends `failed` or `blocked`, SHALL each log exactly one line holding the reason and Supabase's error code only (the reason alone when there is no code), never the email address, the authorization code, a token or Google's error description text. A cancel SHALL log nothing.

#### Scenario: Cancel is not logged
- **GIVEN** the callback carries the recorded cancel parameters
- **WHEN** it is handled
- **THEN** nothing is logged

#### Scenario: Failed start is logged
- **GIVEN** starting the flow returns an Auth error
- **WHEN** the visitor presses the Google button
- **THEN** exactly one log line is written, holding the reason and the error code only

#### Scenario: Failure log line
- **GIVEN** the exchange fails
- **WHEN** `/auth/callback` is handled
- **THEN** exactly one log line is written, holding the reason and the error code and none of the address, the code value or a token

### Requirement: Pages stay partially prerendered (NFR-G2)
Reading the `error` and `auth-notice` parameters SHALL NOT make `/`, `/login` or `/signup` fully dynamic: each page's static shell SHALL still hold its usable form or content, with the notice rendered at request time.

#### Scenario: Build output
- **GIVEN** the change is built
- **WHEN** `npm run build` lists the routes
- **THEN** `/`, `/login` and `/signup` are listed as partially prerendered, not fully dynamic

### Requirement: Provider configured outside the app (NFR-G3)
The Google client id and secret SHALL live only in Supabase (the hosted dashboard and the local Supabase CLI environment), never in the repository or the app's environment; the app SHALL read no new environment variable for this change.

#### Scenario: No secret in the repository
- **GIVEN** the change is merged
- **WHEN** the repository is searched for a Google client secret
- **THEN** none is found, and `supabase/config.toml` reads the id and secret through `env(...)`

