# Post-deploy security work

Security work that comes after the first production deploy. Source: the OWASP Top 10:2025 static review of
2026-11-27 (commit `8f90731`). Everything the review asked for before the deploy goes into the OpenSpec change
`pre-deploy-security-hardening`; this file holds the rest, so it outlives that change and is found on deploy day.

Finding ids (`A02-4` and so on) are the review's: the OWASP category, then a number. Each item restates its
finding, so the file reads on its own.

## How to use this file

- **Precondition:** `pre-deploy-security-hardening` is archived and the app is in production. Several steps rely on
  what it adds: HttpOnly session cookies, the baseline CSP, the Turnstile captcha, admin TOTP, image re-encoding,
  Sentry with security events, and the hosted config check script.
- **Order:** by risk. Steps 1 and 2 are tied to dates; the rest are taken one at a time (project-level WIP=1).
- **How:** code that touches auth, permissions or production configuration is an OpenSpec change through
  `opsx-propose-review`, with every gate. Dependencies and CI are a chore run. Dashboard settings are done by hand
  and recorded in the Deploy checklist of `docs/environment.md`.
- **When done:** set the item's status in the [Tracker](#tracker) to `done` and name the change or decision that
  closed it. Done items stay as history.

Effort: **small** is up to a day of work, **medium** is two to four days with the gates.

## 1. On deploy day: check the live address

Closes A02-4 and confirms the pre-deploy protections work on the hosted stack. Small effort, no code.

- [ ] The response carries `Strict-Transport-Security`. Vercel adds it itself; check it again for a custom
      domain. If it is missing, add it to `SECURITY_HEADERS` in `src/proxy.ts`.
- [ ] The CSP header is present, the `sb-*` cookies are HttpOnly and Secure, and there is no `X-Powered-By`.
- [ ] Password sign-in, Google sign-in and password recovery work; the captcha shows on the sign-in, sign-up,
      recovery and contact forms.
- [ ] The Vercel Firewall rule fires on a burst of POST requests from one IP.
- [ ] The admin has enrolled TOTP, and `/admin` is closed without the code.
- [ ] Signing up with a banned test address answers 403 `signup not allowed`, so the `reject_banned_signup` hook
      is registered. This is the hosted half of `admin-moderation` 2.8 in `docs/deferred.md`.
- [ ] A test error from the server and one from the browser reach Sentry, with no cookie or email address in
      the event.
- [ ] A photo uploaded with GPS data has no EXIF at its public Storage URL (`exiftool`).

## 2. One to two weeks after: alerts on the real baseline

Closes A09-1 and A09-2: today nobody would notice a password-guessing run, spam, or a broken ban hook. Small effort,
Sentry settings, no code.

- Read the baseline of the security events: failed sign-ins, captcha refusals and rate-limit refusals on an
  ordinary day.
- Send alerts to the owner by Telegram or email for:
    - a spike of failed sign-ins or rate-limit refusals, the threshold a multiple of the baseline;
    - any 42501 refusal from an admin function;
    - a new error with the `[auth]` prefix.
- Check the log retention of Vercel and Sentry: is it long enough to investigate an incident a week later?

## 3. Make a broken ban hook visible

Closes A09-3 and A10-1. `reject_banned_signup` allows the sign-up on any error (`when others`), on purpose, and only
writes `raise warning` to the Postgres log. If it breaks (a lost grant, a renamed table), bans silently stop working.
Small effort, OpenSpec change with a migration.

- In the `when others` branch, also write a row to an internal table. The hook stays fail-open: that is the
  `admin-moderation` decision.
- Show a warning on `/admin` when such rows exist for the last 24 hours, or feed them to the alerts of step 2.
  The choice belongs in the spec.

## 4. Strict `script-src`

Closes A02-1 fully. The baseline CSP has no `script-src`, so XSS protection still rests on React escaping and the
`react-markdown` allowlist alone. Medium effort: an ADR first, then an OpenSpec change.

- ADR: a nonce makes every page render dynamically and conflicts with the static shells of Cache Components.
  The alternative is script hashes through Next's experimental `sri` option; check it against the Next 16 docs
  (context7).
- Ship the policy as `Content-Security-Policy-Report-Only` first, with Turnstile (`challenges.cloudflare.com`)
  allowed and reports sent to Sentry. Collect violations on real traffic for a week.
- Switch to an enforced `Content-Security-Policy` once the reports are clean.

## 5. Session guard test and sign-out retry

Closes A10-2 and A10-3. When Supabase is down, the proxy does not redirect `/account` to `/login` (routing fails
open), which is safe only while every page calls `requireSession()` itself. And if the global sign-out after a
password change fails, other sessions stay alive with no retry. Small effort, OpenSpec change without UI.

- A test goes over every page of the `(authorized)` route group (13 today) and fails when a page without a
  session does not end on `/login`. A new page without `requireSession()` then fails CI.
- When the global sign-out after a password change fails, retry once or twice with a pause before showing
  today's message.

## 6. Supply chain

Closes A03-1 and A03-2. Package install scripts are allowed and most ranges are `^`, so a regenerated lockfile can
pull an infected minor release that runs on the developer's machine. There is no update bot, and the weekly
`deps:outdated` is already red. Small effort, chore run.

- Dependabot or Renovate: weekly grouped PRs with a delay on fresh releases (`cooldown` in Dependabot,
  `minimumReleaseAge` in Renovate), so an infected version is usually pulled before it reaches us.
- `.npmrc` with `ignore-scripts=true`, and explicit script runs for the packages that need them (`sharp` and
  others). Check that `npm ci`, the build and the tests pass.
- Settle the red `deps:outdated` (jsdom 31, supabase CLI 3): upgrade, or hold with a reason in `.ncurc.cjs`.

## 7. Session lifetime

Closes A07-6. Sessions have no inactivity timeout or time-box, and the cookie lives up to 400 days. Small effort,
dashboard setting.

- In Supabase, Authentication → Sessions: an inactivity timeout (for example 30 days) and a time-box (for example
  90 days). The setting may not be on the free plan; check the plan first.
- Add the check to the hosted config check script.

## 8. Signed Contentful webhook

Closes A08-2. `/api/revalidate` checks a static secret header, not a signature over the body with a timestamp, so a
captured request can be replayed. Its only effect today is a Contentful cache flush, hence the low priority. Small
effort, OpenSpec change without UI.

- Turn on request signing in Contentful and verify the body signature and timestamp in
  `src/shared/lib/contentful/webhook.ts` instead of the static secret. Reject requests older than a few minutes.

## 9. Blocked-account wording at sign-in

Closes A07-5, if the check in group 1 of `pre-deploy-security-hardening` confirms it: Supabase Auth checks a ban
before the password, and the form says the account is blocked for any password, so anyone can learn that an
address is registered and blocked. Small effort.

- Owner's decision: show a blocked account the generic wrong-credentials message, or keep the current one. A
  blocked author already learns about the block from the admin's email, so the generic message does not leave
  them guessing.

## 10. Hosted schema check in CI (optional)

Automates A08-1: today nothing but a manual run checks that the hosted schema matches the repository. Small effort.

- A scheduled workflow runs the hosted config check script against the hosted project.
- The cost is the first secret in CI (a Management API token); CI has none today. Do it only if deploys become
  frequent.

## Accepted risks

Six low-risk findings stay as they are: the fix costs more than the harm. Each has the signal that reopens it.

| Id | Risk | Why accepted | Reopen when |
| --- | --- | --- | --- |
| A01-2 | Login CSRF: a victim follows the attacker's own email link and ends up signed in to the attacker's account | Inherent to any sign-in by link; the Google flow is protected by PKCE | Accounts start holding private data a victim could type into someone else's account |
| A02-5 | The 6 MB Server Action body limit applies to every action, anonymous ones included | Next sets one global limit and uploads go through Server Actions; the captcha and Firewall rule cut the load | Logs show large anonymous POSTs: move uploads to Storage signed upload URLs and drop the limit to 1 MB |
| A04-1 | `banned_emails` stores an unsalted SHA-256 of the address | The table is closed to clients; the risk exists only if the database leaks | Backups start living outside Supabase: switch to an HMAC keyed by a secret in Supabase Vault |
| A06-4 | Direct profile updates skip the `profile_write` limit | The limit's goal (no cache flush in a loop) still holds | Monitoring shows a spike of writes to `author_profiles`: drop the update grant and write through a definer function |
| A06-5 | A ban is bypassed with another address or `name+1@` | A reliable ban needs identity verification, which the site does not have | Banned users come back through `+` tags: normalise the address before hashing |
| A09-4 | Reading the user list with email addresses is not logged | There is one admin, the owner | A second admin is added |

## Tracker

| # | Item | When | Closes | How | Effort | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Check the live address | Deploy day | A02-4 | No code | Small | open |
| 2 | Alerts on the real baseline | 1–2 weeks after | A09-1, A09-2 | Sentry settings | Small | open |
| 3 | Broken ban hook visible | After deploy | A09-3, A10-1 | OpenSpec change | Small | open |
| 4 | Strict `script-src` | After deploy | A02-1 | ADR, then OpenSpec change | Medium | open |
| 5 | Session guard test, sign-out retry | After deploy | A10-2, A10-3 | OpenSpec change | Small | open |
| 6 | Supply chain | After deploy | A03-1, A03-2 | Chore run | Small | open |
| 7 | Session lifetime | After deploy | A07-6 | Supabase dashboard | Small | open |
| 8 | Signed Contentful webhook | After deploy | A08-2 | OpenSpec change | Small | open |
| 9 | Blocked-account wording | If confirmed | A07-5 | Owner's decision, then a change | Small | open |
| 10 | Hosted schema check in CI | Optional | A08-1 | GitHub Actions workflow | Small | open |
