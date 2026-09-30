# Test Plan

This change adds no application code, so no new files go in any `tests/` folder. Every row is closed by a scripted verification that a task in `tasks.md` runs. **Unit** means a static check of one config file against the criterion. **Integration** means running the npm script locally, which is the same command CI runs (NFR-3). **End-to-end** means a real GitHub Actions run on a pull request.

| Requirement | Tests | Level |
| --- | --- | --- |
| FR-1 | A PR opened into a branch starts a CI run: the implementation PR (6.1) and the throwaway PR (6.2) each show a run | end-to-end |
| FR-1 | A push to `main` starts a CI run: the merge of the implementation PR shows a run on `main` (checked in 7.1) | end-to-end |
| FR-2 | A throwaway PR commit with a type error fails `typecheck` (6.2) | end-to-end |
| FR-3 | One ESLint warning fails `npm run lint` locally (2.2), and the `lint` check on the throwaway PR (6.2) | integration, end-to-end |
| FR-4 | A failing test on the throwaway PR fails `test` (6.2) | end-to-end |
| FR-4 | Coverage below 80% fails `npm run test:coverage` (6.3) | integration |
| FR-5 | `build` passes on the implementation PR with no Contentful variable in the workflow (6.1) | end-to-end |
| FR-6 | A temporary unused export fails `npm run knip`, and the output names it (3.2) | integration |
| FR-7 | A high-severity advisory fails `deps-audit`: the `deps:audit` script checked for `--audit-level=high` (6.1; no vulnerable package is installed on purpose) | unit |
| FR-7 | Only low/moderate advisories → `deps-audit` passes on the implementation PR (6.1) | end-to-end |
| FR-8 | An unheld package behind latest fails `npm run deps:outdated`, and the output names it (2.4, before the group 4 upgrades) | integration |
| FR-8 | A held package whose only newer release is a new major isn't reported (`@types/node` 26.x, 2.4; `typescript`/`eslint` after 4.2) | integration |
| FR-8 | A held package behind within its major is reported (`@types/node` floor lowered temporarily, 2.4) | integration |
| FR-8 | Workflow inspection: `deps-outdated.yml` triggers only on `schedule` and `workflow_dispatch`, and `ci.yml`'s matrix has no `deps-outdated` entry (5.3) | unit |
| FR-8 | No `deps-outdated` check appears on the implementation PR (6.1) | end-to-end |
| FR-8 | A manual dispatch on `main` runs the `deps-outdated` job, and its result matches the local `npm run deps:outdated` (8.1) | end-to-end |
| FR-8 | The weekly cron fires: a `deps-outdated` run with event `schedule` appears after the first Monday 06:00 UTC following the merge (8.1) | end-to-end |
| FR-9 | Lint-only breakage: `lint` fails, and the other five checks still complete and report (6.2) | end-to-end |
| FR-10 | A PR into `main` with a failing check is blocked for the admin, with no bypass (7.1) | end-to-end |
| FR-10 | A direct push to `main` is rejected (7.1) | end-to-end |
| NFR-1 | Workflow inspection of both files: `permissions: contents: read` only, no `secrets.` reference (5.1, 5.3) | unit |
| NFR-2 | Workflow inspection: every `uses:` pinned to a 40-character SHA, `node-version-file: .nvmrc`, `npm ci` (5.1, 5.3) | unit |
| NFR-3 | Workflow inspection: every `run:` is `npm ci` or `npm run <script>` for a `package.json` script, and exactly one check step per job (5.1, 5.3) | unit |
| NFR-4 | A second push during a run cancels the first run (6.2) | end-to-end |
| NFR-5 | Workflow inspection: `timeout-minutes: 10` on every job in both files (5.1, 5.3) | unit |
