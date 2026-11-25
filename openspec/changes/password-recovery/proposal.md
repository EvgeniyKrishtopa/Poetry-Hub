## Why

A reader who forgets the password has no way back in: the sign-in form only says the address or the password is wrong, and the only other door is Google, which works for the same address only if the reader used it before. The owner wants a self-service recovery: a letter with a link, a form to set a new password, and clear notices on every outcome, without letting a stranger learn which addresses have an account.

## What Changes

- After a sign-in fails with wrong credentials, the sign-in form shows an offer under the error: send a recovery letter to the address the reader typed. The offer appears after any wrong-credentials failure, not only when the address is registered (owner, 2026-11-25): the sign-in answer never says which half was wrong (admin-moderation FR-16), so the offer cannot depend on it. The answer to the offer is the same for every address: if an account exists, a letter was sent.
- The letter carries a link to the existing route `/auth/confirm` with `type=recovery`. The route verifies the token, which opens a short recovery session, and sends the reader to the new page `/reset-password`. A link that is invalid, expired or already used sends the reader to `/login` with a notice that the link no longer works and a way to ask for a new letter.
- `/reset-password` shows one field, the new password, with the same rules as the sign-up form (minimum length, Supabase's weak-password check) and one more: the new password must differ from the current one (Supabase refuses a repeat). A failure shows a notice above the form.
- On success the recovery session ends on every device and the reader lands on `/reset-password?status=updated`, a success notice with a link to `/login`, so they sign in with the new password on purpose. The result is a redirect, not an in-place swap, because ending the session re-renders the page and a session-gated page would bounce the reader to the expired-link notice (Gate 1, C1). If the global sign-out fails, the password is still changed and the notice says honestly that the old sessions may remain.
- The recovery letter's link lives 1 hour (owner, 2026-11-25): Supabase's `otp_expiry`, set locally and in the hosted dashboard; the sent notice says so.
- A reader who registered with Google is pointed to the Google button by a static hint on `/login` and `/signup`, shown to everyone (owner, 2026-11-25). Notices that depend on the typed address (this address is tied to a Google account; wrong way to sign in) are not built: they would tell a stranger that an address has an account and how it signs in, and need a database function anyone can call.
- While the browser is offline, the recovery offer and the `/reset-password` form are disabled and the neutral connection notice shows above them, reusing `useConnection` and `ConnectionNotice`.
- Limits (owner, 2026-11-25): the letter request is limited by Supabase itself (one letter per address per minute, and the project's hourly letter cap), and the app shows the existing «too many attempts» notice only for Supabase's IP-wide refusal; the per-address refusal gets the same neutral answer as a sent letter, because Supabase refuses a second letter only for an address that has an account, and a different answer would let anyone probe addresses (design D3). The new-password step gets its own counter, 5 per minute per account, as a new scope `password_reset` of the existing `consume_write_allowance` (ADR 0007); the account is known there because the recovery session identifies it.
- Supabase is configured for the letter: the recovery email template links to `/auth/confirm?token_hash={{ .TokenHash }}&type=recovery` (local `supabase/config.toml`, the hosted dashboard), and `docs/environment.md` and its Deploy checklist say so.
- `/reset-password` is a noindex page with a breadcrumb trail, left out of the sitemap, like `/login` and `/signup`.

Out of scope: a standalone «forgot password» page reachable without a failed sign-in; changing a password while signed in; password-strength rules beyond the sign-up form's; recovery by SMS or by Google; a per-IP limit in the app (the hosting's job, ADR 0007); new-password confirmation field (the sign-up form has none either).

## Capabilities

### New Capabilities

- `password-recovery`: the recovery offer on the sign-in form, the request and its uniform answer, the recovery link's outcomes, the `/reset-password` form and its validation, the success notice, the offline guard, every failure notice, and the two limits.

### Modified Capabilities

- `auth`: the sign-in submission (FR-2) gains the offer after a wrong-credentials failure; the email confirmation route (FR-5) also verifies `type=recovery` links, with its own target and its own `/login` error value; the sign-in and sign-up pages gain the static Google hint (FR-14, an added requirement).
- `breadcrumbs`: the trail table gains `/reset-password` → Главная › Новый пароль.
- `page-metadata`: `/reset-password` joins `/login` and `/signup` as a noindex page with a plain title.
- `crawler-discovery`: the sitemap never lists `/reset-password`.

## Impact

- Code: `src/features/auth/` (two Server Actions: request a recovery letter and set the new password; a DAL function that verifies the recovery link; the new-password form, its success notice and the offer in `SignInForm`; schemas, messages, failure classification), `src/app/auth/confirm/route.ts` (recovery branch), `src/app/(public)/reset-password/page.tsx` and `src/app/@breadcrumbs/reset-password/page.tsx` (new), `src/shared/config/account-paths.ts` (the new path), `src/features/breadcrumbs` (one route row).
- Database: one migration that adds the `password_reset` scope (5 per 1 minute) to `consume_write_allowance`, using the same function body as the latest migration that touched it.
- Configuration: the recovery email template (local and hosted Supabase), and the hosted letter cap (the default of a project without custom SMTP is very low; the sign-up letter already depends on it).
- No new npm dependency and no new environment variable.
- Risk class: authentication, a database function and production configuration, so it runs the full route, and the code review's deep review is expected to fire.

## Open Questions

- Whether «unique» in the owner's wording means only «different from the current password» (what Supabase can check) or also a ban on passwords seen before (it cannot). This proposal assumes the first. Owner, due 2026-11-27.
- Whether «complexity» means only the sign-up form's rules (minimum 8 characters plus Supabase's weak-password check) or a new stricter rule (letters and digits). This proposal assumes the sign-up rules, so the two forms never disagree. Owner, due 2026-11-27.
- Whether finishing a reset should end the account's sessions on every device (assumed) or only the recovery session. Owner, due 2026-11-27.
- The wording of the notice shown when the global sign-out fails after a successful change, and of the two Google hints (placeholders). Owner, due 2026-11-27.
- Whether the `/reset-password` form may be used by any signed-in session, not only a recovery session, without asking for the current password (design D4: no `amr` check). That is a password change while signed in, which the proposal lists as out of scope; Supabase's own endpoint already allows it. Assumed: accept it until a change-password screen exists. Owner, due 2026-11-27.
- Whether to keep the `password_reset` limit (5 per minute) now that it bounds only the app's own path: a holder of the session can call Supabase's endpoint directly (design D6). Assumed: keep it, as a guard and defence in depth. Owner, due 2026-11-27.
- The hosted project's letter cap and sender (custom SMTP or Supabase's default) decide how many recovery letters per hour the whole site can send. Owner of the check: the owner, before deploy, due 2026-12-05.

## Mockups

Approved Claude Design canvas (received 2026-11-25): https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z (link as sent: `#play-0e32080cdf57`). Each artboard shows its states in light and dark at 1280, 768 and 360 px. All texts on the artboards equal the texts of the specs. Three details come from the mockup and are now in the specs: the Google hint sits directly under the Google button (FR-14), the invalid-address error returns focus to the email field (FR-2), and the session-ended state shows no form, only the alert and the link (FR-8). The `/signup` hint has no artboard: it is built from the spec text and the `/login` hint's look.

| Screen | Artboard |
| --- | --- |
| `/login`: default with the Google hint, wrong credentials with the offer, letter sent (states 1a-1c) | `LoginRecovery1`: https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-LoginRecovery1 |
| `/login`: send failures (rate-limited, unavailable, other; state 1d) | `LoginRecovery2`: https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-LoginRecovery2 |
| `/login`: dead link, slow connection, offline (states 1e-1f) | `LoginRecovery3`: https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-LoginRecovery3 |
| `/login`: pending, invalid address (states 1g-1h) | `LoginRecovery4`: https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-LoginRecovery4 |
| `/reset-password`: default and field errors (states 3a-3b) | `ResetPassword1`: https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-ResetPassword1 |
| `/reset-password`: pending, slow, offline, rate-limited (states 3c-3d) | `ResetPassword2`: https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-ResetPassword2 |
| `/reset-password`: other failure, session ended, service unavailable (states 3d-3g) | `ResetPassword3`: https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-ResetPassword3 |
| `/reset-password?status=…`: password changed, and changed with sessions kept (states 4a-4b) | `ResetPasswordDone`: https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-ResetPasswordDone |
