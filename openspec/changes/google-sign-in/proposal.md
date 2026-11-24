## Why

Today a visitor can only register and sign in with an email and a password, and registration needs an extra trip to the inbox to confirm the address. The owner wants a one-click way in through a Google account, both to register and to sign in again later, with clear notices when the network is down, when Google or the site refuses, and when the account already exists.

## What Changes

- `/signup` gets a «Зарегистрироваться через Google» button and `/login` gets a «Войти через Google» button, next to the existing email and password forms. Both are shown to every visitor, always (owner, 2026-11-24): a Google-only user has no password, so the sign-in button must not depend on what the browser remembers.
- Pressing either button sends the visitor to Google's account chooser through Supabase Auth (OAuth, PKCE flow); Google sends them back to a new route `/auth/callback`, which opens the session and takes them to `/`. No confirmation email is needed: Google has already verified the address.
- While the browser is offline or the connection is slow, the Google button is disabled and the neutral connection notice shows above it, reusing the existing `useConnection` and `ConnectionNotice`.
- When the visitor cancels on Google's screen, or the flow fails for any other reason, they come back to the page they started on (`/login` or `/signup`) with a notice that invites them to try again; the Google button is right there to retry.
- When the address is blocked (in the admin's banned list, or the account itself is blocked), the visitor comes back to the page they started on with a notice that this address cannot be used to sign in. Unlike the password sign-up, which never reveals a ban (admin-moderation FR-17), the Google path may say so, because the visitor has just proved to Google that the address is theirs.
- When a visitor who already has an account (made through Google or with a password, same address) presses «Зарегистрироваться через Google», they are signed in to that existing account and `/` shows a notice that an account with this address already exists and they are now signed in (owner, 2026-11-24). Supabase links the Google sign-in to an existing account with the same verified address, so no duplicate account is created.
- Supabase's Google provider is enabled (local `supabase/config.toml`, the hosted dashboard) and `/auth/callback` is added to the allowed redirect URLs; `docs/environment.md` and its Deploy checklist describe the Google Cloud OAuth client and both settings.

Out of scope: importing the Google name or photo into the author profile; other providers; unlinking Google from an account; showing the Google button only to returning Google users; changing the password forms or the email confirmation flow.

## Capabilities

### New Capabilities

- `google-sign-in`: starting a Google sign-in or sign-up from `/login` and `/signup`, the `/auth/callback` route that finishes it, the offline guard on the button, and every notice the flow ends with (cancelled, failed, blocked, account already exists).

### Modified Capabilities

- `auth`: the sign-in page (FR-1) and the sign-up page (FR-3) also show the Google button, and `/signup` starts reading an `error` parameter; the email confirmation route's requirement (FR-5), which defines the `/login` error parameter, gains the Google outcomes.

## Impact

- Code: `src/features/auth/` (a server action that starts the Google flow, a DAL function that finishes it, the Google button, the notices and their messages, types), `src/app/auth/callback/route.ts` (new route handler), `src/app/(public)/login/page.tsx`, `src/app/(public)/signup/page.tsx` and `src/app/(public)/page.tsx` (pass the search parameters to the notices).
- No database change and no migration: Supabase stores the Google identity itself; the existing Before User Created hook `reject_banned_signup` already runs for an account created through Google.
- No new npm dependency. New secrets only in Supabase (the Google client id and secret); the app itself reads no new environment variable (`getSiteUrl()` already gives the callback's origin).
- Configuration: Google Cloud OAuth client (owner), Supabase Auth → Providers → Google, and the Redirect URLs list, for local and hosted Supabase.
- Risk class: authentication and production configuration, so it runs the full route, and the code review's deep review is expected to fire.

## Open Questions

- The Google Cloud OAuth client (client id, secret, consent screen with the site's name) is created by the owner, who also enters it in the hosted Supabase dashboard. Owner, due 2026-12-05.
- The exact parameters Supabase hands back to `/auth/callback` for a cancel, a hook refusal and a blocked account are not documented; task 1.2 records them on the local stack before the mapping is written. Owner of the check: the implementer, group 1.

## Mockups

Approved Claude Design canvas (received 2026-11-24): https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z (link as sent: `#play-d80040ba086e`). Each artboard shows light and dark at 1280, 768 and 360 px. The slow-connection text was changed from the mockup's trial wording to match the disabled button (owner, 2026-11-24); the confirm-failed alert keeps its existing text (the mockup's state 10 text is a trial one and this change does not touch it).

| Screen | Artboard |
| --- | --- |
| `/login`: default, expired session, offline, slow, pending (states 1-5) | `LoginGoogle`: https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-LoginGoogle |
| `/login`: cancelled, failed, blocked, Google notice with offline, confirm-failed (states 6-10) | `LoginGoogle2`: https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-LoginGoogle2 |
| `/signup`: default, offline, slow, pending (states 1-4) | `SignupGoogle`: https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-SignupGoogle |
| `/signup`: cancelled, failed, blocked (states 5-7) | `SignupGoogle2`: https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-SignupGoogle2 |
| `/`: account-exists notice, and without it | `HomeAccountExists`: https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#artboard-HomeAccountExists |
