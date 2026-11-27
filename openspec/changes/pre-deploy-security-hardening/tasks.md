# Tasks

Groups 4 and 5 have user-facing screens: they start only with an approved Claude Design link (`docs/claude-design.md`). Groups 6 and 7 do not depend on them and may run while they wait. Group 8 is the last deploy step. Group 9 is independent and may run at any time.

## 1. Quick fixes <!-- judgement-heavy -->

- [x] 1.1 (NFR-1) Remove the `GHSA-fc5q-39xc-vjpf` entry from `scripts/audit-allowlist.json`. Verify `npm run deps:audit` passes with no unused-entry message.
- [x] 1.2 (FR-15) `poweredByHeader: false` in `next.config.ts`. Test the config value; verify on a production build that `/` has no `X-Powered-By`.
- [x] 1.3 (FR-16) A guard at the top of `supabase/seed.sql` that raises when `auth.users` holds an address outside `example.test`. Verify `npx supabase db reset` loads the seed, and that running the seed again after adding a throwaway outside account fails and inserts nothing.
- [x] 1.4 (NFR-9) With the owner's go-ahead, on the local stack, ban a throwaway account and sign in with a wrong password. Record the error code and the message shown under this task and as an Open Question of `proposal.md`. No wording change (post-deploy item 9).
  - Result (2026-11-27, local stack, throwaway account banned through the admin API, then deleted): the password grant answers HTTP 400 `error_code: user_banned` ("User is banned") for a wrong password and for the right one alike; an unknown address answers `invalid_credentials`. The app maps `user_banned` to `restricted` (`classify-auth-error.ts`), whose message is «Аккаунт заблокирован.» (read from the code, not rendered in a browser). So anyone who knows a banned address learns that it is registered and blocked.

## 2. HttpOnly session cookies and the baseline CSP <!-- judgement-heavy -->

- [ ] 2.1 (FR-1, design D1) One function for the cookie options in `shared/lib/supabase/`, passed as `cookieOptions` to both `createServerClient` calls. Tests: the options for production and not, and both clients passing them.
- [ ] 2.2 (FR-2, design D2) Add `Content-Security-Policy` to the headers `src/proxy.ts` sets, with the Supabase origin from the config and the fallback without it. Tests: the directives, the invalid-config case, no `script-src`.
- [ ] 2.3 (FR-1, FR-2) On the running app verify: password sign-in; Google sign-in with JavaScript on and off with no CSP violation; every `sb-*` cookie `HttpOnly`; session refresh after the access token expires.
- [ ] 2.4 (NFR-5) ADR `0023`: the baseline CSP and why `script-src` waits.

## 3. Password change only from a recovery link <!-- judgement-heavy -->

- [ ] 3.1 (FR-3, design D3) On the local stack record under this task the `amr` of a recovery session, an email-confirmation session, a password session and a Google session. Stop and ask if the recovery session carries neither `otp` nor `recovery`.
- [ ] 3.2 (FR-3) `shared/lib/supabase/claims.ts`: the signed-in `ClaimsState` carries `aal` and `amr` (tests included; update its consumers). `auth/model/`: the recovery-session predicate with the named window and method values; `auth/dal/`: the check answering `recovery | not-recovery | unknown`. Tests: each method, the window's edge, no `amr` and a malformed `amr` (both `not-recovery`), an outage (`unknown`); in `claims.ts`, a missing or malformed `aal` parses as `aal1` and the session stays signed in.
- [ ] 3.3 (FR-3) Use the check in `updatePasswordAction` (before the allowance) and in `ResetPasswordContent`. Tests: each answer in both places, no allowance and no `updateUser` for a refused session. Check by hand what `/login?error=recovery-failed` shows a signed-in reader, and stop and ask if it shows neither the notice nor a way on.
- [ ] 3.4 (FR-4, design D4) `secure_password_change = true` in `config.toml`; ask the owner whether the hosted plan has leaked-password protection; if not, raise `MIN_PASSWORD_LENGTH` and `minimum_password_length` to 12, update tests and seed notes, and add MODIFIED deltas for the «8» in `auth` FR-4 and `password-recovery` FR-5. Verify a recovery on the local stack still changes the password.
- [ ] 3.5 (FR-4, NFR-5) Deploy checklist: `secure_password_change`, leaked-password protection or the length, and "require current password" (proposal, Decisions). Update the recorded password-recovery scenario if it opens the form without a recovery link.

## 4. Bot protection for auth and the contact form <!-- judgement-heavy -->

- [ ] 4.1 (FR-6, NFR-2, NFR-3, design D5) `shared/lib/turnstile/`: server-only config and `siteverify`. Tests: accepted, rejected, missing or malformed secret, network failure, no token or secret in any log.
- [ ] 4.2 (FR-5, FR-6, NFR-6, NFR-8) The widget component in `shared/ui/`: site key, script, token, reset, disabled state until a token exists, per the approved design; in the contact dialog it mounts only while the dialog is open. An expired token disables the control. The «form needs the check» notice is server-rendered (a `<noscript>` text) plus the widget's error state. Tests with the script mocked, including expiry, a script that fails to load and the server-rendered notice.
- [ ] 4.3 (FR-5) Token in the sign-in, sign-up and recovery-request schemas and actions as `captchaToken`; the `captcha` failure kind and its messages. Tests: no token, rejected token, accepted token, a reset after every submission, the recovery request using a fresh token.
- [ ] 4.4 (FR-6) The widget on the contact form and verification in `contact.actions.ts` after the honeypot. Tests for each FR-6 scenario.
- [ ] 4.5 (FR-5, NFR-7) `[auth.captcha]` in `config.toml` with Cloudflare's test secret; `.env.example` names both variables (owner confirms the file); the recorded scenarios and sign-in helper pass with the test keys; verify Google sign-in and session refresh with captcha on, and that a direct password grant without a token is refused.
- [ ] 4.6 (NFR-3, NFR-5) `docs/environment.md`: both keys, the Deploy checklist (hosted captcha; Firewall rules that count Server Action POSTs only, per IP: 10 per minute on `/login` and `/signup`, 60 per minute on all paths, page requests not counted; after the captcha works, raise per 5 minutes sign-up and sign-in to 300, token verifications to 300 and token refreshes to 1800, email limits unchanged), the statement that these forms need JavaScript; ADR `0024`: the captcha provider.

## 5. Admin TOTP second factor <!-- judgement-heavy -->

- [ ] 5.1 (FR-9, NFR-4, design D6) Migration: `assert_admin()`, the two admin Storage policies and `may_moderate_author()` require `aal2`; the `totp_verify` scope (5 per minute) in `consume_write_allowance`; down migration in the header; note the scope in ADR 0007.
- [ ] 5.2 (FR-9) pgTAP: every `admin_*` function answers `42501` at `aal1` and works at `aal2`; `is_admin()` true at `aal1`; the Storage policies and `may_moderate_author()`; update the existing admin tests' claims; the `totp_verify` limit in `write_rate_limits.test.sql`. Verify `npx supabase test db`.
- [ ] 5.3 (FR-8, NFR-8) `[auth.mfa.totp]` on in `config.toml`; `needs-second-factor` in the admin access reading; the three admin pages redirect to `/admin/verify`; controls hidden and the header link kept. (NFR-8: public pages stay partially prerendered.) Tests for each answer, including an unknown session staying `unavailable`; update `docs/architecture.md` and the boundaries test if admin takes more from auth.
- [ ] 5.4 (FR-7, FR-8, FR-13, NFR-2, NFR-6) `/admin/verify`: DAL and actions for the factor list, enrolment, code check; the two screens per the approved design; the trail per the breadcrumbs delta (its label depends on whether a verified factor exists) and noindex as the other admin pages. The `totp_verify` allowance before the code check, failing closed. Write the security line `sign-in-failed` on a wrong code and `rate-limited` on a `totp_verify` refusal (add the two calls in group 7 if it has not run yet). Tests: each FR-7 and FR-8 scenario, both lines, and no secret or code in a log.
- [ ] 5.5 (NFR-7) The seeded local admin's factor (proposal, Decisions) and a scenario helper that enters the code; the recorded admin scenarios pass.
- [ ] 5.6 (NFR-5) `docs/environment.md`: first-deploy enrolment, the lost-device path, the admin's password recovery path; hosted TOTP in the Deploy checklist; ADR `0025`: admin-only MFA, the direct-API code-guessing residual and whether the hosted plan has the MFA Verification Attempt hook.

## 6. Safe image uploads <!-- judgement-heavy -->

- [ ] 6.1 (FR-10) Owner installs `sharp` as a direct dependency with the version already in the lockfile through `next`.
- [ ] 6.2 (FR-10, design D7) The server-only re-encode module. Tests with real fixtures: GPS EXIF gone, orientation applied, trailing bytes gone, type kept, undecodable, too many pixels, output too large.
- [ ] 6.3 (FR-10) Use it in `replacePhoto` and `uploadIllustration` (create and edit). Tests: the uploaded body is the re-encoded one; a failure stores nothing and shows the existing message.
- [ ] 6.4 (FR-11, NFR-4, design D8) First check whether Storage evaluates the insert policy in the transaction that writes the object row, and record it here. Migration: the helper (answers only for the caller's own folder; with the advisory lock if the check allows it) and both insert policies; down migration in the header. pgTAP: at and below each cap, another author's folder answers false, restricted account still refused. Verify the helper counts past RLS.
- [ ] 6.5 (FR-10, FR-11) On the local stack upload a GPS JPEG through the app and check the stored object; push a direct upload past a cap and see it refused; send a parallel burst and record how many objects land. If the cap leaks, ask the owner before the group ends.
- [ ] 6.6 (NFR-5) ADR `0026`: uploads are capped, amending ADR 0009 Decision 6 and ADR 0010's closing line, with the concurrency result.

## 7. Observability <!-- judgement-heavy -->

- [ ] 7.1 (FR-13, NFR-2, design D9) `shared/lib/security-log/` with the closed event union. Tests: the exact line shape.
- [ ] 7.2 (FR-13) Call it for failed sign-ins, captcha and rate-limit refusals (auth and contact) and admin `42501`. Tests per event, each asserting no address or input. If group 4 has not run, add the captcha events there; if group 5 has not run, add the admin-code events there. A recovery refused for an enrolled admin (`insufficient_aal`) shows the generic failure.
- [ ] 7.3 (FR-12, NFR-3) Owner creates the Sentry project and installs `@sentry/nextjs`; `src/instrumentation.ts`, `src/instrumentation-client.ts`, the scrubbing function. Tests of the scrubbing: cookies, headers, body, user, query strings, exception messages.
- [ ] 7.4 (FR-12, design D9) The server reporter in `shared/lib/error-reporting/` called from `createActionClient`'s `handleServerError`; reporting from `app/error.tsx` and a new `app/global-error.tsx`, which reuses the existing root error screen's look and copy. Tests: an action throw is reported once without message or input; no DSN means no call.
- [ ] 7.5 (FR-12, NFR-2) With a test DSN from the owner, trigger a server and a browser error and check both events.
- [ ] 7.6 (NFR-5) `docs/environment.md`: the variable, the Deploy checklist steps (including Sentry's "prevent storing IP addresses"), the privacy policy update naming the tracker and Cloudflare (owner, Contentful). No alert rules.

## 8. Hosted config check <!-- judgement-heavy -->

- [ ] 8.1 (FR-14, design D10) Confirm the Management API field names with context7 and record them under this task. The comparison module with tests: each mismatch, all correct, a missing field, an unparseable migration list, a different linked project, an `example.test` account, no secret in the output. Module and tests under `scripts/`; add `scripts/tests/**` to `vitest.config.mts`.
- [ ] 8.2 (FR-14, NFR-3) `scripts/check-hosted-config.mjs` and its npm script. Verify it fails without a token and prints no response body; keep `knip` and lint green.
- [ ] 8.3 (FR-14, NFR-5) Deploy checklist boxes for what no API covers: bucket limits, asymmetric JWT signing keys, Firewall rules; how to run the script. The owner runs it against the hosted project.
- [ ] 8.4 (NFR-2, NFR-5) Check the whole change: every manual step is in the Deploy checklist, the ADRs exist, no log or output carries personal data, and `knip.jsonc` holds no entry of this change (the scaffold added temporary ones; each group removes those of the files it wires).

## 9. Static analysis <!-- judgement-heavy -->

- [ ] 9.1 (FR-17) Owner signs in to SonarQube Cloud with GitHub, imports the repository on the free plan and enables automatic analysis. Record the project key under this task.
- [ ] 9.2 (FR-17) The repository's settings file for automatic analysis: sources, and the exclusions (tests, generated files, recorded scenarios). Confirm the file name and keys in the SonarQube Cloud docs first. Verify no workflow gains a secret and the ruleset does not require the check.
- [ ] 9.3 (FR-17, NFR-5) Open a pull request into `main` and check the analysis shows on it; record whether a pull request between two other branches (a group branch into its parent) is analysed too. Record the first report's findings by severity under this task and ask the owner what to do with the high ones. Document the setup in `docs/environment.md` and ADR `0027`: report-only static analysis.

