## ADDED Requirements

### Requirement: SonarQube Cloud analyses the repository (pre-deploy-security-hardening FR-17)
SonarQube Cloud SHALL analyse the whole code base on the main branch, and the changed code of every pull request into `main`, and show its findings there. Pull requests between other branches may go unanalysed on the free plan. Its result SHALL NOT be a required check of the branch ruleset. No analysis token SHALL be added to CI. Tests, generated files and recorded scenarios SHALL NOT be counted as production code.

#### Scenario: Pull request with a finding
- **GIVEN** the repository is connected
- **WHEN** a pull request introduces a finding
- **THEN** the finding shows on the pull request and the merge stays possible

#### Scenario: Main branch
- **GIVEN** the repository is connected
- **WHEN** a change is merged into `main`
- **THEN** the project's dashboard reflects that commit

#### Scenario: CI stays without secrets
- **GIVEN** the analysis is set up
- **WHEN** the workflows are read
- **THEN** they reference no secret
