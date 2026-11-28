## ADDED Requirements

### Requirement: TOTP enrolment for the admin (pre-deploy-security-hardening FR-7)
`/admin/verify` SHALL offer an admin with no verified factor to enrol: a QR code, the secret as text, and a field for the confirmation code. Enrolment SHALL start only by an explicit action, replacing any unfinished factor. The page is headed «Второй код для входа в админку»; the start button is «Настроить», the secret's label «Секрет для ручного ввода», the field «Код из приложения» (six digits, one-time code, numeric keyboard) and the button «Подтвердить»; the QR code is black on white in both themes. A correct code SHALL verify the factor, raise the session to `aal2` and lead to `/admin`. A wrong code SHALL show «Неверный код. Попробуйте ещё раз.» under the field, keeping the digits and focus, and keep the enrolment. The attempt limit SHALL show «Слишком много попыток. Попробуйте через несколько минут.» in an alert above the field, and an unavailable service «Сервис временно недоступен. Попробуйте позже.» with «Повторить» and no form. Non-admins SHALL get the same not-found screen as on `/admin`; regular users SHALL be offered no second factor.

#### Scenario: Enrol
- **GIVEN** an admin with no factor
- **WHEN** they start enrolment and enter the current code
- **THEN** they land on `/admin` with an `aal2` session

#### Scenario: Wrong code
- **GIVEN** an enrolment in progress
- **WHEN** a wrong code is entered
- **THEN** a failure shows and the session stays `aal1`

#### Scenario: Abandoned enrolment
- **GIVEN** an unverified factor from an earlier visit
- **WHEN** the admin starts again
- **THEN** a new QR code is shown without an error

#### Scenario: Not an admin
- **GIVEN** a signed-in non-admin
- **WHEN** they request `/admin/verify`
- **THEN** the not-found screen shows

#### Scenario: Too many codes
- **GIVEN** an admin who sent 5 codes within a minute
- **WHEN** a sixth is sent
- **THEN** it is refused without calling Supabase's verification

### Requirement: Code entry before the admin pages (pre-deploy-security-hardening FR-8)
An admin with a verified factor and an `aal1` session SHALL be asked for the code on `/admin/verify` before any admin page shows admin data: the heading «Подтверждение входа», the line «Введите код из приложения-аутентификатора, чтобы войти в админку.», the field «Код из приложения» and the button «Подтвердить», with the same failure texts as at enrolment. A signed-out request SHALL go to `/login`; an unreadable check SHALL show the "service unavailable" state.

#### Scenario: Password only
- **GIVEN** an enrolled admin who signed in with the password
- **WHEN** they request `/admin`, `/admin/home` or `/admin/violations`
- **THEN** they are redirected to `/admin/verify` and no admin data is in the response

#### Scenario: Correct code
- **GIVEN** `/admin/verify` for an enrolled admin
- **WHEN** the current code is entered
- **THEN** they land on `/admin` and the list shows

#### Scenario: Already verified
- **GIVEN** an `aal2` admin session
- **WHEN** `/admin/verify` is requested
- **THEN** they are redirected to `/admin`

### Requirement: The database needs the second factor (pre-deploy-security-hardening FR-9)
Every `admin_*` function SHALL answer `42501` for a session whose `aal` is not `aal2`. The admin Storage policies SHALL grant nothing and `may_moderate_author` SHALL answer false for such a session. `is_admin()` SHALL not depend on `aal`. Owners' own rights and every non-admin path SHALL be unchanged.

#### Scenario: Admin function at aal1
- **GIVEN** an admin with an `aal1` token
- **WHEN** any `admin_*` function is called
- **THEN** it answers `42501` and changes nothing

#### Scenario: Admin function at aal2
- **GIVEN** the same admin with an `aal2` token
- **WHEN** the function is called
- **THEN** it works as before

#### Scenario: Direct Storage delete at aal1
- **GIVEN** an admin with an `aal1` token
- **WHEN** they remove another author's illustration through the Storage API
- **THEN** the file stays

#### Scenario: is_admin at aal1
- **GIVEN** an admin with an `aal1` token
- **WHEN** `is_admin()` is called
- **THEN** it answers true

### Requirement: Only an admin can get a factor (pre-deploy-security-hardening FR-9, added by defect fix)
The database SHALL refuse a new second factor for an account that is not listed as an admin, however it is requested, Supabase Auth's own endpoint included. Otherwise someone holding a reader's password could add a factor of their own, after which the reader could no longer recover the password.

#### Scenario: A reader enrols through Auth directly
- **GIVEN** a signed-in account that is not an admin
- **WHEN** it asks Supabase Auth to enrol a factor
- **THEN** the request fails and no factor is stored

#### Scenario: An admin enrols
- **GIVEN** an account listed as an admin
- **WHEN** a factor is enrolled
- **THEN** it is stored
