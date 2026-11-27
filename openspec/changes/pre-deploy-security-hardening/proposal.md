# Proposal

## Why

A static OWASP Top 10:2025 review (2026-11-27, commit `8f90731`) found no critical unconditional vulnerability, but several high and medium gaps that must close before the first production deploy. The app has never been deployed, so no existing user, session or stored file has to be migrated. Finding ids in brackets are the review's. Post-deploy work is in `docs/security-post-deploy.md`.

## What Changes

Nine groups, in this order.

1. **Quick fixes.** Remove the stale `GHSA-fc5q-39xc-vjpf` entry from `scripts/audit-allowlist.json` [A03-3]; stop sending `X-Powered-By` [A02-6]; `supabase/seed.sql` aborts on a database that holds an account outside `example.test` [A04-3]; record what a wrong password on a banned account shows [A07-5].
2. **Session cookies and a baseline CSP.** Auth cookies become `HttpOnly`, `SameSite=Lax`, `Secure` in production; responses carry a `Content-Security-Policy` with the directives that need no nonce [A02-1 partly, A02-2, A04-2].
3. **BREAKING: password change only from a recovery link.** `/reset-password` and its action accept only a recently opened recovery session; `secure_password_change` on; leaked-password protection, or a 12-character minimum [A07-1, A07-3].
4. **BREAKING: bot protection** (UI). Cloudflare Turnstile on sign-in, sign-up, the recovery request and the contact form; Vercel Firewall rules [A06-1, A06-2, A07-4]. Password sign-in, sign-up, recovery and contact then require JavaScript.
5. **BREAKING: admin TOTP second factor** (UI, migration). Admin tools and `admin_*` functions need an `aal2` session [A07-2].
6. **Safe image uploads** (migration). Every uploaded image is re-encoded without metadata; the number of objects per author folder is capped in the database [A01-1, A06-3, A08-3].
7. **Observability.** Server and browser errors reach an error tracker without personal data; security events are structured log lines [A09-1, A09-2].
8. **Hosted config check**, the deploy gate. A script compares the hosted project with the expected setup; what no API covers becomes Deploy checklist boxes [A02-3, A04-4, A08-1].
9. **Static analysis.** SonarQube Cloud analyses the public repository and reports on pull requests; it blocks no merge. Independent of the other groups (added by the owner, 2026-11-27).

Groups 4 and 5 have user-facing screens and wait for an approved Claude Design link (`docs/claude-design.md`).

**Out of scope:** everything in `docs/security-post-deploy.md` (strict `script-src`, alert rules, a visible broken ban hook, session time-box, signed Contentful webhooks, Dependabot and `ignore-scripts`, the blocked-account wording); a second factor for regular users; signed Storage upload URLs.

## Requirements

| Id | Requirement | Group |
| --- | --- | --- |
| FR-1 | Auth cookies are not readable by page scripts | 2 |
| FR-2 | Responses carry the baseline CSP | 2 |
| FR-3 | The app sets a new password only for a recent recovery session (Supabase's own endpoint is bounded by FR-4) | 3 |
| FR-4 | Hardened password policy (reauthentication; leaked-password protection or 12 characters) | 3 |
| FR-5 | Sign-in, sign-up and the recovery request need a valid captcha token | 4 |
| FR-6 | The contact form needs a valid captcha token | 4 |
| FR-7 | The admin enrols a TOTP factor | 5 |
| FR-8 | Admin pages ask for the code before showing anything | 5 |
| FR-9 | The database refuses admin work without `aal2` | 5 |
| FR-10 | Images the app stores carry no metadata and no trailing bytes (a direct Storage upload is not re-encoded) | 6 |
| FR-11 | An author folder holds a bounded number of objects | 6 |
| FR-12 | Server and browser errors reach the error tracker | 7 |
| FR-13 | Security events are logged as structured lines | 7 |
| FR-14 | A script checks the hosted project against the expected setup | 8 |
| FR-15 | Responses do not name the framework | 1 |
| FR-16 | The seed refuses a database with real accounts | 1 |
| FR-17 | SonarQube Cloud analyses the repository and shows its findings, blocking no merge | 9 |
| NFR-1 | The dependency audit passes with no unneeded allowlist entry | 1 |
| NFR-2 | No secret, address, token, cookie, form input or client IP in logs, tracker events or script output | 4, 5, 7, 8 |
| NFR-3 | Secrets are server-only or stay on the developer's machine | 4, 7, 8 |
| NFR-4 | Every new `security definer` function has an empty `search_path` and no execute for `public`, `anon`; each migration documents its down migration | 5, 6 |
| NFR-5 | Every manual dashboard step is in the Deploy checklist; lasting decisions are ADRs | all |
| NFR-6 | New UI is Russian, accessible and built from design tokens | 4, 5 |
| NFR-7 | Local development, CI and the recorded Playwright scenarios keep working, with Cloudflare's test keys | 4, 5 |
| NFR-8 | `/login`, `/signup` and public pages stay partially prerendered | 4, 5 |
| NFR-9 | The banned-account sign-in behaviour is checked and recorded | 1 |

## Capabilities

### New Capabilities

- `session-hardening`: how the auth cookies are issued.
- `bot-protection`: the captcha on the auth forms and the contact form.
- `admin-second-factor`: TOTP enrolment, code entry and the `aal2` requirement.
- `safe-image-uploads`: re-encoding and the per-folder cap.
- `security-observability`: error tracking and security event lines.
- `deploy-readiness`: the hosted config check and the seed guard.
- `static-analysis`: SonarQube Cloud's analysis of the repository.

### Modified Capabilities

- `security-headers`: the baseline CSP and no `X-Powered-By`.
- `password-recovery`: the new-password page and action accept only a recovery session; the request carries a captcha token.
- `home-curation`: the add-to-home control needs the second factor.
- `breadcrumbs`: the trail on `/admin/verify`.
- `auth`: the hardened password policy; the captcha token on sign-in and sign-up.
- `admin-moderation`: admin pages and controls need the second factor.

## Impact

- **Code:** `src/proxy.ts`, `next.config.ts`, `src/shared/lib/{supabase,turnstile,security-log,error-reporting,image-file}/`, the widget in `src/shared/ui/`, `src/features/{auth,contact,admin,authors,poem-management}/`, a new route `/admin/verify`, `src/instrumentation*.ts`, `src/app/{error,global-error}.tsx`, `scripts/`, `vitest.config.mts`, `sonar-project` settings.
- **Database:** two migrations (admin `aal2` and the `totp_verify` limit; object cap); `supabase/seed.sql`; `supabase/config.toml`.
- **Dependencies:** `sharp` (direct) and `@sentry/nextjs`. Installs are denied to the agent: the owner runs them.
- **Services:** Cloudflare Turnstile, Sentry, SonarQube Cloud, Vercel Firewall, hosted Supabase settings.
- **Docs:** `docs/environment.md`, new ADRs `0023` to `0026` (`0026` amends ADR 0009 Decision 6: uploads become capped), the privacy policy (Contentful, owner).
- **Risk class:** high (auth, permissions, uploads, production configuration): every gate, deep review, manual validation.
- **Size:** large (nine groups). Kept as one change; if it is split, the cut is between groups, in the order above.

## Mockups

Approved Claude Design canvas: https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z (page link `#page-dcb81aee8d83`).

| Screen | Artboards |
| --- | --- |
| `/login` | [LoginTurnstile](https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-LoginTurnstile), [LoginTurnstile2](https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-LoginTurnstile2) |
| `/signup` | [SignupTurnstile](https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-SignupTurnstile) |
| Contact dialog | [ContactTurnstile](https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-ContactTurnstile) |
| `/admin/verify`, enrolment | [AdminVerifySetup](https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-AdminVerifySetup), [AdminVerifySetup2](https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-AdminVerifySetup2) |
| `/admin/verify`, code entry | [AdminCode](https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-AdminCode) |

## Decisions

The owner delegated the technical forks on 2026-11-27: the safest option is taken and recorded here or in `design.md` and the specs.

- Leaked-password protection if the Supabase plan has it, otherwise a 12-character minimum. No plan is bought for it.
- No client IP in security event logs.
- Firewall, per IP, Server Action POSTs only: 10 per minute on `/login` and `/signup`, 60 per minute overall.
- Object cap: author photos 5 per folder; illustrations the author's poem count plus 20.
- Recovery window 15 minutes. Any `otp` or `recovery` entry inside it counts, so a session that just confirmed a new account can also set a password.
- The admin cannot use the recovery flow once enrolled: the path is to delete the factor in the dashboard, recover and enrol again.
- Password sign-in, sign-up, recovery and contact need JavaScript because of the captcha; Google sign-in does not.
- "Require current password" is turned on in the hosted project whenever the dashboard offers it.
- The local seed gives the seeded admin a verified factor with a throwaway secret, so recorded scenarios can run; enrolment is checked by hand after deleting it.
- Errors go to Sentry (owner, 2026-11-27), not a log drain. The privacy policy names Sentry and Cloudflare (Turnstile) and the transfer of data abroad; the owner writes it in Contentful before the deploy (task 7.6).
- SonarQube Cloud reports only and blocks no merge (assumed until the owner answers).

## Open Questions

- A wrong password on a banned account shows that the account is blocked (task 1.4, confirmed on the local stack 2026-11-27): whether to show the generic wrong-credentials message instead. Owner, with item 9 of `docs/security-post-deploy.md`; no wording change in this change.
- Whether the audience in Russia makes the 152-FZ cross-border transfer rules apply to Sentry and Turnstile, and what they require beyond the privacy policy. Owner, due 2026-12-04.
