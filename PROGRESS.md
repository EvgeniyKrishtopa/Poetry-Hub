# Progress

## Current change

- Change: add-ci-pipeline (`openspec/changes/add-ci-pipeline/`), parent branch `feature/add-ci-pipeline`
- Last run (add-ci-pipeline): group 8, PR #25 (merged)

## Status

- Done: add-ci-pipeline groups 1–8 except 8.1
- In progress: none
- Blocked: 8.1 — waiting for the first schedule-event deps-outdated run (Mon 2026-10-05 06:00 UTC); manual dispatch already verified (run 36845027421). See docs/deferred.md.
- Pending: archive of add-ci-pipeline, after 8.1

## Recently completed

- add-route-states: 10/10 tasks; group PRs #28–#31 merged into `feature/add-route-states`; archived to `openspec/changes/archive/2026-10-01-add-route-states/` (main specs `route-groups`, `route-states`); archive PR #32 (https://github.com/EvgeniyKrishtopa/Poetry-Hub/pull/32) merged.

## Next steps

1. Bring `feature/add-route-states` to `main` through a PR (six green checks; the user merges).
2. add-ci-pipeline, after Mon 2026-10-05 06:00 UTC: `gh run list --workflow deps-outdated.yml --event schedule`; if a run exists, remove 8.1's blocked marker (only a human or an explicit instruction clears it), tick 8.1, resolve the deferred entry, and run `opsx-apply-git add-ci-pipeline` to archive. If no run appeared, check that the workflow is still `active`.
3. Optional tidy-up: remove the duplicate `deps-audit` (any-source) entry from ruleset 24259984.
4. At deploy (deferred by the user, design.md rollout steps 3 and 5 of the archived add-contentful-home-greeting): create the Contentful webhook for the deployed URL, set CONTENTFUL_REVALIDATE_SECRET on the hosting platform, and close `docs/deferred.md`'s 9.5 item.
5. Optional follow-up from add-route-states: a `global-error.tsx` for errors thrown by the root layout itself (deliberately out of scope there).

## Paused changes

- add-ci-pipeline — paused 2026-10-02: only 8.1 left, blocked on the first scheduled deps-outdated run (Mon 2026-10-05 06:00 UTC); starting the Supabase auth change meanwhile.
- add-supabase-auth — paused 2026-10-02: artifacts drafted and Gate 1 passed after two rounds (Server Actions + next-safe-action rework, all findings fixed); waits for a separate Cache Components change (cacheComponents/reactCompiler in next.config.ts, `/` off `revalidate = 60`) to merge first. Resume with: spec-clarify (full re-sweep; earlier findings 1-4 already folded in) → spec-review (Gate 2) → test-plan → ui-plan → opsx-scaffold.

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
- Clock-in: 2026-09-30T16:10:00Z (approx.) — Clock-out: 2026-09-30T18:26:01Z
- Clock-in: 2026-10-01 (approx., session start) — Clock-out: 2026-10-01T09:50:20Z
- Clock-in: 2026-10-01T10:00:00Z (approx.) — Clock-out: 2026-10-01T10:28:17Z
- Clock-in: 2026-10-01T10:40:00Z (approx.) — Clock-out: 2026-10-01T10:33:58Z
- Clock-in: 2026-10-01T11:00:00Z (approx.) — Clock-out: 2026-10-01T10:39:45Z
- Clock-in: 2026-10-01T11:20:00Z (approx.) — Clock-out: 2026-10-01T11:01:28Z
- Clock-in: 2026-10-01T11:45:00Z (approx.) — Clock-out: 2026-10-01T11:05:24Z
