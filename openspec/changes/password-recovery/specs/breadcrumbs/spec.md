## ADDED Requirements

### Requirement: Reset-password trail (password-recovery FR-11)
The trail for `/reset-password` SHALL read «Главная › Новый пароль», in addition to the rows of FR-2. The path SHALL come from the named constant in `shared/config/account-paths.ts`, and the `@breadcrumbs` slot SHALL have a page at `/reset-password` (the slot test checks it).

#### Scenario: Reset-password trail
- **GIVEN** any visitor
- **WHEN** they open `/reset-password`
- **THEN** the trail items read, in order, «Главная», «Новый пароль»
- **AND** «Главная» links to `/`, and «Новый пароль» is not a link and has `aria-current="page"`
