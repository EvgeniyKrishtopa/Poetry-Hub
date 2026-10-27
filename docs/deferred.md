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

- **State:** resolved (2026-10-05)
- **Requirement:** FR-8, NFR-5
- **What was missing:** proof that the weekly cron actually fires, meaning a `deps-outdated` run with event `schedule` in the Actions tab.
- **Why:** the first possible cron run is Monday 2026-10-05 06:00 UTC. The user chose (spec-clarify, 2026-09-30) to wait for a real `schedule`-event run rather than accept the workflow's registration as proof.
- **Verified instead:** the workflow file is on `main` and the workflow is `active`. Manual dispatch run 36845027421 (`workflow_dispatch`) ran one `deps-outdated` job, which failed and named `next` and `eslint-config-next` 16.3.7 → 16.3.8 and `@fission-ai/openspec` ^1.13.2 → ^1.14.0. That matches the local `npm run deps:outdated` on the same tree exactly.
- **Decision:** user, 2026-09-30 (spec-clarify, reading B).
- **Status:** resolved 2026-10-05. `gh run list --workflow deps-outdated.yml --event schedule` shows run 37319694071 (event `schedule`, branch `main`, one `deps-outdated` job, started 13:48 UTC; GitHub delayed the 06:00 cron). It failed naming five patch upgrades (`@tanstack/react-query`, `@tanstack/react-query-devtools`, `@types/node`, `@vitejs/plugin-react`, `jsdom`), exactly matching `npm run deps:outdated` run locally on `main` the same day. The user cleared the block; 8.1 is ticked and the change archived.

## add-author-poems

Archived at `openspec/changes/archive/2026-10-27-add-author-poems/`.

### add-author-poems · 6.4 — race and cache checks not recorded as scenarios

- **State:** skipped
- **Requirement:** FR-11, FR-12, FR-13, FR-14
- **What is missing:** recorded `@playwright/test` scenarios for the Gate 3 checks that need more than the dev server and the seed data: FR-13's directory → author cases (two clicks before the URL changes; skeleton, Back, the other author), the skeleton-and-Back cases for poem list → poem and author page → poem list, and the production-build checks of FR-11 (retry lock), FR-12 (error screen with the «Автор» trail) and FR-14 (cold failure, recovery a second after restart, one shared author read for two tabs). Only FR-13's "two quick clicks between poems" is recorded (`tests/web-qa-scenarios/poem-two-quick-clicks.spec.ts`).
- **Why:** the local seed data has one public author, and the second click needs a second public author as its target. Browser network throttling sends the whole page in one late response, so the skeleton never shows; only pausing the `supabase_rest_Poetry-Hub` container slows the server's author read. The FR-11, FR-12 and FR-14 checks also need `npm run build && npm run start` and stopping that container. The replay runs on `next dev` with neither.
- **Verified instead:** every case passed by hand in Gate 3 on 2026-10-27, recorded in commit 86d4552's body. FR-13 ran on `next dev` with the REST container paused, using a second public author made temporarily from the local QA row (last name set, then reset to NULL). FR-11, FR-12 and FR-14 ran on a local production build, with the REST container stopped or paused, and requests counted in the Kong access log.
- **Decision:** user, 2026-10-27 (Gate 4/5 finding CR-06/CR-13 on group 6).
- **Status:** open. To record them: add a second public author to the local seed data, and write the cases as `@local-stack` scenarios that pause the REST container and run against a production build. Both need a `tests.integration` health check, so the replay doesn't exclude them.

## refine-author-page-and-contact

Archived at `openspec/changes/archive/2026-10-27-refine-author-page-and-contact/`.

### refine-author-page-and-contact · 5.4 — contact dialog flows not recorded as scenarios

- **State:** skipped
- **Requirement:** FR-1
- **What is missing:** recorded `@playwright/test` scenarios for the contact dialog's auto-close (closes 3 s after the thank-you view, focus on «Связаться с нами», empty fields on reopen) and for «Закрыть» before 3 s cancelling it. The author page flows are recorded (`tests/web-qa-scenarios/author-page-sections.spec.ts`, plus the updated `author-poems-reading-path.spec.ts`).
- **Why:** both flows submit the contact form, and a scenario that touches a form must wait for hydration (web-qa recording rule 2), but the app has no hydration marker yet. Each successful send also reaches the real Telegram API, so the scenario would be `@external`.
- **Verified instead:** Gate 3 on 2026-10-27 passed both flows by hand: the thank-you view appeared at 986 ms and the dialog closed at about 3 995 ms with focus on «Связаться с нами»; «Закрыть» at about 0.85 s closed it at once, and a reopen at about 2.1 s stayed open past 12 s with an empty form. Unit tests in `src/features/contact/tests/components/ContactDialog.test.tsx` cover the timer cases.
- **Decision:** user, 2026-10-27 (Gate 3 recording question).
- **Status:** open. To record them: add the hydration marker (`PROGRESS.md` follow-up on the contact dialog scenarios), then record both flows as `@external` scenarios that wait for hydration before filling the form.
