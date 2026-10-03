# Tasks

Prerequisite: the Cache Components change is merged into `main` (design Migration Plan).

## 1. Supabase infrastructure (`src/shared/lib/supabase/`)

- [x] 1.1 (FR-8) Implement `config.ts` and `errors.ts` per design D1.
  - `getSupabaseConfig()` reads `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as literal accesses and validates them lazily with Zod: the URL must be `https:`, or `http:` only for host `localhost`/`127.0.0.1`; the key must be non-empty with no whitespace.
  - On failure it throws `SupabaseConfigError`, with a message that names the variables only and no Zod `cause`.
  - Verify with `tests/config.test.ts`: both FR-8 config scenarios, plus the valid `https://` and `http://127.0.0.1` cases.
- [x] 1.2 (FR-8, NFR-1) Implement `browser.ts` and `server.ts`.
  - `browser.ts`: `getSupabaseBrowserClient()`, a `createBrowserClient` singleton with `auth: { autoRefreshToken: false }` (design D6; the proxy is the refresher).
  - `server.ts`: starts with `import "server-only"`. `createSupabaseServerClient()` uses `cookies()` from `next/headers`, with `getAll`/`setAll`, and wraps `setAll` in try/catch per design D3.
  - Add `index.ts`, exporting only `getSupabaseBrowserClient` and `SupabaseConfigError`.
  - Verify with tests: the browser client is created once; a config error propagates; `setAll` writes through the mocked cookie store and swallows its throw.
- [x] 1.3 (FR-6, FR-8) Implement `session.ts` (`import "server-only"`; `refreshSession(request)`) per design D4.
  - Behavior:
    - Follow the documented `createServerClient` request/response cookie pattern and await `getClaims()`.
    - Config error → `console.error` with the variable names, and return `NextResponse.next()`.
    - Thrown error → return the un-refreshed response, without logging the payload.
    - Resolved `{ error }` → keep the response `setAll` built.
    - When `setAll` wrote any cookie → apply any `setAll` cache headers first, then overwrite `Cache-Control` with exactly `private, no-store`.
  - Verify with `tests/session.test.ts` (mock `@supabase/ssr`):
    - a cookie written by `setAll` lands on the response, with `Cache-Control` strictly equal to `private, no-store`;
    - no cookies → no `Set-Cookie` and no added `Cache-Control`;
    - config error → `console.error` names the variables, and `getClaims` is not called;
    - `getClaims` throwing → the un-refreshed response is returned;
    - `getClaims` resolving `{ error }` after `setAll` removed the cookies → that response is returned, with the removals and no-store.
- [x] 1.4 (FR-8, NFR-1, NFR-4) Add the two variable names, without values, to `.env.example`. Document in `docs/environment.md`:
  - only the publishable key is used, never a secret or service-role key;
  - the URL rule;
  - the Supabase dashboard setup steps from design's Migration Plan, including raising the sign-up/sign-in rate limit and why (all readers share the server's IP budget).

  Confirm `package.json` adds exactly `@supabase/ssr`, `@supabase/supabase-js`, and `next-safe-action` vs `main`. Verify `npm run typecheck && npm run lint && npm run test:coverage` pass.

## 2. Proxy integration (`src/proxy.ts`)

- [x] 2.1 (FR-6, FR-8) Refactor `src/proxy.ts` per design D4.
  - Extract `applySecurityHeaders(response)`, keeping the same `SECURITY_HEADERS` and matcher.
  - `proxy(request)` becomes `async` and returns `applySecurityHeaders(await refreshSession(request))`.
  - Update `src/tests/proxy.test.ts`: the existing header test targets `applySecurityHeaders`. New tests mock `refreshSession` and assert all four headers on a response that carries a cookie and on a plain `NextResponse.next()`. The matcher tests are unchanged.
- [x] 2.2 (FR-6, NFR-2) Verify `npm run typecheck && npm run lint && npm run test:coverage && npm run build` pass, and that the build route table reports the same mode for `/` as before the group.

## 3. Auth model and Server Actions (`src/features/auth/model`, `actions`, `api`)

- [x] 3.1 (FR-2, FR-4, FR-5, NFR-1) Implement `model/auth.types.ts`, `model/credentials.schema.ts`, and `model/confirm-params.schema.ts`.
  - `credentials.schema.ts` holds `signInSchema` (valid email, non-empty password) and `signUpSchema` (valid email, at least `MIN_PASSWORD_LENGTH = 8` characters). Validation messages come from `auth-messages.ts`.
  - `confirm-params.schema.ts` holds `confirmParamsSchema`: a non-empty `token_hash` and `type` equal to `"email"` (design D3).
  - Verify with `tests/model/` unit tests: each schema rule, the 7- vs 8-character boundary, and `confirmParamsSchema` rejecting a missing hash and `type=recovery`.
- [x] 3.2 (FR-2, FR-4, FR-5, FR-7) Implement `model/classify-auth-error.ts` and `model/auth-messages.ts` per design D7.
  - `classifyAuthError(error: unknown): AuthFailure` is pure. It checks `code` first, then status 429. `SupabaseConfigError` maps to `unavailable`; anything else maps to `unknown`.
  - `auth-messages.ts` holds the flow × failure texts, the field validation texts, and the exported FR-5 confirm-failed and FR-7 sign-out-failed texts.
  - Implement `model/form-state.ts`: pure `toSignInFormState(result, email)` and `toSignUpFormState(result, email)`, which share one helper for the common branches (design D7).
  - Verify with table-driven unit tests:
    - every safe-action result shape (`validationErrors`, `serverError`, `data.failed` per failure, sign-up `weak-password` → password field error, `check-email`) → the expected form state, which never contains the password;
    - every code in D7, the 429 fallback, a config error, and an unknown value → the expected `AuthFailure`;
    - every flow × failure pair → its exact text;
    - the three unlisted pairs → "Something went wrong. Try again."
- [x] 3.3 (FR-2, FR-4, FR-7, FR-8, NFR-1) Implement `actions/action-client.ts` and `actions/auth.actions.ts` per design D2.
  - `action-client.ts` starts with `import "server-only"`. It creates `authActionClient` with `handleServerError`, which returns the generic text and logs only the error `name`, plus `defaultValidationErrorsShape: "flattened"`.
  - `auth.actions.ts` is a `"use server"` module with three actions:
    - `signInAction`: `.inputSchema(signInSchema)`; `redirect("/")` on success.
    - `signUpAction`: `.inputSchema(signUpSchema)`; returns `check-email` regardless of `identities`.
    - `signOutAction`: calls `scope: "local"`; returns `{ ok }`.
  - Remove the two temporary `knip.jsonc` entries group 1 added (`src/shared/lib/supabase/index.ts` and `next-safe-action`); `npm run knip` must pass without them.
  - Only client creation and the Supabase call sit inside `try`. The `catch` handles only `SupabaseConfigError` and returns `classifyAuthError(error)`; everything else is rethrown. `redirect("/")` is the last statement, outside the `try` (design D2).
  - Verify with `tests/actions/auth.actions.test.ts` (mock `@/shared/lib/supabase/server`, and mock `next/navigation`'s `redirect` to **throw** like the real one), which call the actions directly:
    - invalid input → `validationErrors`, and Supabase is not called;
    - sign-in success → `redirect("/")`;
    - each Supabase failure → `data.failure`;
    - empty `identities` → `check-email`;
    - sign-out passes `scope: "local"`, and a failure gives `ok: false`;
    - config error → `unavailable`;
    - a throwing body → a `serverError` equal to the generic text, with no part of the input.
- [x] 3.4 (FR-7, FR-8) Implement `api/auth.api.ts` and `api/auth.queries.ts`.
  - `getSignedInEmail()` reads the `email` claim via the browser client's `getClaims()`. It returns `null` on no claims, on any error, or on `SupabaseConfigError`, and never throws.
  - `auth.queries.ts` holds `authKeys.session()` = `["auth","session"]` and `sessionQueryOptions` (design D6).
  - Verify with `tests/api/` (mock `@/shared/lib/supabase`): the email/null mapping, and the query key.

## 4. Sign-in and sign-up forms + pages

- [x] 4.1 (FR-1, FR-2, NFR-1, NFR-3, NFR-4) Implement `components/AuthField/AuthField.tsx` and `components/SignInForm/SignInForm.tsx` per design D7.
  - `SignInForm` is a `"use client"` component using `useActionState`, whose `submit` awaits `signInAction` (not `useAction`).
  - The `<form>` has `noValidate`. Inputs are uncontrolled, with `type="email"`/`"password"` and `autocomplete="email"`/`"current-password"`. After a failure the email keeps its value through `defaultValue`.
  - The result mapping follows D7.
  - It takes an optional `initialError` prop for the FR-5 confirm-failed message.
  - Verify with `tests/components/SignInForm.test.tsx` (mock `../../actions/auth.actions`): every FR-1/FR-2 form-level criterion and the NFR-3 wiring.
- [x] 4.2 (FR-3, FR-4, NFR-1, NFR-3, NFR-4) Implement `components/SignUpForm/SignUpForm.tsx` the same way.
  - It uses `autocomplete="new-password"`.
  - `weak-password` becomes a password field error.
  - The check-email state replaces the form.
  - Verify with `tests/components/SignUpForm.test.tsx`: every FR-3/FR-4 form-level criterion and the NFR-3 wiring.
- [x] 4.3 (FR-1, FR-3, FR-5) Add the two pages and export the forms from `src/features/auth/index.ts`.
  - `src/app/(public)/login/page.tsx` reads `searchParams.error` inside the `<Suspense>` boundary Cache Components requires (design D5), and passes the confirm-failed text to `SignInForm` when the value is `confirm-failed`.
  - `src/app/(public)/signup/page.tsx` renders `SignUpForm`.
  - Verify `npm run typecheck && npm run lint && npm run test:coverage && npm run build` pass, and that `/login` and `/signup` appear in the build route table.

## 5. Email confirmation route

- [ ] 5.1 (FR-5, FR-8) Implement `dal/confirm-sign-up.ts` per design D3, and export it from `index.ts`.
  - The module starts with `import "server-only"`. `confirmSignUp(tokenHash, type)` returns `"confirmed" | "failed"`. It parses its input with `confirmParamsSchema` before calling `verifyOtp`, and catches `SupabaseConfigError`.
  - Verify with `tests/dal/confirm-sign-up.test.ts`:
    - success → `"confirmed"`;
    - missing hash, or `type=recovery` → `"failed"`, with `verifyOtp` not called;
    - `verifyOtp` error → `"failed"`;
    - config error → `"failed"`.
- [ ] 5.2 (FR-5) Implement `src/app/auth/confirm/route.ts`.
  - GET only. It reads only `token_hash` and `type`, and answers with a 303 to `/` or to `/login?error=confirm-failed`.
  - Verify with `src/app/auth/confirm/tests/route.test.ts`: every FR-5 route scenario, including `next=https://evil.example` → `Location` is `/`.

## 6. Auth status in the header

- [ ] 6.1 (FR-7, FR-8, NFR-4) Implement `components/AuthStatus/AuthStatus.tsx` per design D6, and export it from `index.ts`.
  - It is a `"use client"` component that reads `useQuery(sessionQueryOptions)`: `isPending` → nothing visible; `null` → "Sign in"; an email → the email + "Sign out".
  - A `useEffect` keyed on `usePathname()` invalidates `authKeys.session()` on every pathname change after the first render. TanStack cancels the superseded fetch and keeps the previous data while refetching. There is no hand-written stale-read guard.
  - Sign out:
    - it calls `signOutAction()` directly;
    - `ok` → `setQueryData(authKeys.session(), null)`, then `router.refresh()`;
    - otherwise → it stays signed in and shows the `role="alert"` sign-out-failed text;
    - the button is disabled while pending.
  - Verify with `tests/components/AuthStatus.test.tsx` (mock `../../api/auth.api`, `../../actions/auth.actions`, and `next/navigation`; render inside a fresh `QueryClientProvider` with `retry: false`): every FR-7 acceptance criterion, including the re-read on a pathname change and the stale read, plus the FR-8 widget criterion.
- [ ] 6.2 (FR-7, NFR-2) Add the `<header>` to `src/app/layout.tsx`.
  - It holds a `next/link` to `/` with `siteConfig.name`, and `AuthStatus`, rendered inside `<Providers>` so the query client is available. Style it with token utilities only.
  - Verify that `npm run build` reports the same mode for `/` as before the change, and that `npm run typecheck && npm run lint && npm run test:coverage` pass.

## 7. Docs and verification

- [ ] 7.1 (FR-6, FR-7) Update `docs/architecture.md` and write the ADR.
  - `docs/architecture.md`:
    - the `src/` tree gains `features/auth/` (including `actions/`), `shared/lib/supabase/`, `app/auth/confirm/`, `(public)/login`, and `(public)/signup`;
    - add the `actions/` role (`"use server"` modules with the `.actions.ts` suffix, plus the feature's action client) to the folder list and the naming rules;
    - add the rule that `shared/lib/supabase/{server,session}` are server-only and imported by subpath, while `index.ts` stays client-safe.
  - Write `docs/decisions/0003-supabase-auth-and-content-split.md`:
    - Contentful holds editorial pages; Supabase holds user-editable content and identity;
    - credentials go through next-safe-action Server Actions (design D2), and the header re-reads on navigation (design D6);
    - all readers share Supabase's per-IP sign-in/sign-up budget; the limit is raised in the dashboard instead of using a secret key with IP forwarding (user decision 2026-10-02), to be revisited before real public traffic;
    - CSP is a recorded follow-up.
  - Verify `npm run lint` passes.
- [ ] 7.2 (NFR-1, NFR-4) Verify statically:
  - `grep -rnE 'service_role|SERVICE_ROLE|SUPABASE_SECRET' src` prints nothing;
  - no `console.*` call in `src/features/auth` or `src/shared/lib/supabase` references a password;
  - `grep -rn "useAction" src/features/auth` prints nothing;
  - `package.json` `dependencies` vs `main` add exactly the three named packages;
  - the color-literal grep over the new component files and `src/app/layout.tsx` prints nothing.
- [ ] 7.3 (FR-1–FR-8, NFR-2) Run the full chain and Gate 3.
  - Run `npm run typecheck && npm run lint && npm run test:coverage && npm run build && npm run knip`; all must pass. Compare the route table with `main` (NFR-2).
  - With the user's Supabase project configured per design's Migration Plan, run Gate 3 (`web-qa`) against the dev server:
    1. sign up → "Check your email";
    2. open the emailed link → lands on `/` signed in, and the header shows the email;
    3. sign out → the header shows "Sign in";
    4. sign in with a wrong password → "Incorrect email or password.";
    5. sign in correctly → `/`, and the header shows the email without a manual reload (this checks the design's browser-client caching risk);
    6. `/auth/confirm?token_hash=bogus&type=email` → `/login` with the confirm-failed alert;
    7. the response headers on `/` still include the four security headers;
    8. with a near-expiry session, sign out → the browser's Supabase session cookies are gone (design Risks: proxy vs action `Set-Cookie`);
    9. with an expired access token, navigate client-side → the header still resolves the session correctly (design D6).
