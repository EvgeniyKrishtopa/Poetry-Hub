# 0019. Google sign-in goes through Supabase OAuth, started and finished on the server

## Status

Accepted (2026-11-24)

## Context

Until `google-sign-in` the only way in was email and password (ADR 0003). The change adds Google as a second method beside it, for sign-up and sign-in alike (details: `openspec/changes/google-sign-in/design.md`, D1, D2 and D4, or its archived copy). It builds on ADR 0003: Supabase holds identity, every credential flow runs on the server through a Server Action, and the app keeps only the publishable key. Three questions had to be settled:

- where the OAuth flow starts: in the browser, in a GET route, or in a Server Action;
- how the site address in the callback stays fixed, so the new route is not an open redirect;
- how the callback knows that a Google sign-up landed in an account that already existed, so it can say so.

## Decision

1. **A Server Action starts the flow.** `startGoogleSignInAction({ from })` calls `signInWithOAuth({ provider: "google", options: { redirectTo } })` with the server client, whose cookie writer stores the PKCE code verifier, and then `redirect`s to the URL Supabase returns. `redirect` stays outside every `try`, as in `signInAction`. The call passes Google `prompt=select_account`, so Google shows its account chooser every time: a visitor who signed out of the site is not signed straight back in with the account their browser still holds, which matters on a shared device, and they can pick another account or cancel. PKCE also protects the callback from login CSRF: a `?code=` sent to someone else fails, because their browser has no matching verifier cookie.
2. **The route handler `/auth/callback` finishes it.** It reads the search parameters, hands them to the server-only `finishGoogleSignIn` (the code exchange, or the classification of Supabase's error), and answers 303 to one of a few fixed paths with `Cache-Control: private, no-store`. The outcome-to-path table is a pure function in the auth feature's `model/`, so `app/` stays routing only.
3. **`from` is a closed set, and the address is the site's own.** `from` is `sign-in` or `sign-up` (a Zod enum on the action; any other value at the callback counts as `sign-in`). `redirectTo` is `getSiteUrl()` + `/auth/callback?from=<from>`, and every redirect target is a constant path, so the route has no open redirect.
4. **"The account already existed" is read from one user record.** After a successful exchange, the account existed when its `last_sign_in_at` is more than `NEW_ACCOUNT_WINDOW_MS` (60 s) after its `created_at`. Both values come from the same database clock. Only a sign-up from `/signup` uses the rule, and it only decides whether `/` shows the account-exists notice. An unconfirmed password account with the same address counts as existing: Supabase links Google to it, drops the unconfirmed password and confirms the address (recorded on the local stack, task 1.2).

## Consequences

**Positive**

- No new secret in the app and no new app variable: the provider lives in Supabase and Google Cloud configuration (`docs/environment.md`, Google sign-in).
- Every auth call still runs on the server, with the same error policy and log rules as the password flow.
- The callback cannot redirect anywhere but this site.

**Negative**

- The code exchange runs from the server's IP, so it shares Supabase's per-IP `/auth/v1/token` budget with password sign-ins and session refreshes (ADR 0003). The Deploy checklist raises that limit.
- A Redirect URLs list without `<site>/auth/callback**` makes Supabase silently fall back to the Site URL root, so the visitor lands on `/` signed out with no notice. Only configuration prevents it, and the Deploy checklist says so.
- `redirectTo` is built from `getSiteUrl()`, so a preview deployment's Google sign-in returns to the production address.
- The account-exists notice can misfire for a password account created less than 60 s before the same address signs in with Google. It is a notice only, and accepted.

## Alternatives Considered

- **A `GET /auth/google` route that redirects to Google** — rejected: any site could start a sign-in for the visitor with a plain link (login CSRF), while a Server Action already checks the request's origin.
- **The browser Supabase client** — rejected: every other auth call in this project runs on the server (ADR 0003), and the code verifier would live only in browser storage.
- **The request's `Origin` header for `redirectTo`** — rejected for now: `getSiteUrl()` is the site's one source of truth for its address, and the Redirect URLs list matches it exactly. It would make previews work, and can be revisited.
- **Comparing `created_at` with the app server's clock, or counting the user's identities** — rejected: the first mixes two clocks; the second reads a returning Google-only user as new.
