# ci-pipeline Specification

## Purpose
TBD - created by archiving change add-ci-pipeline. Update Purpose after archive.
## Requirements
### Requirement: Pipeline triggers (FR-1)
The CI pipeline SHALL run on every pull request, whatever its base branch, and on every push to `main`.

#### Scenario: Pull request into a feature branch
- **GIVEN** the pipeline definition is on the repository's default branch
- **WHEN** a pull request is opened into a non-`main` branch
- **THEN** a CI run starts for that pull request

#### Scenario: Push to main
- **GIVEN** the pipeline definition is on `main`
- **WHEN** a commit is pushed to `main`
- **THEN** a CI run starts for that commit

### Requirement: Type check (FR-2)
The `typecheck` check SHALL fail when the project's typecheck command exits non-zero.

#### Scenario: Type error
- **GIVEN** a branch that introduces a TypeScript type error
- **WHEN** CI runs on its pull request
- **THEN** the `typecheck` check fails

### Requirement: Lint with zero warnings (FR-3)
The `lint` check SHALL fail when the linter reports any error or any warning.

#### Scenario: Single lint warning
- **GIVEN** a branch that introduces code producing exactly one lint warning and no errors
- **WHEN** CI runs
- **THEN** the `lint` check fails

### Requirement: Tests and coverage threshold (FR-4)
The `test` check SHALL fail when any unit test fails, or when statement, line, or function coverage falls below 80%. The test runner configuration SHALL be the only enforced definition of the threshold, and the pipeline SHALL NOT restate it.

#### Scenario: Failing test
- **GIVEN** a branch where one test fails
- **WHEN** CI runs
- **THEN** the `test` check fails

#### Scenario: Coverage below threshold
- **GIVEN** a branch where every test passes but statement coverage is below 80%
- **WHEN** CI runs
- **THEN** the `test` check fails

### Requirement: Production build without secrets (FR-5)
The `build` check SHALL fail when the production build exits non-zero. The build SHALL run without any Contentful credential or other secret.

#### Scenario: Build without CMS credentials
- **GIVEN** no Contentful variables are set in the CI environment
- **WHEN** the `build` check runs on a branch with no application code changes
- **THEN** the build succeeds

### Requirement: Dead-code analysis (FR-6)
The `knip` check SHALL fail when the dead-code analysis reports any issue of any type it reports by default, with no rule or issue-type filter. This includes unused files, unused exports and exported types, duplicate exports, unused enum and class members, unused `dependencies` and `devDependencies`, unlisted dependencies and binaries, and unresolved imports. Every entry the analysis ignores SHALL carry a written reason next to it.

#### Scenario: Unused export
- **GIVEN** a branch that adds an exported function that no module imports
- **WHEN** CI runs
- **THEN** the `knip` check fails and its output names that export

### Requirement: Dependency security audit (FR-7)
The `deps-audit` check SHALL fail when the dependency audit reports a vulnerability of severity high or critical, and SHALL pass when only low or moderate vulnerabilities are reported.

#### Scenario: High-severity advisory
- **GIVEN** the lockfile contains a package with a known high-severity advisory
- **WHEN** CI runs
- **THEN** the `deps-audit` check fails

#### Scenario: Only moderate advisories
- **GIVEN** the lockfile's only known advisories are low or moderate
- **WHEN** CI runs
- **THEN** the `deps-audit` check passes

### Requirement: Scheduled outdated-dependency check (FR-8)
A scheduled workflow, run weekly and on manual dispatch, SHALL run a `deps-outdated` job that fails when any direct dependency or devDependency in `package.json` has a release on the npm `latest` dist-tag newer than the version its `package.json` entry declares (the lowest version its range allows; prereleases and other dist-tags, such as canary or beta, do not count). A package on the committed hold list SHALL be held to its current major version: only newer releases within that major SHALL count as outdated for it. Every hold list entry SHALL carry a written reason. The check SHALL NOT run on pull requests and SHALL NOT be required by branch protection, because its result depends on upstream releases rather than on a pull request's changes.

#### Scenario: Unheld package behind latest
- **GIVEN** a direct dependency not on the hold list declares a version older than its latest release
- **WHEN** the scheduled workflow runs, or is dispatched manually
- **THEN** the `deps-outdated` job fails and its output names the package

#### Scenario: Held package with only a newer major
- **GIVEN** a package on the hold list whose only newer release is a new major version
- **WHEN** the scheduled workflow runs, or is dispatched manually
- **THEN** the `deps-outdated` job does not fail because of that package

#### Scenario: Held package behind within its major
- **GIVEN** a package on the hold list with a newer release inside its held major version
- **WHEN** the scheduled workflow runs, or is dispatched manually
- **THEN** the `deps-outdated` job fails and names the package

#### Scenario: Not a pull request check
- **GIVEN** any pull request
- **WHEN** CI runs on it
- **THEN** no `deps-outdated` status check appears on it, and branch protection does not require one

### Requirement: Independent check reporting (FR-9)
Each pull request check SHALL report as its own GitHub status check. A failure in one check SHALL NOT cancel, skip, or hide the result of any other check in the same run.

#### Scenario: Only lint is broken
- **GIVEN** a branch that breaks lint and nothing else
- **WHEN** CI runs
- **THEN** `lint` fails and every other check runs to completion and reports its own result

### Requirement: Merge is blocked on red checks (FR-10)
Changes SHALL reach `main` only through a pull request, and that pull request SHALL be merged by the developer. No workflow or agent merges into `main`: this part is a process rule, not something branch protection enforces, because a merge made with the developer's own credentials looks the same either way. A pull request into `main` SHALL NOT be mergeable while any pull request check is failing or still pending, and no one, repository admins included, SHALL be able to bypass this.

#### Scenario: Failing check on a PR into main
- **GIVEN** branch protection on `main` requires every pull request check, with no bypass
- **WHEN** a pull request into `main` has a failing check
- **THEN** GitHub blocks the merge for every user, admins included, and offers no "merge without waiting for requirements" option

#### Scenario: Direct push to main
- **GIVEN** branch protection on `main` requires a pull request
- **WHEN** anyone, admins included, pushes a commit directly to `main`
- **THEN** GitHub rejects the push

### Requirement: Least privilege (NFR-1)
Every workflow SHALL run with a repository token limited to reading repository contents, and SHALL reference no repository secrets.

#### Scenario: Pipeline permissions
- **GIVEN** each workflow definition
- **WHEN** its token permissions and secret references are inspected
- **THEN** the token grants read access to contents only and no secret is referenced

### Requirement: Reproducible installs and pinned actions (NFR-2)
Every workflow SHALL install dependencies strictly from the committed lockfile, SHALL use the Node version declared in the repository's version file, and SHALL pin every third-party action to a full commit SHA.

#### Scenario: Pipeline definition audit
- **GIVEN** each workflow definition
- **WHEN** every action reference and install step is inspected
- **THEN** each third-party action is pinned to a 40-character commit SHA, Node comes from the version file, and installs use the lockfile-only install command

### Requirement: Checks are local commands (NFR-3)
Every check SHALL be performed by exactly one step that invokes a script defined in `package.json`, so a developer can run any check locally with the same command and no check logic exists only in a workflow definition. Setup steps (checkout, Node setup, and the lockfile-only dependency install `npm ci`) are not checks and are exempt.

#### Scenario: Check steps call package scripts
- **GIVEN** each workflow definition
- **WHEN** every `run:` step is inspected
- **THEN** each one is either `npm ci` or `npm run <script>` for a script defined in `package.json`, and each check has exactly one `npm run <script>` step

### Requirement: Superseded runs are cancelled (NFR-4)
A new push to a branch or pull request SHALL cancel any in-progress CI run for that same branch or pull request.

#### Scenario: New commit during a run
- **GIVEN** a CI run is in progress for a pull request
- **WHEN** a new commit is pushed to that pull request
- **THEN** the earlier run is cancelled and a new run starts

### Requirement: Job time limit (NFR-5)
Every job in every workflow SHALL be stopped and marked failed if it runs longer than 10 minutes.

#### Scenario: Job timeout declared
- **GIVEN** each workflow definition
- **WHEN** every job is inspected
- **THEN** each declares a 10-minute timeout

