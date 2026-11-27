## ADDED Requirements

### Requirement: Second-factor page trail (pre-deploy-security-hardening FR-8)
`/admin/verify` SHALL show the trail «Главная › Второй код» to an admin with no verified factor and «Главная › Подтверждение входа» to an admin with one. Anyone else SHALL get no trail, as on the other admin pages.

#### Scenario: Not yet enrolled
- **GIVEN** an admin with no verified factor
- **WHEN** they open `/admin/verify`
- **THEN** the trail reads «Главная › Второй код»

#### Scenario: Enrolled
- **GIVEN** an enrolled admin with an `aal1` session
- **WHEN** they open `/admin/verify`
- **THEN** the trail reads «Главная › Подтверждение входа»

#### Scenario: Not an admin
- **GIVEN** a signed-in non-admin
- **WHEN** they open `/admin/verify`
- **THEN** no trail is shown
