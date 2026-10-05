# auth Specification

## Purpose
TBD - created by archiving change add-supabase-auth. Update Purpose after archive.
## Requirements
### Requirement: Sign-in page (FR-1)
`/login` SHALL render a sign-in form with a labelled email field, a labelled password field, a "Sign in" submit button, and a link to `/signup`.

#### Scenario: Sign-in page renders
- **GIVEN** the app is running
- **WHEN** a browser requests `/login`
- **THEN** the page shows a textbox labelled "Email", a password input labelled "Password", a button "Sign in", and a link with `href` `/signup`

### Requirement: Sign-in submission (FR-2)
The sign-in form SHALL call `signInAction`. The action SHALL validate input on the server against `signInSchema` (a valid email and a non-empty password) before any Supabase call. Invalid input SHALL return field errors, which the form shows. Valid input SHALL call Supabase `signInWithPassword`. On success the action SHALL set the session cookies and redirect to `/`. On failure the form SHALL show one form-level message chosen by failure kind. The wrong-credentials message SHALL be the same whether or not the email is registered.

#### Scenario: Invalid input is rejected on the server
- **GIVEN** `signInAction` is called with email "not-an-email" and an empty password
- **WHEN** it runs
- **THEN** the result has `validationErrors` for both fields
- **AND** `signInWithPassword` has not been called
- **AND** the form shows a field error for each field

#### Scenario: Successful sign-in
- **GIVEN** `signInWithPassword` resolves without error
- **WHEN** `signInAction` runs with valid input
- **THEN** `redirect` is called with `/`

#### Scenario: Wrong credentials
- **GIVEN** `signInWithPassword` returns error code `invalid_credentials`
- **WHEN** the form is submitted
- **THEN** a `role="alert"` element reads "Incorrect email or password."

#### Scenario: Email not confirmed
- **GIVEN** `signInWithPassword` returns error code `email_not_confirmed`
- **WHEN** the form is submitted
- **THEN** the alert reads "Confirm your email first. Check your inbox for the link."

#### Scenario: Rate limited
- **GIVEN** `signInWithPassword` returns error code `over_request_rate_limit` or HTTP status 429
- **WHEN** the form is submitted
- **THEN** the alert reads "Too many attempts. Try again in a few minutes."

#### Scenario: Supabase not configured
- **GIVEN** creating the server client throws `SupabaseConfigError`
- **WHEN** the form is submitted
- **THEN** the alert reads "Sign-in is unavailable right now."

#### Scenario: Any other failure
- **GIVEN** `signInWithPassword` returns any other error, or the action result carries `serverError`
- **WHEN** the form is submitted
- **THEN** the alert reads "Something went wrong. Try again."

### Requirement: Sign-up page (FR-3)
`/signup` SHALL render a sign-up form with a labelled email field, a labelled password field, a "Create account" submit button, and a link to `/login`.

#### Scenario: Sign-up page renders
- **GIVEN** the app is running
- **WHEN** a browser requests `/signup`
- **THEN** the page shows labelled "Email" and "Password" inputs, a button "Create account", and a link with `href` `/login`

### Requirement: Sign-up submission (FR-4)
The sign-up form SHALL call `signUpAction`. The action SHALL validate on the server against `signUpSchema` (a valid email and a password of at least 8 characters, `MIN_PASSWORD_LENGTH`). Valid input SHALL call Supabase `signUp`. Success SHALL replace the form with a "Check your email" message naming the address, and the message SHALL be identical whether or not the address was already registered. A `weak_password` error SHALL show on the password field. Rate limit, missing config, other failures, and server errors SHALL show form-level messages.

#### Scenario: Short password is rejected on the server
- **GIVEN** `signUpAction` is called with a valid email and a 7-character password
- **WHEN** it runs
- **THEN** the result has a password `validationErrors` entry mentioning the 8-character minimum
- **AND** `signUp` has not been called

#### Scenario: Successful sign-up
- **GIVEN** `signUp` resolves without error
- **WHEN** the reader submits "reader@example.com" and a valid password
- **THEN** the form is replaced by a message containing "Check your email" and "reader@example.com"

#### Scenario: Already-registered address
- **GIVEN** `signUp` resolves without error and returns a user with an empty `identities` array
- **WHEN** the form is submitted
- **THEN** the same "Check your email" message is shown

#### Scenario: Weak password rejected by Supabase
- **GIVEN** `signUp` returns error code `weak_password`
- **WHEN** the form is submitted
- **THEN** the password field shows "Choose a stronger password."

#### Scenario: Other sign-up failures
- **GIVEN** one of these:
  - `signUp` returns a rate-limit error;
  - creating the server client throws `SupabaseConfigError`;
  - `signUp` returns any other error, or the result carries `serverError`.
- **WHEN** the form is submitted
- **THEN** the alert reads, for each case in that order:
  - "Too many attempts. Try again in a few minutes."
  - "Sign-up is unavailable right now."
  - "Something went wrong. Try again."

### Requirement: Email confirmation route (FR-5)
`GET /auth/confirm` SHALL verify `token_hash` with Supabase `verifyOtp` when `type` is `email`.
- On success it SHALL set the session cookies and redirect with 303 to `/`.
- A missing hash, any other `type`, a failed verification, or missing config SHALL redirect with 303 to `/login?error=confirm-failed`.
- The handler SHALL read no redirect-target parameter.

`/login` SHALL show "That confirmation link is invalid or has expired. Sign in, or sign up again to get a new link." when `error=confirm-failed` is present.

#### Scenario: Valid link
- **GIVEN** `verifyOtp` succeeds
- **WHEN** `GET /auth/confirm?token_hash=abc&type=email` is handled
- **THEN** the response is a 303 redirect to `/`

#### Scenario: Invalid link
- **GIVEN** any one of these:
  - the request has no `token_hash`;
  - the request has `type=recovery`;
  - `verifyOtp` returns an error;
  - the Supabase config is invalid.
- **WHEN** `/auth/confirm` is handled
- **THEN** the response is a 303 redirect to `/login?error=confirm-failed`
- **AND** `verifyOtp` is not called when the hash is missing or the type is not `email`

#### Scenario: No open redirect
- **GIVEN** the request also carries `next=https://evil.example`
- **WHEN** `/auth/confirm` succeeds
- **THEN** the redirect target is still `/`

#### Scenario: Confirm-failed message
- **GIVEN** the app is running
- **WHEN** a browser requests `/login?error=confirm-failed`
- **THEN** the confirm-failed message is shown in a `role="alert"` element

### Requirement: Session refresh in the proxy (FR-6)
The proxy SHALL refresh the Supabase session on every request its matcher lets through. It SHALL call `getClaims()` through a server client that writes refreshed cookies to the forwarded request and the response. Every response the proxy returns SHALL carry the four security headers. A response that sets at least one session cookie SHALL carry `Cache-Control: private, no-store`.

#### Scenario: Refreshed cookie, headers, and no-store
- **GIVEN** the server client's `getClaims` triggers `setAll` with a refreshed cookie
- **WHEN** the proxy handles a request
- **THEN** the response carries that cookie, all four security headers, and `Cache-Control: private, no-store`

#### Scenario: No session
- **GIVEN** a request with no session cookies
- **WHEN** the proxy handles it
- **THEN** the response carries all four security headers and sets no cookie
- **AND** the proxy adds no `Cache-Control: private, no-store`

### Requirement: Auth status in the header (FR-7)
The root layout SHALL render a `<header>` with a link to `/` showing the site name, and the `AuthStatus` Client Component.

`AuthStatus` SHALL read the session through the browser client on mount and again on every pathname change. It SHALL ignore a read that a newer read supersedes. It SHALL render:
- nothing visible while the session is unknown;
- a "Sign in" link to `/login` when the reader is signed out;
- the reader's email and a "Sign out" button when the reader is signed in.

"Sign out" SHALL call `signOutAction`, which calls Supabase `signOut({ scope: "local" })`.
- On success the widget SHALL show the signed-out state and refresh the server-rendered tree.
- On failure it SHALL stay signed in and show "Couldn't sign out. Try again." in a `role="alert"` element.

#### Scenario: Signed out
- **GIVEN** `getClaims` resolves with no claims
- **WHEN** `AuthStatus` renders
- **THEN** a link "Sign in" with `href` `/login` is shown

#### Scenario: Signed in
- **GIVEN** `getClaims` resolves with claims whose `email` is "reader@example.com"
- **WHEN** `AuthStatus` renders
- **THEN** "reader@example.com" and a button "Sign out" are shown

#### Scenario: Re-read on navigation
- **GIVEN** the widget shows "Sign in"
- **WHEN** the pathname changes from `/login` to `/` and the new read returns "reader@example.com"
- **THEN** the widget shows that email

#### Scenario: Stale read is ignored
- **GIVEN** a read started for pathname `/login` is still pending
- **WHEN** the pathname changes to `/`, the new read resolves to "reader@example.com", and then the old read resolves to `null`
- **THEN** the widget shows "reader@example.com"

#### Scenario: Sign out
- **GIVEN** the signed-in widget
- **WHEN** the reader clicks "Sign out" and `signOutAction` returns `{ ok: true }`
- **THEN** `router.refresh()` is called and the widget shows "Sign in"
- **AND** the action called Supabase `signOut` with `scope: "local"`

#### Scenario: Sign out fails
- **GIVEN** the signed-in widget
- **WHEN** the reader clicks "Sign out" and `signOutAction` returns `{ ok: false }` or a `serverError`
- **THEN** the widget still shows the email and "Sign out"
- **AND** an alert reads "Couldn't sign out. Try again."
- **AND** `router.refresh()` is not called

#### Scenario: Unknown state
- **GIVEN** `getClaims` has not resolved yet on first mount
- **WHEN** `AuthStatus` renders
- **THEN** neither "Sign in" nor "Sign out" is present

### Requirement: Supabase configuration (FR-8)
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` SHALL be validated lazily on each client creation.
- The URL must use `https://`, or `http://` only for `localhost` / `127.0.0.1`.
- The key must be non-empty and contain no whitespace.

Invalid config SHALL raise `SupabaseConfigError` naming the variables, never their values. With invalid config:
- the proxy SHALL skip the refresh, log the variable names with `console.error`, and still return the security headers;
- the actions SHALL return the `unavailable` failure;
- `AuthStatus` SHALL render the signed-out state.

#### Scenario: Names only in the error
- **GIVEN** `NEXT_PUBLIC_SUPABASE_URL` is unset and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is "  has space"
- **WHEN** the config is read
- **THEN** a `SupabaseConfigError` is thrown whose message names both variables and contains neither value

#### Scenario: URL scheme rule
- **GIVEN** `NEXT_PUBLIC_SUPABASE_URL` is `http://example.com`
- **WHEN** the config is read
- **THEN** a `SupabaseConfigError` naming `NEXT_PUBLIC_SUPABASE_URL` is thrown
- **AND** with `http://localhost:54321` no error is thrown

#### Scenario: Proxy with invalid config
- **GIVEN** Supabase config is invalid
- **WHEN** the proxy handles a request
- **THEN** the response carries all four security headers, `console.error` was called with a message naming the variables, and `getClaims` was not called

#### Scenario: Widget with invalid config
- **GIVEN** the browser client throws `SupabaseConfigError`
- **WHEN** `AuthStatus` renders
- **THEN** the "Sign in" link is shown

### Requirement: Secrets and password handling (NFR-1)
Only the publishable key SHALL be used; no service-role or secret key is read.

The password SHALL NOT be:
- logged;
- stored in a Zustand store;
- put in a URL;
- returned in any action result;
- kept in React or hook state after a submission.

The action client's server-error handler SHALL never log or return the action input.

#### Scenario: No secret keys, no password logging, no input-retaining hook
- **GIVEN** the change is complete
- **WHEN** `src/` is searched for `service_role`, `SERVICE_ROLE`, `SUPABASE_SECRET`, for `console.*` calls referencing a password variable, and for imports of `useAction` in `src/features/auth`
- **THEN** there are no matches

#### Scenario: Server error does not echo input
- **GIVEN** an action whose body throws
- **WHEN** its result is inspected
- **THEN** `serverError` is the generic text and contains no part of the input

### Requirement: Rendering mode of `/` preserved (NFR-2)
`npm run build` SHALL report the same rendering mode for `/` before and after this change. It SHALL add `/login`, `/signup`, and `/auth/confirm`, and change no other route.

#### Scenario: Build route table
- **GIVEN** the change is complete
- **WHEN** `npm run build` runs
- **THEN** `/` has the same rendering mode as on `main` at the change's start, the three new routes appear, and every other route is unchanged

### Requirement: Accessible forms (NFR-3)
Every input SHALL have a visible `<label>` and the correct `autocomplete`: `email`, `current-password` on sign-in, and `new-password` on sign-up. A field error SHALL be linked to its input via `aria-describedby`, with `aria-invalid="true"` on the input. A form-level error SHALL be in a `role="alert"` element. The submit button SHALL be disabled while a submission is pending.

#### Scenario: Form accessibility wiring
- **GIVEN** either form
- **WHEN** it renders, and when a field error is shown
- **THEN** each input has its label and the expected `autocomplete`
- **AND** an input in error has `aria-invalid="true"` and an `aria-describedby` pointing at the error text
- **AND** a form error is in a `role="alert"` element
- **AND** the submit button is disabled while a submission is pending

### Requirement: Dependencies and token-only styles (NFR-4)
Relative to `main`, the change SHALL add exactly the runtime dependencies `@supabase/ssr`, `@supabase/supabase-js`, and `next-safe-action`, and no others. Components SHALL be styled only with existing design tokens and Tailwind utilities.

#### Scenario: Dependencies and colors
- **GIVEN** the change is complete
- **WHEN** `package.json` `dependencies` are diffed against `main` and the new component files are searched for hex, `rgb(`, `hsl(` literals and Tailwind arbitrary color values
- **THEN** exactly the three named dependencies are added and there are no color matches

