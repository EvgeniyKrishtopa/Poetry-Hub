# Proposal

## Why

Poetry Hub will store user-editable content, starting with poems, in Supabase. Contentful keeps only editorial pages (about, FAQ). Every write to that content needs to know who the reader is. So authentication comes first, as its own change, before any poems table exists.

This change adds:
- email/password sign-up and sign-in with Supabase Auth on public pages, implemented as Server Actions built with `next-safe-action`, so input is validated on the server;
- a session that stays fresh across requests;
- a header widget that shows whether the reader is signed in and lets them sign out.

It depends on the separate Cache Components change landing first (user decision 2026-10-02).

## What Changes

- Add `src/shared/lib/supabase/`:
  - env-var config validation;
  - a browser client, used only to read the session for the header;
  - a server client for Server Actions and route handlers, with cookies via `next/headers`;
  - a session-refresh helper for the proxy.
- Extend `src/proxy.ts`: on every matched request, refresh the Supabase session cookies. Then apply the existing security headers to whatever response comes back.
- Add feature `src/features/auth/`:
  - `model/`: credential schemas, Supabase error classification, and user-facing messages;
  - `actions/`: the action client and the `signInAction`, `signUpAction`, and `signOutAction` Server Actions (`next-safe-action`);
  - `api/`: a browser-side session read;
  - `dal/`: verification of the confirm link;
  - components `SignInForm`, `SignUpForm`, and `AuthStatus`.
- Add public pages `src/app/(public)/login/page.tsx` (`/login`) and `src/app/(public)/signup/page.tsx` (`/signup`).
- Add route handler `src/app/auth/confirm/route.ts` (`GET /auth/confirm`). It verifies the sign-up confirmation link and signs the reader in.
- Add a `<header>` to the root layout with the site name and `AuthStatus`.
- Document:
  - the two new env vars;
  - the Supabase dashboard setup;
  - the auth feature's folders, including the new `actions/` role;
  - ADR 0003: what data lives in Contentful vs Supabase, and why credentials go through Server Actions.

## Requirements

- **FR-1**: `/login` SHALL render a sign-in form with a labelled email field, a labelled password field, a "Sign in" submit button, and a link to `/signup`.
- **FR-2**: Submitting the sign-in form SHALL call `signInAction`. The action SHALL validate its input on the server against `signInSchema`: the email must be a syntactically valid address, and the password non-empty. Invalid input SHALL return field-level errors, which the form shows, and Supabase SHALL NOT be called. Valid input SHALL call Supabase `signInWithPassword`. On success the action SHALL set the session cookies and redirect to `/`. On failure the form SHALL show one form-level error, chosen by the failure kind:
  - wrong email or password → "Incorrect email or password." The text is the same whether or not the email is registered.
  - email not yet confirmed → "Confirm your email first. Check your inbox for the link."
  - rate limited → "Too many attempts. Try again in a few minutes."
  - Supabase not configured (FR-8) → "Sign-in is unavailable right now."
  - anything else, including an unexpected server error → "Something went wrong. Try again."
- **FR-3**: `/signup` SHALL render a sign-up form with a labelled email field, a labelled password field, a "Create account" submit button, and a link to `/login`.
- **FR-4**: Submitting the sign-up form SHALL call `signUpAction`. The action SHALL validate on the server against `signUpSchema`: the email must be valid, and the password at least `MIN_PASSWORD_LENGTH` (8) characters. Invalid input SHALL return field-level errors, and Supabase SHALL NOT be called. Valid input SHALL call Supabase `signUp`. On success the form SHALL be replaced by a "Check your email" message naming the submitted address. The message SHALL be identical whether or not the address was already registered. On failure:
  - password rejected by Supabase as weak → a field-level error on the password: "Choose a stronger password."
  - rate limited → "Too many attempts. Try again in a few minutes."
  - Supabase not configured → "Sign-up is unavailable right now."
  - anything else, including an unexpected server error → "Something went wrong. Try again."
- **FR-5**: `GET /auth/confirm?token_hash=<hash>&type=email` SHALL verify the hash with Supabase `verifyOtp`.
  - On success it SHALL set the session cookies and redirect (HTTP 303) to `/`.
  - It SHALL redirect (303) to `/login?error=confirm-failed` when `token_hash` is missing, `type` is anything other than `email`, verification fails, or the Supabase config is missing.
  - The handler SHALL accept no redirect-target parameter.
  - When `error=confirm-failed` is present, `/login` SHALL show "That confirmation link is invalid or has expired. Sign in, or sign up again to get a new link."
- **FR-6**: The proxy SHALL refresh the Supabase session on every request its matcher lets through. It does this by calling `getClaims()` through a server client that reads the request cookies and writes refreshed cookies to both the forwarded request and the response.
  - Every response the proxy returns SHALL carry the four security headers.
  - A response that sets at least one session cookie SHALL carry `Cache-Control: private, no-store`.
- **FR-7**: The root layout SHALL render a `<header>` containing a link to `/` with the site name, and the `AuthStatus` widget. `AuthStatus` SHALL be a Client Component that reads the session through the browser client on mount and again on every pathname change. A read that is superseded by a newer one SHALL be ignored. It renders:
  - session state not yet known → no visible content;
  - signed out → a "Sign in" link to `/login`;
  - signed in → the reader's email and a "Sign out" button.

  Activating "Sign out" SHALL call `signOutAction`, which calls Supabase `signOut({ scope: "local" })`. On success the widget SHALL show the signed-out state and refresh the server-rendered tree. If sign-out fails, the widget SHALL stay signed in and show "Couldn't sign out. Try again." in a `role="alert"` element.
- **FR-8**: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` SHALL be validated lazily on each client creation, never at module load.
  - `NEXT_PUBLIC_SUPABASE_URL` must be an `https://` URL, or `http://localhost` / `http://127.0.0.1`.
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` must be non-empty and contain no whitespace.

  Invalid config SHALL raise a `SupabaseConfigError` whose message names the variables and never their values. On a config error:
  - the proxy SHALL skip the session refresh, log the names with `console.error`, and still return the security headers;
  - the actions SHALL return the `unavailable` failure;
  - `AuthStatus` SHALL render the signed-out state.
- **NFR-1**: Secrets and the password are handled as follows:
  - Only the publishable key is used; no service-role or secret key is read.
  - The password SHALL NOT be logged, stored in a Zustand store, put in a URL, returned in any action result, or kept in React or hook state after a submission. The forms therefore don't use `useAction`, which retains its input.
  - The action client's server-error handler SHALL never log or return the action input.
- **NFR-2**: The `npm run build` route table SHALL report the same rendering mode for `/` before and after this change. It SHALL add `/login`, `/signup`, and `/auth/confirm`, and change no other route.
- **NFR-3**: Form accessibility:
  - every input has a visible `<label>`;
  - `autocomplete` is `email` on the email inputs, `current-password` on sign-in, and `new-password` on sign-up;
  - a field-level error is linked through `aria-describedby`, and its input has `aria-invalid="true"`;
  - a form-level error is in a `role="alert"` element;
  - the submit button is disabled while a submission is pending.
- **NFR-4**: Relative to `main`, the change SHALL add exactly three runtime dependencies (`@supabase/ssr`, `@supabase/supabase-js`, `next-safe-action`) and no others. Styles use only existing design tokens and Tailwind utilities.

## Acceptance Criteria

- **FR-1** — Given the app is running, When a browser requests `/login`, Then the page shows a textbox labelled "Email", a password input labelled "Password", a button "Sign in", and a link with `href` `/signup`.
- **FR-2** — Given `signInAction` is called with email "not-an-email" and an empty password, When it runs, Then the result has `validationErrors` for both fields and `signInWithPassword` has not been called; and Given the form receives that result, Then a field error is shown for each field.
- **FR-2** — Given `signInWithPassword` resolves without error, When `signInAction` runs with valid input, Then `redirect` is called with `/`.
- **FR-2** — Given `signInWithPassword` returns error code `invalid_credentials`, When the form is submitted, Then the alert reads "Incorrect email or password.".
- **FR-2** — Given `signInWithPassword` returns error code `email_not_confirmed`, When the form is submitted, Then the alert reads "Confirm your email first. Check your inbox for the link.".
- **FR-2** — Given `signInWithPassword` returns error code `over_request_rate_limit` (or HTTP status 429), When the form is submitted, Then the alert reads "Too many attempts. Try again in a few minutes.".
- **FR-2** — Given creating the server client throws `SupabaseConfigError`, When the form is submitted, Then the alert reads "Sign-in is unavailable right now.".
- **FR-2** — Given `signInWithPassword` returns any other error, or the action result carries `serverError`, When the form is submitted, Then the alert reads "Something went wrong. Try again.".
- **FR-3** — Given the app is running, When a browser requests `/signup`, Then the page shows labelled "Email" and "Password" inputs, a button "Create account", and a link with `href` `/login`.
- **FR-4** — Given `signUpAction` is called with a valid email and a 7-character password, When it runs, Then the result has a password `validationErrors` entry mentioning the 8-character minimum and `signUp` has not been called.
- **FR-4** — Given `signUp` resolves without error, When the reader submits "reader@example.com" and a valid password, Then the form is replaced by a message containing "Check your email" and "reader@example.com".
- **FR-4** — Given `signUp` resolves without error for an already-registered address (a user with an empty `identities` array), When the form is submitted, Then the same "Check your email" message is shown.
- **FR-4** — Given `signUp` returns error code `weak_password`, When the form is submitted, Then the password field shows "Choose a stronger password.".
- **FR-4** — Given `signUp` returns a rate-limit error, a `SupabaseConfigError` is thrown, or any other error / `serverError` occurs, When the form is submitted, Then the alert shows the matching FR-4 text.
- **FR-5** — Given `verifyOtp` succeeds, When `GET /auth/confirm?token_hash=abc&type=email` is handled, Then the response is a 303 redirect to `/`.
- **FR-5** — Given the request:
  - has no `token_hash`, or
  - has `type=recovery`, or
  - `verifyOtp` returns an error, or
  - the Supabase config is invalid,

  When `/auth/confirm` is handled, Then the response is a 303 redirect to `/login?error=confirm-failed`; in the first two cases `verifyOtp` is not called.
- **FR-5** — Given the request also carries `next=https://evil.example`, When `/auth/confirm` succeeds, Then the redirect target is still `/`.
- **FR-5** — Given the app is running, When a browser requests `/login?error=confirm-failed`, Then the confirm-failed message is shown in a `role="alert"` element.
- **FR-6** — Given the server client's `getClaims` triggers `setAll` with a refreshed cookie, When the proxy handles a request, Then the response carries that cookie, all four security headers, and `Cache-Control: private, no-store`.
- **FR-6** — Given a request with no session cookies, When the proxy handles it, Then the response carries all four security headers, sets no cookie, and has no `Cache-Control: private, no-store` added by the proxy.
- **FR-7** — Given `getClaims` resolves with no claims, When `AuthStatus` renders, Then a link "Sign in" with `href` `/login` is shown.
- **FR-7** — Given `getClaims` resolves with claims whose `email` is "reader@example.com", When `AuthStatus` renders, Then "reader@example.com" and a button "Sign out" are shown.
- **FR-7** — Given the widget shows "Sign in", When the pathname changes from `/login` to `/` and the new read returns "reader@example.com", Then the widget shows that email.
- **FR-7** — Given a read started for pathname `/login` is still pending, When the pathname changes to `/`, the new read resolves to "reader@example.com", and then the old read resolves to `null`, Then the widget shows "reader@example.com".
- **FR-7** — Given the signed-in widget, When the reader clicks "Sign out" and `signOutAction` returns `{ ok: true }`, Then `router.refresh()` is called and the widget shows "Sign in"; and the action called Supabase `signOut` with `scope: "local"`.
- **FR-7** — Given the signed-in widget, When the reader clicks "Sign out" and `signOutAction` returns `{ ok: false }` or a `serverError`, Then the widget still shows the email and "Sign out", an alert reads "Couldn't sign out. Try again.", and `router.refresh()` is not called.
- **FR-7** — Given `getClaims` has not resolved yet on first mount, When `AuthStatus` renders, Then neither "Sign in" nor "Sign out" is present.
- **FR-8** — Given `NEXT_PUBLIC_SUPABASE_URL` is unset and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is "  has space", When the config is read, Then a `SupabaseConfigError` is thrown whose message names both variables and contains neither value.
- **FR-8** — Given `NEXT_PUBLIC_SUPABASE_URL` is `http://example.com`, When the config is read, Then a `SupabaseConfigError` naming `NEXT_PUBLIC_SUPABASE_URL` is thrown; and Given `http://localhost:54321`, Then no error is thrown.
- **FR-8** — Given Supabase config is invalid, When the proxy handles a request, Then the response carries all four security headers, `console.error` was called with a message naming the variables, and `getClaims` was not called.
- **FR-8** — Given the browser client throws `SupabaseConfigError`, When `AuthStatus` renders, Then the "Sign in" link is shown.
- **NFR-1** — Given the change is complete, When `src/` is searched, Then none of these match:
  - `service_role`, `SERVICE_ROLE`, `SUPABASE_SECRET`;
  - `console.*` calls that reference a password variable;
  - any import of `useAction` in `src/features/auth`.

  And Given an action whose body throws, When its result is inspected, Then `serverError` is the generic text and contains no part of the input.
- **NFR-2** — Given the change is complete, When `npm run build` runs, Then `/` has the same rendering mode as on `main` at the change's start, `/login`, `/signup`, and `/auth/confirm` appear, and every other route is unchanged.
- **NFR-3** — Given either form, When it renders and when a field error is shown, Then:
  - each input has its `<label>` and the expected `autocomplete`;
  - an input in error has `aria-invalid="true"` and an `aria-describedby` pointing at the error text;
  - a form error is in a `role="alert"` element;
  - the submit button is disabled while the submission is pending.
- **NFR-4** — Given the change is complete, When `package.json` `dependencies` are diffed against `main`, Then exactly `@supabase/ssr`, `@supabase/supabase-js`, and `next-safe-action` are added; and the new component files contain no hex, `rgb(`, `hsl(` literals or Tailwind arbitrary color values.

## Capabilities

### New Capabilities
- `auth`: email/password sign-up with email confirmation, sign-in, sign-out, session refresh, and the signed-in status shown in the header.

### Modified Capabilities

None. `security-headers` keeps its requirements unchanged. FR-6 only adds that they also hold on responses that carry session cookies, and that requirement is stated under `auth`.

## Out of Scope

- The Cache Components migration (`cacheComponents: true`, moving `/` from `revalidate` to `"use cache"`, `reactCompiler`). That is a separate change that lands first.
- Protecting pages in `(authorized)/`. It has no pages yet; the first change that adds one owns enforcement.
- Password reset, magic links, OAuth/social providers, MFA, changing email or password.
- Redirecting a signed-in reader away from `/login` or `/signup`.
- Any Supabase table, RLS policy, or poems storage. That is the next change, which also moves the action client to `shared/lib` and decides where cross-feature client-side session reading lives.
- A user profile, display name, or avatar. The widget shows the email only.
- Live cross-tab sync of the header. Another tab updates on its next navigation.
- Content-Security-Policy hardening (see design Risks).

## Impact

- New:
  - `src/shared/lib/supabase/{config,errors,browser,server,session,index}.ts`, with tests;
  - `src/features/auth/` (model, actions, api, dal, components, index, tests);
  - `src/app/(public)/login/page.tsx`, `src/app/(public)/signup/page.tsx`;
  - `src/app/auth/confirm/route.ts`, with tests;
  - `docs/decisions/0003-supabase-auth-and-content-split.md`.
- Changed:
  - `src/proxy.ts` (becomes async and refreshes the session) and `src/tests/proxy.test.ts`;
  - `src/app/layout.tsx` (adds the header);
  - `docs/architecture.md` (`actions/` role, supabase subpath rule);
  - `docs/environment.md`;
  - `.env.example` (two variable names).
- Dependencies: `@supabase/ssr`, `@supabase/supabase-js`, `next-safe-action` (already installed in the working tree; committed with this change).
- Manual, outside the repo: Supabase project settings, described in design's Migration Plan. These are Site URL, the email template, the minimum password length, and a review of the rate limits.
