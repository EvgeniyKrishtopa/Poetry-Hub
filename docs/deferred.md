# Deferred items

Spec points that a finished task group did **not** fully deliver: blocked, skipped by decision, or no longer relevant. Each one is recorded here so it outlives `openspec archive`, which moves the change folder and its `tasks.md` out of sight.

## When to add an entry

At the end of every task group, before the group's commit, add an entry for each task or acceptance criterion that ends the group in one of these states:

- **blocked**: still carries `<!-- blocked: … -->` in `tasks.md`.
- **skipped**: checked, but part of its verification was waived by a user decision.
- **obsolete**: no longer relevant because the requirement changed or the approach was replaced.

The task line stays in `tasks.md`. `opsx-apply-git` reads its checkbox and `blocked` marker to pick the next run and to decide when to archive, so only a short pointer is added to the line: `<!-- deferred: docs/deferred.md -->`. The reasoning lives here, not in the comment.

## How to resolve an entry

When a later change delivers the point, or the risk is formally accepted, set **Status** to `resolved` and name the change or decision that closed it. Resolved entries stay in the file as history and are not deleted.

## Entry format

```md
### <change-slug> · <task id> — <short title>

- **State:** blocked | skipped | obsolete
- **Requirement:** <FR-/NFR- ids>
- **What is missing:** <the part not verified or delivered>
- **Why:** <reason>
- **Verified instead:** <what was checked, or "nothing">
- **Decision:** <who, date>
- **Status:** open | resolved (<change or decision>)
```

---

## add-contentful-home-greeting

Archived at `openspec/changes/archive/2026-09-29-add-contentful-home-greeting/`.

### add-contentful-home-greeting · 9.5 — live publish → fresh title

- **State:** skipped
- **Requirement:** FR-9, NFR-2
- **What is missing:** a live check that after publishing in Contentful and POSTing `/api/revalidate`, the very next load of `/` shows the new title.
- **Why:** after the user published an edited title, the Contentful Delivery API still served the old entry (`publishedAt` 2026-09-28, `publishedVersion` 10), so the fresh title could not be observed.
- **Verified instead:** production server: correct secret → 200 `{"revalidated":true}`; wrong or missing secret → 401; `GET` → 405; secret unset → 503 plus a server log line. Unit tests assert `revalidateTag("contentful", { expire: 0 })` is called only on a valid secret.
- **Decision:** user, 2026-09-29: skip the live step.
- **Status:** open. Natural place to close it is the deploy step (design.md rollout steps 3 and 5): after setting up the real Contentful webhook, publish once and confirm the page updates.

## add-ci-pipeline

### add-ci-pipeline · 4.2 — TypeScript 7 upgrade held

- **State:** skipped
- **Requirement:** FR-8
- **What is missing:** the upgrade to the latest `typescript` major (7.x). `deps-outdated` passes only because `.ncurc.cjs` holds `typescript` to major 5.
- **Why:** `typescript-eslint` (pulled in by `eslint-config-next/typescript`) declares `typescript >=4.8.4 <6.1.0` as of 2026-09-29 (unchanged on 2026-09-30, `typescript-eslint@8.71.0`). 6.0.x would fit, but the user chose to stay on 5 rather than take a partial step.
- **Verified instead:** `npm view typescript-eslint peerDependencies`; `npm run deps:outdated` exits 0 with the hold in place.
- **Decision:** user, 2026-09-29 (design.md D8).
- **Status:** open. Retry path (D8): once `npm view typescript-eslint peerDependencies` allows TS 7, delete the `typescript` hold line in `.ncurc.cjs`; `deps-outdated` then goes red and the upgrade happens as its own change. Never `--force`, `--legacy-peer-deps`, or an `.npmrc` override.

### add-ci-pipeline · 4.2 — ESLint 10 upgrade held

- **State:** skipped
- **Requirement:** FR-8
- **What is missing:** the upgrade to the latest `eslint` major (10.x). `deps-outdated` passes only because `.ncurc.cjs` holds `eslint` to major 9.
- **Why:** `eslint-plugin-react@7.37.5`, `eslint-plugin-import@2.32.0`, and `eslint-plugin-jsx-a11y@6.10.2` (pulled in by `eslint-config-next`) declare ESLint 9 at most as of 2026-09-29 (unchanged on 2026-09-30; all three are still their latest releases).
- **Verified instead:** `npm view <plugin> peerDependencies` for each plugin; `npm run deps:outdated` exits 0 with the hold in place.
- **Decision:** user, 2026-09-29 (design.md D8).
- **Status:** open. Retry path (D8): once all three plugins' `peerDependencies` allow ESLint 10, delete the `eslint` hold line in `.ncurc.cjs`; `deps-outdated` then goes red and the upgrade happens as its own change. Never `--force`, `--legacy-peer-deps`, or an `.npmrc` override.

### add-ci-pipeline · 8.1 — first scheduled deps-outdated run

- **State:** blocked
- **Requirement:** FR-8, NFR-5
- **What is missing:** proof that the weekly cron actually fires, meaning a `deps-outdated` run with event `schedule` in the Actions tab.
- **Why:** the first possible cron run is Monday 2026-10-05 06:00 UTC. The user chose (spec-clarify, 2026-09-30) to wait for a real `schedule`-event run rather than accept the workflow's registration as proof.
- **Verified instead:** the workflow file is on `main` and the workflow is `active`. Manual dispatch run 36845027421 (`workflow_dispatch`) ran one `deps-outdated` job, which failed and named `next` and `eslint-config-next` 16.3.7 → 16.3.8 and `@fission-ai/openspec` ^1.13.2 → ^1.14.0. That matches the local `npm run deps:outdated` on the same tree exactly.
- **Decision:** user, 2026-09-30 (spec-clarify, reading B).
- **Status:** open. Close it with `gh run list --workflow deps-outdated.yml --event schedule` after 2026-10-05 06:00 UTC, then tick 8.1, remove its `blocked` marker, and archive the change.

