## Context

See proposal.md, Why. The auth feature already has `signInAction`, `signUpAction` and `signOutAction` (next-safe-action, `authActionClient`), the server client `createSupabaseServerClient()` that writes cookies through Next's `cookies()`, `classifyAuthError` mapping Supabase errors to `AuthFailure`, and the `/auth/confirm` route handler that verifies an email link and redirects with 303 to one of two fixed paths. `/login` reads an `error` search parameter inside a Suspense boundary (`SignInPanel` → `SignInFormWithError`), so the page stays partially prerendered; `/signup` reads none. `shared/lib/network` has `useConnection` (online / slow / offline) and `shared/ui` has `ConnectionNotice`, already used by the poem and admin forms. The Before User Created hook `reject_banned_signup` refuses a new account whose address is banned; Auth refuses a sign-in of a blocked account with `user_banned`. `getSiteUrl()` (`shared/lib/seo`) gives the site's public origin.

## Goals / Non-Goals

**Goals**
- One Google button per page, starting the OAuth PKCE flow on the server and finishing it in a route handler, with every outcome turned into one of a few fixed redirects.
- No new dependency, no database change, no new app environment variable.

**Non-Goals**
- No client-side Supabase OAuth call, no popup flow, no Google One Tap.
- No profile data from Google (name, photo).
- No change to how the password sign-in and sign-up work.

## Decisions

**D1. The flow starts in a server action, not a GET route or the browser client.** `startGoogleSignInAction({ from })` (in `auth.actions.ts`, through `authActionClient`) calls `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo, queryParams: { prompt: "select_account" } } })` with the server client and then `redirect(data.url)`. `prompt=select_account` makes Google show its account chooser every time, even when the browser is still signed in to Google: without it, after "sign out" the button signed the same account straight back in, so on a shared device the next person got it in one press and nobody could pick another account or cancel (owner, 2026-11-24, found in the task 5.3 manual check). The server client's `setAll` writes the PKCE code-verifier cookie through `cookies()`, so the redirect already carries it (Supabase docs: the verifier cookie must reach the browser, or the callback cannot exchange the code). `redirect` stays outside every `try`, as in `signInAction`. The callback is protected from login CSRF by PKCE itself: an attacker's `?code=` sent to someone else fails, because that browser lacks the matching verifier cookie. Alternatives: a `GET /auth/google` route handler, rejected because a plain link would let any site start a sign-in for the visitor (login CSRF), while a server action already checks the request's origin; the browser Supabase client, rejected because every other auth call in this project runs on the server and the verifier would then live only in browser storage.

**D2. `from` is a closed set, and every target is fixed.** `from` is `"sign-in" | "sign-up"` (a Zod enum on the action input, named constants in `auth.constants.ts`). `redirectTo` is `${getSiteUrl()}/auth/callback?from=<from>`; the callback reads `from` again and treats any other value as `sign-in`. Every redirect target is one of a few constant paths, so `/auth/callback`, like `/auth/confirm`, has no open redirect. Alternative: the request's `Origin` header for `redirectTo`, which would also work on preview deployments. Rejected for now: `getSiteUrl()` is the site's one source of truth for its address, and the Supabase Redirect URLs list matches it exactly (Risks: previews).

**D3. The route handler is thin; the DAL finishes the flow and returns a value.** `app/auth/callback/route.ts` only reads the search parameters, calls `finishGoogleSignIn(params)` and the pure `getGoogleCallbackTarget(result, from)` from the auth feature's public API, and returns a 303 to that target with `Cache-Control: private, no-store`. `dal/finish-google-sign-in.ts` (server-only) returns `{ ok: true, accountExisted } | { ok: false, reason }` with `reason` one of `"cancelled" | "blocked" | "failed"` (success is explicit, never "no error"). The reason comes from a pure `classifyGoogleCallbackError` in `model/`, which reads Supabase's `error_code` and `error_description` **before** the generic `error`, and checks for a block before a cancel, because Supabase Auth reports several different causes, a ban among them, with the same `error=access_denied`:
- a blocked existing account (`error_code=user_banned`, on the callback's parameters or from `exchangeCodeForSession`) → `blocked`;
- the hook's refusal of a banned address (its exact `error_code` / `error_description` pair is reproduced on the local stack in task 1.2 and kept as a named constant beside `BANNED_SIGNUP_REJECTION`) → `blocked`;
- the visitor's cancel on Google's screen (only its exact parameter set, recorded in task 1.2) → `cancelled`;
- no `code`, a missing config, or any other error, including an `access_denied` with an unrecognised `error_code` → `failed` (owner, 2026-11-24: never tell a visitor they cancelled when they did not).
One log line per `failed` or `blocked` outcome and per failed start, with the reason and Supabase's error code only, never the address, the code, a token or the description text; a cancel is the visitor's own choice and logs nothing (owner, 2026-11-24). The callback's `error_code` arrives in a URL anyone can forge, so the log writes it only when it looks like a code (one word of Latin letters, digits and underscores, at most 64 characters, which a thrown error's class name also matches) and `unrecognised` otherwise, so a forged address or token never reaches the log (owner, 2026-11-24, group 2; alternatives: only an allow-list of known codes, rejected because a new Supabase code would then be invisible; the raw value, rejected for the reason above). Alternative: classify and pick the target in the route handler. Rejected: `app/` stays routing only, and the outcome × origin table (D5) is business policy that should be unit-tested without Next.

**D4. "The account already existed" is read from two timestamps of the same user record.** After a successful exchange, the account existed before this sign-in when the user's `last_sign_in_at` is more than `NEW_ACCOUNT_WINDOW_MS` (60 s, named) after its `created_at`. Both come from the same exchange response and the same database clock, so the app server's clock plays no part. A new account is created and signed in during one round trip, so the two values are seconds apart; an older account was created long before this sign-in. A pure `didAccountExist(user)` in `model/` holds the rule. Only a `from=sign-up` success uses it, and it only decides whether a notice shows. An unconfirmed password account with the same address counts as existing (owner, 2026-11-24): the rule needs no check of when the address was confirmed. Alternatives: compare `created_at` with the app server's clock, rejected because it mixes two clocks (Gate 1 P4); count the user's identities, rejected because a returning Google-only user also has one identity; put a start timestamp into `redirectTo`, rejected as more moving parts for the same answer.

**D5. Outcome to redirect target**, in the pure `getGoogleCallbackTarget(result, from)` in `model/`, which also parses `from` (any value other than `sign-up` is `sign-in`).

| Outcome | Target |
| --- | --- |
| success, `from=sign-up`, account existed | `/?auth-notice=account-exists` |
| any other success | `/` |
| `cancelled` / `blocked` / `failed` | `/login?error=google-<reason>` or `/signup?error=google-<reason>`, by `from` |

The `error` and `auth-notice` values are named constants in `auth.constants.ts`.

**D6. Notices are server-rendered from the URL, inside Suspense.** The Google notice sits directly above the Google button, not inside the password form (owner, 2026-11-24). Top to bottom on both pages (the Google widget sits under the password form, owner, 2026-11-24): the session-expired notice (`/login` only, as today), the password form, «или», then the Google widget: the Google alert slot, the connection notice, the Google button. The alert slot is the one place both the URL's notice and a failed start show, inside `GoogleSignInButton`, above its `ConnectionNotice`. A pure `getGoogleErrorMessage(error)` maps the three `google-*` values to their texts and anything else to none. Only one Google alert shows at a time (owner, 2026-11-24): `GoogleSignInPanel` awaits the `error` parameter inside its own Suspense boundary and renders `GoogleSignInButton` with that text as `initialError`; its fallback is the same button without one, so the static shell already holds a usable button (the `SignInPanel` / `SignInForm` `initialError` pattern, no shared store). The button shows one alert slot: the URL's message until it is pressed, then only the result of its own start attempt. `getLoginErrorMessage` and the confirm-failed alert inside the password form stay as they are, and `/signup` needs no Suspense-wrapped form, so both pages stay partially prerendered with the form in the static shell. `/` renders `AuthNotice` from the auth feature inside its own Suspense boundary with an empty fallback; it awaits `searchParams` and shows the account-exists notice only for `auth-notice=account-exists`. The notice stays while the parameter is in the URL (a reload shows it again); this is accepted to keep the flow server-driven, without a client store or a timer. Alternative: a one-time client store like the session-expired notice. Rejected as harder to read for the same result.

**D7. The Google button is one small client component.** `GoogleSignInButton({ from })` uses `useConnection()`: while the status is not `online` the button is disabled and `ConnectionNotice` shows above it, as in `AddToHomeButton`. Its shared texts speak of saving, so `ConnectionNotice` gains an optional `messages` prop (offline and slow texts, defaulting to today's); the Google texts live in `auth-messages.ts`, so `shared/ui` stays free of any feature's wording. It is a small form whose action runs `startGoogleSignInAction` through React's `useActionState`, like every other auth form (ADR 0003), with `from` as its only input; while pending it is disabled and `aria-busy`. A failed start (missing config, Supabase error, server error) shows the try-again text in the same alert slot as the URL's message (D6), replacing it, and keeps the button enabled. It is rendered below the password form on both pages, after a visual «или» separator; labels come from `auth-messages.ts`.

**D8. The Google path may say that an address is blocked.** admin-moderation FR-17 hides a ban from a password sign-up because anyone can type any address there. With Google, the visitor has just proved to Google that the address is theirs, so telling them that it cannot be used reveals nothing to a third party. The password sign-up keeps FR-17 unchanged.

**D9. Configuration, not code, enables the provider.** Local: `supabase/config.toml` gets `[auth.external.google]` with `enabled = true` and `client_id` / `secret` read through `env(...)` from the Supabase CLI's own environment, never committed; `additional_redirect_urls` already allows `http://localhost:3000/**`. Hosted: Authentication → Providers → Google (client id and secret from the owner's Google Cloud OAuth client, whose authorised redirect URI is the Supabase project's `/auth/v1/callback`), and Redirect URLs gain exactly the two addresses the action sends, `<site>/auth/callback?from=sign-in` and `<site>/auth/callback?from=sign-up` (Supabase matches the query as part of the URL; a `<site>/auth/callback**` pattern was rejected in the final deep review, DR-01, because `**` matches any characters, `/` included, and would accept almost any return address on the site); the Site URL stays equal to what `getSiteUrl()` returns. A rejected `redirectTo` is not an error in Supabase: it silently falls back to the Site URL root with `?code=`, so the visitor would land on `/` signed out with no notice; the Deploy checklist says so, and the manual check in the last group covers it. The PKCE exchange is an Auth call from the app server, so it shares the server's IP rate-limit budget with the other auth calls (ADR 0003); the Deploy checklist names the Supabase limit it counts against. `docs/environment.md` and its Deploy checklist describe all of this. The app reads no new variable.

**D10. Two decisions outlive this change and become ADRs.** D1 adds a second sign-in method beside ADR 0003's email and password, and D8 is a deliberate exception to the "never reveal a ban" rule of admin-moderation FR-17. Both are recorded in `docs/decisions/` with their reasoning, in the change's docs group.

## Flows

Browser ↔ app server ↔ Supabase Auth ↔ Google. Starting and finishing are both on the server; the browser only follows redirects.

```mermaid
sequenceDiagram
    participant B as Browser
    participant A as startGoogleSignInAction (server)
    participant SA as Supabase Auth
    participant G as Google
    participant H as Before User Created hook
    participant CB as /auth/callback (route + finishGoogleSignIn)

    B->>B: useConnection: offline or slow → button disabled, ConnectionNotice
    B->>A: press Google button (from = sign-in | sign-up)
    A->>SA: signInWithOAuth(google, redirectTo = site/auth/callback?from=…)
    alt config missing or Supabase error
        SA-->>A: error
        A-->>B: failed result → Alert "try again"
    else ok
        SA-->>A: authorize URL (verifier cookie set)
        A-->>B: redirect to authorize URL
        B->>G: account chooser
        alt visitor cancels
            G-->>SA: access_denied
            SA-->>B: redirect callback?error=access_denied (cancel params, task 1.2)
        else visitor chooses an account
            G-->>SA: verified identity
            alt existing account is blocked
                SA-->>B: redirect callback?error=access_denied&error_code=user_banned
            else new account
                SA->>H: Before User Created
                alt address banned
                    H-->>SA: reject (403)
                    SA-->>B: redirect callback?error=…&error_code=… (hook refusal, task 1.2)
                else allowed
                    SA-->>B: redirect callback?code=…
                end
            else existing account (linked by email)
                SA-->>B: redirect callback?code=…
            end
        end
        opt redirectTo not in the Redirect URLs list (misconfiguration)
            SA-->>B: redirect Site URL root ?code=… (signed out, no notice; Deploy checklist)
        end
        B->>CB: GET /auth/callback?from=…&(code | error)
        alt code present
            CB->>SA: exchangeCodeForSession(code)
            alt user_banned (if not already reported on the redirect)
                SA-->>CB: error → blocked
            else other error
                SA-->>CB: error → failed
            else session
                SA-->>CB: user (created_at)
            end
        end
        CB-->>B: 303 → / | /?auth-notice=account-exists | /login or /signup ?error=google-<reason>
    end
```

## Risks / Trade-offs

- [Supabase's exact parameters for a cancel, a hook refusal and a blocked account on the OAuth path are undocumented, and a ban may arrive as `error=access_denied`, which reads like a cancel] → task 1.2 reproduces all three on the local stack and records each one's parameters; the classifier reads `error_code` before `error` and checks for a block before a cancel (D3); an unknown refusal falls into `failed`, which still shows a notice.
- [The ban could be bypassed: the hook allows any input it does not recognise (FR-17), so if a Google sign-up hands it the address in another shape, a banned address gets an account] → task 1.2 asserts that a Google sign-up with a banned address creates no row in `auth.users`; if one is created, the run stops and the hook is fixed before group 2 (google-sign-in FR-G5 has a scenario for it).
- [Misconfigured Redirect URLs: Supabase silently falls back to the Site URL root, and the visitor lands on `/` signed out with no notice] → `**` pattern (D9), a Deploy checklist line, and the final manual check.
- [Automatic identity linking and an unconfirmed password account with the same address: someone who registered the visitor's address with a password, without confirming it, could share the account] → task 1.2 also reproduces this on the local stack (an unconfirmed password sign-up, then Google with the same address) and records whether Supabase drops the unconfirmed password; if it keeps it, the run stops and the owner decides before group 2.
- [Preview deployments: `getSiteUrl()` points at production, so a Google sign-in started on a preview lands on production without the verifier cookie and fails] → accepted; the failure shows the try-again notice. Revisit with D2's alternative if previews need Google.
- [`NEW_ACCOUNT_WINDOW_MS` misjudges an existing account last signed in within a minute of its creation and never since] → only the account-exists notice is affected, never access.
- [The account-exists notice shows again on reload] → accepted (D6).
- [A visitor offline at the moment Google redirects back] → the browser cannot reach `/auth/callback`; nothing is half-done on the server, and pressing the button again starts over.

## Migration Plan

1. The owner creates the Google Cloud OAuth client and enables the Google provider in the hosted Supabase project, then adds `<site>/auth/callback?from=sign-in` and `<site>/auth/callback?from=sign-up` to Redirect URLs (Deploy checklist).
2. Deploy the app. No migration.
3. Rollback: disable the Google provider in Supabase; the buttons then fail with the try-again notice, and a revert of the app removes them.

## Open Questions

- The Google Cloud OAuth client and the consent screen text are the owner's (proposal.md, Open Questions); they do not change the code.

## Scaffold map

| File | Responsibility | Exports |
| --- | --- | --- |
| `src/app/auth/callback/route.ts` | Thin route handler where Supabase Auth returns a Google sign-in; GET only, 303 to a fixed target | `GET` |
| `src/features/auth/actions/auth.actions.ts` (changed) | Starts the Google sign-in on the server and redirects to Google (D1) | `startGoogleSignInAction` |
| `src/features/auth/dal/finish-google-sign-in.ts` | Server-only: exchanges the code or classifies the error, never throws (D3) | `finishGoogleSignIn` |
| `src/features/auth/model/classify-google-callback-error.ts` | Pure: cancelled / blocked / failed from Supabase's parameters (D3) | `classifyGoogleCallbackError` |
| `src/features/auth/model/did-account-exist.ts` | Pure: whether the account existed, from two timestamps (D4) | `didAccountExist` |
| `src/features/auth/model/google-callback-target.ts` | Pure: parses `from` and picks the redirect target (D5) | `getGoogleCallbackTarget` |
| `src/features/auth/model/google-sign-in.schema.ts` | The action's input, `from` as a closed set (D2) | `startGoogleSignInSchema` |
| `src/features/auth/model/auth.constants.ts` (changed) | Named origins, error and notice values, the new-account window | `GOOGLE_FLOW`, `GOOGLE_ERROR`, `AUTH_NOTICE`, `NEW_ACCOUNT_WINDOW_MS` |
| `src/features/auth/model/auth.types.ts` (changed) | Types moved between layers | `GoogleFlow`, `GoogleFailureReason`, `GoogleSignInResult`, `GoogleCallbackParams`, `GoogleCallbackUser`, `StartGoogleSignInResult`, `GoogleSignInButtonState` |
| `src/features/auth/model/auth-messages.ts` (changed) | The Google notice text for a `google-*` error value (D6) | `getGoogleErrorMessage` |
| `src/features/auth/components/GoogleSignInButton/GoogleSignInButton.tsx` | Client button: alert slot, connection notice, pending state (D6, D7) | `GoogleSignInButton` |
| `src/features/auth/components/GoogleSignInButton/GoogleSignInButton.types.ts` | The button's props | `GoogleSignInButtonProps` |
| `src/features/auth/components/GoogleSignInButton/submit-google-sign-in.ts` | `useActionState`'s action calling `startGoogleSignInAction` | `submitGoogleSignIn` |
| `src/features/auth/components/GoogleSignInPanel/GoogleSignInPanel.tsx` | Awaits `error` inside Suspense and passes the notice as `initialError` (D6) | `GoogleSignInPanel` |
| `src/features/auth/components/GoogleSignInPanel/GoogleSignInPanel.types.ts` | The panel's props | `GoogleSignInPanelProps` |
| `src/features/auth/components/AuthNotice/AuthNotice.tsx` | The home page's account-exists notice (D6) | `AuthNotice` |
| `src/features/auth/components/AuthNotice/AuthNotice.types.ts` | The notice's props | `AuthNoticeProps` |
| `src/shared/ui/ConnectionNotice/ConnectionNotice.types.ts` (changed) | Optional `messages` prop for the offline and slow texts (D7) | `ConnectionNoticeProps` |
