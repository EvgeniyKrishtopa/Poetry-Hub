# Progress

## Current change

- None in progress. add-supabase-auth is complete, archived, and on `main` (PR #54, merged 2026-10-05).

## Status

- In progress: none
- Blocked: none. add-ci-pipeline 8.1 was resolved 2026-10-05 (PR #55, pending merge).
- `supabase/` (Supabase CLI config.toml) is committed on `chore/supabase-config-harness-progress` (pending PR), aligned with the design: site_url, redirect URLs, password length 8, raised sign_in_sign_ups, confirmations on. No local confirmation template.
- Audit exception: `scripts/audit-allowlist.json` allows GHSA-vfj7-8cjw-p6xm (braces, no upstream fix) until 2026-11-02 (PR #45 into `main`, synced into `feature/add-auth-flow` by PR #47).

## Recently completed

- add-supabase-auth: 20/20 tasks; group PRs #43, #44, #48, #49, #50, #51, #52 merged into `feature/add-auth-flow`; Gate 3 passed against the real Supabase project; archived to `openspec/changes/archive/2026-10-05-add-supabase-auth/` (main spec `auth`); archive PR #53 merged; parent → `main` PR #54 merged.
- audit-allowlist-braces (chore, outside OpenSpec): `deps:audit` runs `scripts/deps-audit.mjs` with an expiring allowlist; PR #45 merged into `main`, PR #47 merged into `feature/add-auth-flow`.
- migrate-to-cache-components: 6/6 tasks; archived to `openspec/changes/archive/2026-10-02-migrate-to-cache-components/`; archive PR #41 merged; parent → `main` PR #42 merged.
- add-route-states: 10/10 tasks; archived to `openspec/changes/archive/2026-10-01-add-route-states/`; archive PR #32 merged; feature PR #34 merged into `main`.

## Next steps

1. Before deploying auth (the user's checklist): custom SMTP on a verified domain; the "Confirm sign up" template link `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`; Site URL and Redirect URLs per environment (consider separate dev and prod projects); "Confirm email" on; a smoke test with a real address.
2. Merge PR #55 (add-ci-pipeline 8.1 ticked: schedule run 37319694071 found, block cleared by the user), then run `opsx-apply-git add-ci-pipeline` to archive it (archive branch off `main`; the old parent `feature/add-ci-pipeline` is fully merged and 90 commits behind).
3. Merge PR #56 (five patch upgrades from that run), PR #57 (README: auth, Cache Components, audit allowlist), and the `chore/supabase-config-harness-progress` PR (supabase/ config, every sonnet role on claude-sonnet-5-5, this file).
4. Optional: add `npm run deps:audit` to the weekly `deps-outdated.yml` so a new advisory surfaces without waiting for a PR or push.
5. By 2026-11-02: check whether braces has shipped a fix for GHSA-vfj7-8cjw-p6xm. If so, upgrade and remove the allowlist entry; otherwise review the entry again and extend its expiry with a reason.
6. For the future poems change: once accounts hold user data, revisit login-CSRF through a crafted `/auth/confirm` link (add-supabase-auth deep reviews); mitigations are a POST confirm step, or confirming without signing in.
7. Optional tidy-up: remove the duplicate `deps-audit` (any-source) entry from ruleset 24259984.
8. At deploy (deferred by the user; design.md rollout steps 3 and 5 of the archived add-contentful-home-greeting): create the Contentful webhook for the deployed URL, set CONTENTFUL_REVALIDATE_SECRET on the hosting platform, and close the 9.5 item in `docs/deferred.md`.
9. Optional follow-up from add-route-states: a `global-error.tsx` for errors thrown by the root layout itself (deliberately out of scope there).

## Paused changes

- add-ci-pipeline — paused 2026-10-02: only 8.1 left, blocked on the first scheduled deps-outdated run (Mon 2026-10-05 06:00 UTC); starting the Supabase auth change meanwhile.

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
