# Proposal

## Why

Every quality check in Poetry Hub runs only on the developer's machine, through Husky hooks that can be skipped, never run on a fresh clone, and check only what one person pushes. PRs are merged with no server-side proof that typecheck, lint, tests, coverage, and build pass. A deferred Gate 6 finding from `add-contentful-home-greeting` already asks for this (`PROGRESS.md` next step 3). This change adds a GitHub Actions CI pipeline that runs those checks, plus dead-code, outdated-dependency, and security checks, on every PR, and blocks a merge into `main` while any of them fails.

## What Changes

- Add `.github/workflows/ci.yml`, a GitHub Actions workflow triggered on every pull request (any base branch) and on every push to `main`. Each check runs as its own job and status check.
- Checks: typecheck, lint (errors or warnings fail), unit tests with the existing 80% coverage threshold, production build, dead-code analysis with **knip**, a dependency security audit (`npm audit`, high and above), and an outdated-dependency check that fails whenever a direct dependency is behind its latest release, except packages held deliberately.
- Add npm scripts for the checks that don't have one yet (`knip`, `deps:audit`, `deps:outdated`), so every CI check is a command a developer can also run locally. `.husky/pre-push` calls `deps:audit` instead of repeating the audit command inline.
- Add `knip` and `npm-check-updates` as devDependencies, with a committed knip config and a committed hold list for the outdated check (each held package has a reason).
- Add `.nvmrc` (Node 24) so CI and local development use the same Node major.
- Bring dependencies current so the new blocking outdated check passes on its first run: patch/minor bumps (`next`, `eslint-config-next`, `react`, `react-dom`), with every major-only range (`^19`, `^4`, …) pinned to a full `^x.y.z` floor so the outdated check sees in-major releases. Three majors are held with a reason: `@types/node` at 24 (matches the Node 24 runtime), and `typescript` at 5 and `eslint` at 9 (as of 2026-09-29, `typescript-eslint` requires TypeScript `<6.1.0`, and the user chose not to take the partial 6.0 step; and `eslint-plugin-react`, `-import`, and `-jsx-a11y` support ESLint 9 at most). The TypeScript and ESLint holds are recorded in `docs/deferred.md` so the upgrade is retried once those peers catch up.
- Manual (user): enable branch protection on `main`, requiring every CI check to pass before merge.
- **Out of scope:** deployment (CD). No host is chosen yet; a later change adds it, together with the already-deferred Contentful webhook step. Also out: Dependabot, CodeQL, SonarCloud, scheduled runs.

## Requirements

- **FR-1**: The CI workflow SHALL run on every pull request, whatever its base branch, and on every push to `main`.
- **FR-2**: CI SHALL fail the `typecheck` check when `npm run typecheck` exits non-zero.
- **FR-3**: CI SHALL fail the `lint` check when ESLint reports any error or any warning.
- **FR-4**: CI SHALL fail the `test` check when any test fails or when coverage falls below the threshold in `vitest.config.mts` (80% statements, lines, and functions). That file is the only enforced definition; the pipeline doesn't restate it, and `.claude/harness.json`'s `coverageThreshold` mirrors it for the review gates.
- **FR-5**: CI SHALL fail the `build` check when `npm run build` exits non-zero. The build SHALL run without any Contentful credential or other secret.
- **FR-6**: CI SHALL fail the `knip` check when knip reports any issue of any type it reports by default, with no rule filter: unused files, exports, exported types, duplicate exports, enum and class members, `dependencies` and `devDependencies`, unlisted dependencies and binaries, and unresolved imports. Every entry the knip config ignores SHALL carry a written reason.
- **FR-7**: CI SHALL fail the `deps-audit` check when `npm audit` reports a vulnerability of severity high or critical.
- **FR-8**: CI SHALL fail the `deps-outdated` check when any direct dependency or devDependency in `package.json` has a published release newer than the version its `package.json` entry declares (the lowest version the range allows). For a package on the hold list, only newer releases within its held major version count. Every hold list entry carries a written reason.
- **FR-9**: Each check SHALL report as its own GitHub status check, and a failure in one SHALL NOT stop or hide the result of any other.
- **FR-10**: Changes SHALL reach `main` only through a pull request merged by the developer. No workflow or agent merges into `main`; this part is a process rule, which the harness already follows, not something branch protection enforces. That pull request SHALL NOT be mergeable while any CI check is failing or pending, with no bypass for anyone, admins included (branch protection, configured manually).
- **NFR-1**: The workflow SHALL run with a read-only `GITHUB_TOKEN` (`contents: read`) and use no repository secrets.
- **NFR-2**: CI SHALL install dependencies with `npm ci` from `package-lock.json`, using the Node version in `.nvmrc`. Every third-party action SHALL be pinned to a full commit SHA.
- **NFR-3**: Every CI check SHALL be performed by exactly one step that invokes an npm script defined in `package.json`, so no check logic exists only in the workflow file. Setup steps (checkout, Node setup, `npm ci`) are exempt.
- **NFR-4**: A new push to a branch or pull request SHALL cancel that branch's or pull request's in-progress CI run.
- **NFR-5**: Every CI job SHALL time out after 10 minutes.

## Acceptance Criteria

- **FR-1** — Given the workflow is on `main`, When a pull request is opened into `main` or into a feature branch, Then a CI run starts for it; and When a commit is pushed to `main`, Then a CI run starts for that push.
- **FR-2** — Given a branch that introduces a TypeScript type error, When CI runs on its pull request, Then the `typecheck` check fails.
- **FR-3** — Given a branch that introduces code producing one ESLint warning and no errors, When CI runs, Then the `lint` check fails.
- **FR-4** — Given a branch where one test fails, When CI runs, Then the `test` check fails; and Given all tests pass but statement coverage is below 80%, When CI runs, Then the `test` check fails.
- **FR-5** — Given no Contentful variables are set in CI, When the `build` check runs on a branch with no application code changes (such as this change's implementation PR), Then the build succeeds without any Contentful credential.
- **FR-6** — Given a branch that adds an exported function no module imports, When CI runs, Then the `knip` check fails and names that export.
- **FR-7** — Given the lockfile contains a package with a known high-severity advisory, When CI runs, Then the `deps-audit` check fails; and Given only low or moderate advisories, When CI runs, Then it passes.
- **FR-8** — Given a direct dependency not on the hold list declares a version older than its latest release, When CI runs, Then the `deps-outdated` check fails and names the package; and Given a held package whose only newer release is a new major, When CI runs, Then the check does not fail for it.
- **FR-9** — Given a branch that breaks lint but nothing else, When CI runs, Then `lint` fails and every other check still runs to completion and reports its own result.
- **FR-10** — Given branch protection is configured, When a pull request into `main` has a failing check, Then GitHub blocks the merge for every user, admins included, with no bypass option; and When anyone pushes a commit directly to `main`, Then the push is rejected.
- **NFR-1** — Given the workflow file, When its `permissions` and `secrets` usage are read, Then the token is `contents: read` only and no `secrets.*` reference exists.
- **NFR-2** — Given the workflow file, When every `uses:` line is read, Then each third-party action is pinned to a 40-character commit SHA, `actions/setup-node` reads `.nvmrc`, and dependencies install with `npm ci`.
- **NFR-3** — Given the workflow file, When each job's check step (the step after dependency install) is read, Then it invokes `npm run <script>` for a script in `package.json`; the only other `run:` step is the setup step `npm ci`.
- **NFR-4** — Given a CI run is in progress for a pull request, When a new commit is pushed to it, Then the earlier run is cancelled.
- **NFR-5** — Given the workflow file, When every job is read, Then each has `timeout-minutes: 10`.

## Capabilities

### New Capabilities
- `ci-pipeline`: the automated checks every pull request and every push to `main` must pass, how they report, and the constraints on how the pipeline itself runs.

### Modified Capabilities
<!-- none: no existing capability's requirements change -->

## Impact

- **New files**: `.github/workflows/ci.yml`, `.nvmrc`, `knip.jsonc`, `.ncurc.cjs` (the outdated-check hold list).
- **Changed files**: `package.json` (new scripts; new devDependencies `knip` and `npm-check-updates`; bumped versions), `package-lock.json`, `.husky/pre-push` (calls `npm run deps:audit`), `CLAUDE.md` (Commands section lists the new scripts and the CI).
- **Possibly changed source**: whatever knip flags on its first run gets removed, or ignored with a reason (see design).
- **Dependencies**: the harness denies agent installs, so the user runs every `npm install` (new devDependencies and version bumps) during implementation.
- **Workflow impact**: because the outdated check blocks, a new upstream release of any unheld dependency turns every open pull request red until someone upgrades or holds that package. The user chose this trade-off; the design keeps the fix cheap (bump, or add a hold with a reason).
- **External systems**: GitHub Actions (free for public repositories) and one manual GitHub settings change for branch protection on `main`.
