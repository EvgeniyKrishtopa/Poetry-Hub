# Progress

## Current change

- None in progress. add-ci-pipeline is complete and archived (archive PR open into `main`, branch `chore/archive-add-ci-pipeline`).

## Status

- In progress: none
- Blocked: none.
- `supabase/config.toml` is on `main` (PR #58), aligned with the auth design. No local confirmation template.
- Audit exception: `scripts/audit-allowlist.json` allows GHSA-vfj7-8cjw-p6xm (braces, no upstream fix) until 2026-11-02 (PR #45 into `main`, synced into `feature/add-auth-flow` by PR #47).

## Recently completed

- add-ci-pipeline: all tasks done; 8.1 closed by PR #55 after the first scheduled deps-outdated run (37319694071); archived to `openspec/changes/archive/2026-10-06-add-ci-pipeline/` (main spec `ci-pipeline`); archive PR into `main` open.
- Chores merged into `main`: PR #56 (five patch upgrades), PR #57 (README), PR #58 (supabase config, sonnet-5-5 for every sonnet role, PROGRESS).
- add-supabase-auth: 20/20 tasks; group PRs #43, #44, #48, #49, #50, #51, #52 merged into `feature/add-auth-flow`; Gate 3 passed against the real Supabase project; archived to `openspec/changes/archive/2026-10-05-add-supabase-auth/` (main spec `auth`); archive PR #53 merged; parent → `main` PR #54 merged.
- audit-allowlist-braces (chore, outside OpenSpec): `deps:audit` runs `scripts/deps-audit.mjs` with an expiring allowlist; PR #45 merged into `main`, PR #47 merged into `feature/add-auth-flow`.
- migrate-to-cache-components: 6/6 tasks; archived to `openspec/changes/archive/2026-10-02-migrate-to-cache-components/`; archive PR #41 merged; parent → `main` PR #42 merged.
- add-route-states: 10/10 tasks; archived to `openspec/changes/archive/2026-10-01-add-route-states/`; archive PR #32 merged; feature PR #34 merged into `main`.

## Next steps

1. Merge the add-ci-pipeline archive PR into `main`.
2. Before deploying auth (the user's checklist): custom SMTP on a verified domain; the "Confirm sign up" template link `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`; Site URL and Redirect URLs per environment (consider separate dev and prod projects); "Confirm email" on; a smoke test with a real address.
3. Optional: add `npm run deps:audit` to the weekly `deps-outdated.yml` so a new advisory surfaces without waiting for a PR or push.
4. By 2026-11-02: check whether braces has shipped a fix for GHSA-vfj7-8cjw-p6xm. If so, upgrade and remove the allowlist entry; otherwise review the entry again and extend its expiry with a reason.
5. For the future poems change: once accounts hold user data, revisit login-CSRF through a crafted `/auth/confirm` link (add-supabase-auth deep reviews); mitigations are a POST confirm step, or confirming without signing in.
6. Optional tidy-up: remove the duplicate `deps-audit` (any-source) entry from ruleset 24259984.
7. At deploy (deferred by the user; design.md rollout steps 3 and 5 of the archived add-contentful-home-greeting): create the Contentful webhook for the deployed URL, set CONTENTFUL_REVALIDATE_SECRET on the hosting platform, and close the 9.5 item in `docs/deferred.md`.
8. Optional follow-up from add-route-states: a `global-error.tsx` for errors thrown by the root layout itself (deliberately out of scope there).

## Paused changes


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
- Clock-in: 2026-10-02 (approx., session start) — Clock-out: 2026-10-02T16:24:01Z
- Clock-in: 2026-10-02T16:25:00Z (approx.) — Clock-out: 2026-10-02T16:36:53Z
- Clock-in: 2026-10-02T16:40:00Z (approx.) — Clock-out: 2026-10-02T16:46:50Z
- Clock-in: 2026-10-02T16:48:00Z (approx.) — Clock-out: 2026-10-02T17:04:46Z
- Clock-in: 2026-10-02T17:06:00Z (approx.) — Clock-out: 2026-10-02T17:08:35Z
- Clock-in: 2026-10-02T17:10:00Z (approx.) — Clock-out: 2026-10-02T20:22:36Z
- Clock-in: 2026-10-02T20:55:00Z (approx.) — Clock-out: 2026-10-02T21:07:30Z
- Clock-in: 2026-10-03 (approx., session start) — Clock-out: 2026-10-03T11:10:10Z
- Clock-in: 2026-10-03T11:15:00Z (approx.) — Clock-out: 2026-10-03T11:36:34Z
- Clock-in: 2026-10-03T11:40:00Z (approx.) — Clock-out: 2026-10-03T12:36:58Z
- Clock-in: 2026-10-03T12:20:00Z (approx.) — Clock-out: 2026-10-03T13:16:45Z
- Clock-in: 2026-10-03T12:50:00Z (approx.) — Clock-out: 2026-10-03T14:02:30Z
- Clock-in: 2026-10-05 (approx., session resumed) — Clock-out: 2026-10-05T15:50:20Z
- Clock-in: 2026-10-06 (approx., session resumed) — Clock-out: 2026-10-06T15:32:53Z
