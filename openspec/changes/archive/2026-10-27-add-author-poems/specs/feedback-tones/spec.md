## REMOVED Requirements

### Requirement: Form and list errors use the danger alert (FR-4)
**Reason**: `PoemList`, whose load error this requirement covered, is removed by add-author-poems (FR-10): the home page no longer lists poems, and the new poem pages read mock data that cannot fail to load.
**Migration**: The two form scenarios move unchanged to "Form errors use the danger alert (FR-4)". The "Poems fail to load" scenario goes with `PoemList`.

## ADDED Requirements

### Requirement: Form errors use the danger alert (FR-4)
The form-level errors of `SignInForm` and `SignUpForm` SHALL render inside `<Alert tone="danger">` with their current texts.

#### Scenario: Wrong credentials
- **GIVEN** `signInAction` returns the `invalid-credentials` failure
- **WHEN** the sign-in form is submitted
- **THEN** a `role="alert"` element with the `border-danger` utility reads "Неверный адрес электронной почты
  или пароль."

#### Scenario: Sign-up failure
- **GIVEN** `signUpAction` returns the `rate-limited` failure
- **WHEN** the sign-up form is submitted
- **THEN** a `role="alert"` element with the `border-danger` utility reads "Слишком много попыток.
  Попробуйте через несколько минут."
