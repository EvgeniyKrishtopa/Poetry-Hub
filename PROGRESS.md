# Progress

## Current change

- Change: add-ci-pipeline (`openspec/changes/add-ci-pipeline/`), parent branch `feature/add-ci-pipeline`
- Last run: group 6 on `feature/add-ci-pipeline-ci-verify`, PR #20 (https://github.com/EvgeniyKrishtopa/Poetry-Hub/pull/20) into `feature/add-ci-pipeline` (open)
- Last commit: 93d59bb chore: log this run's checks

## Status

- Done: groups 1–5 (PRs #13–#17 merged; knip bump PR #18 merged), group 6 (live CI verification; PR #20 open)
- In progress: none
- Blocked: none (open deferred items are tracked in `docs/deferred.md`)
- Pending: group 7 (branch protection on main, manual) and group 8 (scheduled deps-outdated on main; waits for the first Monday 06:00 UTC cron run after the merge) — both judgement-heavy and both need the implementation on `main` first

## Next steps

1. Review and merge PR #20 into `feature/add-ci-pipeline`.
2. Open the implementation PR `feature/add-ci-pipeline` → `main` and merge it by hand once its six checks are green (FR-10: the developer merges into main, never an agent).
3. Run `opsx-apply-git add-ci-pipeline` for group 7: verify the push-to-main CI run, then the user adds branch protection on `main` (D9: six PR checks required, `deps-outdated` not required, no bypass incl. admins); verify a failing throwaway PR is blocked and a direct push is rejected; drop the "(add-ci-pipeline group 7)" qualifier from CLAUDE.md.
4. Group 8: dispatch `deps-outdated.yml` on `main`, then wait for the first Monday 06:00 UTC `schedule` run before archiving the change.
5. At deploy (deferred by the user, design.md rollout steps 3 and 5 of the archived add-contentful-home-greeting): create the Contentful webhook for the deployed URL, set CONTENTFUL_REVALIDATE_SECRET on the hosting platform, and close `docs/deferred.md`'s 9.5 item.
6. Optional: install `@playwright/test` as a devDependency to record Gate 3 scenarios; gitignore `.playwright-mcp/` (QA browser output, currently untracked).

## Session log

- Clock-in: 2026-09-28T10:50:03Z — Clock-out: 2026-09-28T15:55:00Z
- Clock-in: 2026-09-28T15:58:00Z (approx.) — Clock-out: 2026-09-28T16:09:28Z
- Clock-in: 2026-09-28T16:20:00Z (approx.) — Clock-out: 2026-09-28T16:28:53Z
- Clock-in: 2026-09-28T16:35:00Z (approx.) — Clock-out: 2026-09-28T16:43:59Z
- Clock-in: 2026-09-28 (approx., session start) — Clock-out: 2026-09-29T13:26:40Z
- Clock-in: 2026-09-29T13:40:00Z (approx.) — Clock-out: 2026-09-29T13:55:25Z
- Clock-in: 2026-09-29T14:00:00Z (approx.) — Clock-out: 2026-09-29T14:35:00Z
- Clock-in: 2026-09-29T14:50:00Z (approx.) — Clock-out: 2026-09-29T14:56:00Z
- Clock-in: 2026-09-29T15:10:00Z (approx.) — Clock-out: 2026-09-29T16:01:35Z
- Clock-in: 2026-09-29T16:10:00Z (approx.) — Clock-out: 2026-09-29T16:32:46Z
- Clock-in: 2026-09-30T10:50:00Z (approx.) — Clock-out: 2026-09-30T11:19:59Z
- Clock-in: 2026-09-30T12:05:00Z (approx.) — Clock-out: 2026-09-30T12:28:03Z
- Clock-in: 2026-09-30T12:40:00Z (approx.) — Clock-out: 2026-09-30T15:33:21Z
- Clock-in: 2026-09-30T15:35:00Z (approx.) — Clock-out: 2026-09-30T16:01:19Z
