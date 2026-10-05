# Design

## Context

Supabase will hold user-editable content (poems), and Contentful will keep only editorial pages. Before any table exists, readers need an identity. This change wires Supabase Auth (email/password) into a Next.js 16 App Router app that today:

- serves `/` from `src/app/(public)/page.tsx`. A separate Cache Components change lands before this one and replaces `/`'s `revalidate = 60` with `"use cache"`. This change must not alter whatever rendering mode `/` has when it starts. The root layout reads nothing per request;
- runs `src/proxy.ts`, a synchronous proxy that only sets four security headers on matched paths (static assets and dotted paths excluded);
- has an `(authorized)` route group that enforces nothing and has no pages;
- adds three runtime dependencies: `@supabase/ssr`, `@supabase/supabase-js`, and `next-safe-action` (v8). They are already installed in the working tree but not yet on `main`.

Facts from the Supabase SSR docs that the design relies on:

- Server Components can't write cookies; Server Actions and route handlers can. The proxy refreshes the auth token by calling `supabase.auth.getClaims()`, and writes the refreshed cookies to both the forwarded request and the response.
- `getClaims()` verifies the JWT (locally against a cached JWKS for asymmetric keys) and is the method to use for identity checks. `getSession()` is not re-validated.
- Sign-up confirmation through the server uses an email-template link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`, verified with `verifyOtp({ type, token_hash })`.
- New projects use a publishable key (`sb_publishable_…`). It is designed to be public.
- `@supabase/ssr` session cookies are not HttpOnly, so the browser client can read a session the server wrote.

Facts from the next-safe-action v8 docs:

- `createSafeActionClient({ handleServerError })` builds an action client. `.inputSchema(zodSchema).action(fn)` defines an action.
- When the input fails the schema, the action body never runs, and the result carries `validationErrors`.
- An unexpected throw becomes `result.serverError`, whose value is whatever `handleServerError` returns.
- Framework navigation errors (`redirect()`) are rethrown, so Next performs the redirect.
- `useAction` keeps the last `input` in hook state. This matters for NFR-1; see D7.

## Goals / Non-Goals

**Goals:**
- sign-up with email confirmation, sign-in, and sign-out through Server Actions, with server-side schema validation at the trust boundary;
- a session kept fresh by the proxy;
- a header widget that reflects the session without making `/` read cookies;
- no account enumeration through sign-in or sign-up messages;
- no open redirect.

**Non-Goals:** route protection, password reset, OAuth, profiles, any database tables, CSP, the Cache Components migration itself (see proposal Out of Scope).

## Decisions

### D1 — `shared/lib/supabase` is infrastructure; `features/auth` is the feature

`docs/architecture.md` allows an external-service client in `shared/lib` from its first consumer, following the `shared/lib/contentful` precedent. The proxy (`src/proxy.ts`, outside features) needs the session refresh, and the future poems feature will need the clients. So the clients live in `shared/`:

```
src/shared/lib/supabase/
├── config.ts      # getSupabaseConfig(): zod-validated { url, publishableKey }; NOT server-only (browser needs it)
├── errors.ts      # SupabaseConfigError (message names variables only)
├── browser.ts     # getSupabaseBrowserClient(): createBrowserClient singleton, auth.autoRefreshToken: false (Gate 1 P3)
├── server.ts      # "server-only"; createSupabaseServerClient(): createServerClient + next/headers cookies()
├── session.ts     # "server-only"; refreshSession(request): Promise<NextResponse>, used by the proxy only
├── index.ts       # client-safe exports only: getSupabaseBrowserClient, SupabaseConfigError
└── tests/
```

`index.ts` must stay importable from Client Components, so it does not re-export `server.ts` or `session.ts`. Those two start with `import "server-only"`, and consumers import them by subpath: `@/shared/lib/supabase/server`, `@/shared/lib/supabase/session`. The lint rule restricts deep imports only for `@/features/*/*`, so this is allowed. It is documented in `docs/architecture.md`.

`config.ts` must read `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as literal property accesses. Next inlines `NEXT_PUBLIC_*` into the browser bundle only for literal accesses. Validation follows `getContentfulConfig` (FR-8): lazy, on every call. Issue paths are mapped to variable names, and the Zod error is never attached as `cause`. URL rule: `https:` with any host, or `http:` only for host `localhost`/`127.0.0.1` (local Supabase CLI).

The feature:

```
src/features/auth/
├── model/
│   ├── auth.types.ts          # AuthFailure, SignInResult / SignUpResult / SignOutResult, form state unions
│   ├── credentials.schema.ts  # signInSchema, signUpSchema; MIN_PASSWORD_LENGTH = 8 (shared by action + tests)
│   ├── confirm-params.schema.ts # confirmParamsSchema: { token_hash: non-empty, type: literal "email" } (Gate 1 P6)
│   ├── classify-auth-error.ts # pure: unknown → AuthFailure — the only place SupabaseConfigError → "unavailable" (P7)
│   ├── form-state.ts          # pure: toSignInFormState / toSignUpFormState(result, email) (Gate 1 C1)
│   └── auth-messages.ts       # every user-facing auth string (FR-2/4/5/7 + field validation texts)
├── actions/
│   ├── action-client.ts       # "server-only"; authActionClient = createSafeActionClient({ handleServerError, … })
│   └── auth.actions.ts        # "use server"; signInAction, signUpAction, signOutAction
├── api/
│   ├── auth.api.ts            # browser-only read: getSignedInEmail() → string | null; never throws
│   └── auth.queries.ts        # authKeys.session() = ["auth","session"]; sessionQueryOptions (Gate 1 P5)
├── dal/
│   └── confirm-sign-up.ts     # "server-only"; confirmSignUp(tokenHash, type) → "confirmed" | "failed"
├── components/
│   ├── SignInForm/SignInForm.tsx
│   ├── SignUpForm/SignUpForm.tsx
│   ├── AuthStatus/AuthStatus.tsx
│   └── AuthField/AuthField.tsx   # label + input + error wiring shared by both forms (NFR-3)
├── tests/
└── index.ts                   # SignInForm, SignUpForm, AuthStatus, confirmSignUp
```

- **`actions/` is a new feature folder role.** It holds Server Actions (`"use server"` modules, suffix `.actions.ts`) and the feature's action client. The role is documented in `docs/architecture.md` next to `api/` and `dal/`.
- **The action client lives in the feature, not `shared/`.** Auth is its only consumer today. Per the architecture rule ("don't create a `shared/` abstraction until a second feature needs it"), it moves to `shared/lib` when the poems change adds the second consumer.
- **The index mixes export kinds.** `index.ts` re-exports the server-only `confirmSignUp` alongside Client Components. This is not the same as `features/home/index.ts`, whose consumers are all Server Components. Only Server Components and route handlers import the auth index. The Client Components import their siblings, including `../../actions/auth.actions`, by relative path. Importing a `"use server"` module from a Client Component is the supported way to call an action. If a client module ever imports the index, the build fails loudly.
- **Deferred to the poems change (Gate 1 #4, user decision 2026-10-02):** Client Components in another feature will need "who is signed in". They cannot import this index. The poems change decides where client-side session reading lives. Because the read is now a TanStack query (`authKeys.session()`, D6), the likely answer is to move `auth.queries.ts` + `getSignedInEmail` to `shared/lib/supabase`, so any feature can `useQuery(sessionQueryOptions)` against the same cache entry.

*Alternative:* everything under `features/auth`, including the Supabase clients. Rejected: the proxy and the future poems feature would then import a feature's internals.

### D2 — Credentials go through Server Actions built with next-safe-action (user decision 2026-10-02)

Sign-in, sign-up, and sign-out are Server Actions defined with `authActionClient`:

- **`signInAction`**: `.inputSchema(signInSchema)`. The body creates `createSupabaseServerClient()` and calls `signInWithPassword`.
  - On success it calls `redirect("/")`. The server client's `setAll` has already written the session cookies through `cookies()`.
  - On a Supabase error it returns `{ status: "failed", failure: classifyAuthError(error) }`.
  - A `SupabaseConfigError` thrown by client creation is caught in the body and returned as `failure: classifyAuthError(error)`. That function is the only place the `unavailable` rule lives (Gate 1 P7).
  - **`redirect` stays outside every `try` (Gate 1 P1).** Only client creation and the Supabase call sit inside `try`, and the `catch` handles only `error instanceof SupabaseConfigError`, rethrowing everything else. `redirect("/")` is the last statement, after the `try`. A broad catch would swallow `NEXT_REDIRECT` and show "Something went wrong" instead of navigating. The action tests mock `redirect` to **throw**, as the real one does, so a swallowed redirect fails the test.
- **`signUpAction`**: `.inputSchema(signUpSchema)`. It calls `signUp`.
  - On success it returns `{ status: "check-email", email }`, whatever `data.user.identities` contains (anti-enumeration, FR-4).
  - On failure it returns `{ status: "failed", failure }`.
  - No `emailRedirectTo` is passed; the email template builds the link from Site URL.
- **`signOutAction`**: no input. It calls `signOut({ scope: "local" })` and returns `{ ok: true } | { ok: false }`.
  - `scope: "local"` ends this device's session only. The default `global` would sign the reader out everywhere, which this change does not promise.
  - On a logout failure other than 401/403/404, supabase-js keeps the session, and its cookies stay. The result is `ok: false` (Gate 1 #1).

`authActionClient` is created with `handleServerError: () => GENERIC_SERVER_ERROR` ("Something went wrong. Try again."). It logs only the error's `name` and never the action input, so the password cannot reach the logs (NFR-1). It uses `defaultValidationErrorsShape: "flattened"`, so a form reads `validationErrors.fieldErrors.email?.[0]`.

Why next-safe-action is used here:
- the Zod schema is enforced **on the server**, which is the trust boundary;
- the result type is a discriminated `data | validationErrors | serverError`;
- error handling for every action is centralized, without hand-writing that plumbing per action.

Next.js's built-in Server Action origin check covers CSRF. No action accepts a redirect target, so there is no open redirect.

*Superseded alternative:* the earlier draft of this design called Supabase from the browser client. The user chose Server Actions: the server owns every credential flow, and input is validated where it can't be bypassed. The cost is the header-sync problem, which D6 solves by re-reading the session on navigation.

### D3 — Server side: confirm route

- `src/app/auth/confirm/route.ts` stays thin. It reads `token_hash` and `type`, calls `confirmSignUp` from `@/features/auth`, and returns `NextResponse.redirect(new URL(target, request.url), 303)`.
  - The target is either `/` or `/login?error=confirm-failed`.
  - No other query parameter is read (FR-5, no open redirect).
  - It sits outside both route groups, next to `api/`, so the email-template path is `/auth/confirm`.
- `confirmSignUp` handles the verification:
  - It parses `{ token_hash, type }` with `confirmParamsSchema` from `model/` (ADR 0001: `dal/` validates with a schema from `model/`; Gate 1 P6). A parse failure returns `"failed"` without calling Supabase. It stays in `dal/` and must never move to `actions/`: a `"use server"` export would be a publicly callable endpoint.
  - It catches `SupabaseConfigError` and returns `"failed"`. Any other thrown error (a network failure in `verifyOtp`, a failing `cookies()`) also returns `"failed"`, after logging only the error's `name` (user decision 2026-10-03, group 5).
    - Unlike the actions, the route doesn't let an unexpected error through: a reader who clicked an email link should land on `/login` with a next step, not a bare 500. The log line marks an outage that surfaces as a thrown error; supabase-js returns most network failures as `{ error }`, which reads as a bad link and is not logged (accepted after the group 5 deep review).
  - On `verifyOtp` success, `createSupabaseServerClient`'s `setAll` writes the session cookies through `cookies()`.
- `createSupabaseServerClient` wraps `setAll` in try/catch, the documented `@supabase/ssr` pattern for Server Component callers. In this change only actions and the route handler call it, and both can write cookies.

### D4 — Proxy: refresh first, headers last

```ts
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const response = await refreshSession(request);   // never throws (see below)
  return applySecurityHeaders(response);
}
```

- **The refresh pattern.** `refreshSession(request)` (in `shared/lib/supabase/session.ts`) starts from `NextResponse.next({ request })`. It creates a server client whose `getAll` reads `request.cookies` and whose `setAll` writes to `request.cookies` and to a fresh `NextResponse.next({ request })`, following the documented pattern. It then awaits `getClaims()` and returns the response.
- **No shared caching of a response that sets cookies (Gate 1 #5).** When `setAll` has written at least one cookie, `refreshSession` sets `Cache-Control: private, no-store` on the returned response.
  - If the installed `@supabase/ssr` passes cache headers as `setAll`'s second argument, those are applied *first*. `Cache-Control` is then overwritten with exactly `private, no-store`: ours always wins, and tests assert strict equality.
  - A response that sets no cookie keeps the page's own caching.
- **Config error.** On `SupabaseConfigError` it logs `"[supabase] invalid configuration: <names>"` via `console.error` and returns `NextResponse.next()` (FR-8).
- **Thrown error.** A *thrown* error from `getClaims` (an exception or rejected promise, e.g. network) is caught. The proxy returns the un-refreshed `NextResponse.next({ request })`, without logging the error's payload.
- **Resolved `{ error }`.** A *resolved* `{ error }` (e.g. a revoked refresh token) is not treated as a failure. The proxy returns the response `setAll` built, cookie removals included, plus the no-store rule above. A dead session is then cleared rather than retried on every request.
- **Availability.** A Supabase outage must not take down every page.
- **Headers.** `applySecurityHeaders(response)` replaces the body of today's `proxy()`. `SECURITY_HEADERS` and the matcher are unchanged.
- **No redirects.** The proxy does no redirects in this change.

### D5 — `/` keeps its rendering mode

The root layout gains a `<header>` with `AuthStatus`. `AuthStatus` is a Client Component that reads the session only after mount, through the browser client. So the server HTML is identical for every reader, and neither the layout nor `/` calls `cookies()`. Whatever `/`'s mode is when this change starts (after the Cache Components change), the build reports the same mode for `/` afterwards (NFR-2).

**`/` is a shared cache scope.** After the Cache Components change, `/`'s page body runs inside `"use cache"` (`cacheLife("minutes")`, tagged for the Contentful webhook), and its output is shared by every reader. Nothing inside that scope may read cookies, the session, or Supabase user data: per-user data would either break the build or, worse, be cached and served to other readers. User-specific UI must sit outside the scope, as `AuthStatus` does: it lives in the root layout's header, renders nothing user-specific on the server, and reads the session only in the browser after mount (D6).

`/login` and `/signup` are Server Component pages that render the client forms. `/login` reads `searchParams.error` (FR-5). Under Cache Components a `searchParams` read is request-time data. The page therefore wraps the part that reads it in `<Suspense>`, as Cache Components requires. The implementer follows the build's guidance, and `npm run build` is the arbiter.

### D6 — `AuthStatus`: a TanStack query, invalidated on every navigation (user decision 2026-10-02; Gate 1 P5)

The session read is server state read from cookies. Per `docs/state-management.md` and laziness-ladder rung 4 (an already-installed dependency), it is a TanStack query, not hand-written effect state:

- `api/auth.queries.ts`: `authKeys = { session: () => ["auth", "session"] as const }`; `sessionQueryOptions = queryOptions({ queryKey: authKeys.session(), queryFn: getSignedInEmail })`.
- **Three states, from the query.**
  - `isPending` → nothing visible: an empty element of fixed min-width, no text.
  - `data === null` → "Sign in" link.
  - `data` is a string → the email + "Sign out".
- **What `getSignedInEmail()` returns.** It resolves to `string | null`: the `email` claim from the browser client's `getClaims()`, or `null` when there are no claims, on any error, or on `SupabaseConfigError` (FR-8). It never throws, so the query never enters an error state.
- **When it re-reads.** A `useEffect` keyed on `usePathname()` calls `queryClient.invalidateQueries({ queryKey: authKeys.session() })` on every pathname change after the first render. The success `redirect("/")` from `/login` and the full-page load from `/auth/confirm` are both pathname changes, so the header catches up after sign-in and confirmation.
- **Latest read wins, no flicker.** Both come from TanStack defaults. Invalidation cancels an in-flight fetch (`cancelRefetch: true`), so a superseded read never lands. The previous `data` stays rendered while the refetch runs.
- **Window focus.** The default `refetchOnWindowFocus` also re-reads when the reader returns to the tab. That is accepted as a free partial cross-tab sync, and it stays out of the acceptance criteria.
- **No server prefetch.** The query is never prefetched on the server: the server render must stay identical for every reader (D5), so the first client render is `isPending`.
- **Placement.** The header renders inside `<Providers>` (the `QueryClientProvider` in the root layout).
- **No `onAuthStateChange`.** Auth state changes come from Server Actions, which the browser client never observes.
- **The browser client does not refresh tokens** (`autoRefreshToken: false`, Gate 1 P3). The proxy is the only refresher on page and RSC requests, so two refreshers never race on refresh-token rotation.
  - If a soft navigation reads an access token that is already expired, `getClaims()` may still attempt a one-off refresh inside its session load. That refresh writes cookies from the browser. This is acceptable, and the Gate 3 checklist covers an expired-token read.
- **Sign out.** The button calls `signOutAction()` directly (not `useAction`, D7) and is disabled while pending.
  - `data.ok` → `queryClient.setQueryData(authKeys.session(), null)` → `router.refresh()`.
  - `data.ok === false` or `serverError` → the cache is untouched, the widget stays signed in, and a local `role="alert"` reads "Couldn't sign out. Try again." The widget never claims to be signed out while the cookies still exist.

### D7 — Forms: `useActionState` wrapping the safe action; uncontrolled inputs

Each form is a `"use client"` component:

```ts
const [state, formAction, pending] = useActionState(submit, initialState);
// submit(prev, formData): reads email/password from FormData, awaits signInAction({ email, password }),
// and maps the safe-action result to the next state — never storing the password.
```

- **Hook choice.** The form uses React's `useActionState`, not next-safe-action's `useAction`, because `useAction` keeps the last `input`, including the password, in hook state (NFR-1). `useActionState` keeps only what `submit` returns.
- **Inputs.** They are uncontrolled: `name="email"` with `type="email"`, and `name="password"` with `type="password"`. No `required` attribute. The `<form>` carries `noValidate` (clarify finding 2), so the server-side schema is the only validation. Its field errors, with their NFR-3 wiring, are what the reader sees.
- **Keeping the email after a failure.** React 19 resets the form, so on error the email keeps its value through `defaultValue={state.email}`.
- **Result mapping lives in `model/form-state.ts`, not in the components (Gate 1 C1).** `submit` only reads `FormData`, awaits the action, and returns `toSignInFormState(result, email)` or `toSignUpFormState(result, email)`. Both mappers share one helper for the common branches:
  - `validationErrors` → `{ status: "invalid", email, fieldErrors }`. The schema's messages come from `auth-messages.ts`.
  - `serverError` → `{ status: "failed", email, failure: "unknown" }`.
  - `data.status === "failed"` → `{ status: "failed", email, failure }`.

  Sign-up-only branches live in `toSignUpFormState`:
  - `weak-password` → `{ status: "invalid", email, fieldErrors: { password } }`, because FR-4 shows it on the field.
  - `check-email` → the terminal state.

  Sign-in success never returns: the action's `redirect("/")` navigates. The mappers are pure and table-tested without rendering.

`AuthFailure = "invalid-credentials" | "email-not-confirmed" | "rate-limited" | "weak-password" | "unavailable" | "unknown"`. The pure `model/classify-auth-error.ts` (`classifyAuthError(error: unknown): AuthFailure`) owns the rule, and the actions only call it:
1. by `code` first: `invalid_credentials`, `email_not_confirmed`, `over_request_rate_limit` / `over_email_send_rate_limit`, `weak_password`;
2. then `status === 429` → `rate-limited`;
3. then `SupabaseConfigError` → `unavailable`;
4. everything else → `unknown`.

`auth-messages.ts` maps each failure to text per flow. Each flow has only the strings its FR lists (FR-2 for sign-in, FR-4 for sign-up). An unlisted pair maps to "Something went wrong. Try again." and never reuses the other flow's text (clarify finding 3).

`AuthField` is the one shared presentational piece: a label, an input, and an optional error `<p id>`, with the `aria-invalid`/`aria-describedby` wiring. It stays inside the feature.

### D8 — Testing approach

- **`shared/lib/supabase/tests/`:**
  - config: the URL and key rules; messages name variables only.
  - browser: the client is a singleton; a config error propagates.
  - server: `setAll` writes through the mocked cookie store.
  - session: mock `@supabase/ssr`; drive `setAll` from a mocked `getClaims`; cover the cookie, `no-store`, config-error, throw, and resolved-error paths.
- **`features/auth/tests/`:**
  - model: schemas (including the 7- vs 8-character boundary, and `confirmParamsSchema`); `classifyAuthError` as a pure table; `toSignInFormState` / `toSignUpFormState` as pure tables over every result shape; messages for every flow × failure pair.
  - actions: mock `@/shared/lib/supabase/server` and `next/navigation`'s `redirect`. The mock **throws** a redirect-shaped error, like the real one (P1). Then call the actions directly. Each returns a next-safe-action result, so tests assert:
    - invalid input → `validationErrors`, and Supabase is not called;
    - sign-in success → `redirect("/")`;
    - each failure → `data.failure`;
    - sign-up with empty `identities` → `check-email`;
    - `signOut` gets `scope: "local"`, and a failure gives `ok: false`;
    - `SupabaseConfigError` → `unavailable`;
    - a `serverError` result never contains the password.
  - api: mock `getSupabaseBrowserClient`; claims → email; no claims, error, or config error → `null`; `sessionQueryOptions` uses key `["auth","session"]`.
  - dal: mock `createSupabaseServerClient`; the type and hash guards; the config error.
  - components: mock `../../actions/auth.actions`, `../../api/auth.api`, and `next/navigation` (`usePathname`, `useRouter`). Render `AuthStatus` inside a fresh `QueryClientProvider` per test, with `retry: false`. Test with Testing Library by role and label, covering every FR-1..FR-4, FR-7, and NFR-3 criterion. That includes a pathname change triggering a re-read, and a stale read being dropped.
- **`src/app/auth/confirm/tests/route.test.ts`:** every FR-5 case.
- **`src/tests/proxy.test.ts`:** `applySecurityHeaders`, plus the composed `proxy` with `refreshSession` mocked. The matcher tests are unchanged.
- **Browser QA (Gate 3)** covers the real flow against a real Supabase project: sign up, email, confirm, signed-in header, sign out. `src/app/**` stays excluded from coverage.

## Flow — sign-up and confirmation

```mermaid
sequenceDiagram
    actor Reader
    participant Form as SignUpForm (browser)
    participant Action as signUpAction (server, next-safe-action)
    participant SB as Supabase Auth
    participant Mail as Reader's inbox
    participant Route as GET /auth/confirm (route handler)
    participant DAL as confirmSignUp (server-only)
    participant Proxy as proxy.ts

    Reader->>Form: email + password, "Create account"
    Form->>Action: signUpAction({ email, password })
    Action->>Action: inputSchema (signUpSchema)
    alt invalid input
        Action-->>Form: validationErrors (Supabase not called)
        Form-->>Reader: field errors
    else valid
        Action->>SB: signUp(email, password)
        alt success (new or already-registered email)
            SB--)Mail: confirmation email (template → /auth/confirm?token_hash&type=email)
            SB-->>Action: ok
            Action-->>Form: data { status: check-email, email }
            Form-->>Reader: "Check your email — reader@example.com"
        else weak_password
            SB-->>Action: AuthError
            Action-->>Form: data { failed, weak-password }
            Form-->>Reader: password field error
        else rate limit / SupabaseConfigError / other
            Action-->>Form: data { failed, failure }
            Form-->>Reader: role=alert (FR-4)
        else unexpected throw
            Action-->>Form: serverError (generic, no input logged)
            Form-->>Reader: role=alert "Something went wrong. Try again."
        end
    end
    Reader->>Proxy: opens link from email
    Proxy->>Proxy: refreshSession (no session yet) + security headers
    Proxy->>Route: forward
    Route->>DAL: confirmSignUp(token_hash, type)
    alt type=email, hash present, verifyOtp ok
        DAL->>SB: verifyOtp
        SB-->>DAL: session
        DAL->>DAL: setAll → cookies() (session cookies)
        DAL-->>Route: "confirmed"
        Route-->>Reader: 303 → / (full load; AuthStatus mounts and reads the email)
    else anything else
        DAL-->>Route: "failed"
        Route-->>Reader: 303 → /login?error=confirm-failed
    end
```

## Flow — sign-in, header update, sign-out

```mermaid
sequenceDiagram
    actor Reader
    participant Status as AuthStatus (root layout header)
    participant BC as Supabase browser client (read-only)
    participant Form as SignInForm (browser)
    participant Action as signInAction / signOutAction (server)
    participant SB as Supabase Auth
    participant Proxy as proxy.ts

    Status->>BC: getClaims() on mount / pathname change
    alt claims with email
        BC-->>Status: email
        Status-->>Reader: email + "Sign out"
    else no claims / error / SupabaseConfigError
        BC-->>Status: null
        Status-->>Reader: "Sign in" link
    end
    Reader->>Form: email + password, "Sign in"
    Form->>Proxy: POST /login (Server Action request)
    Proxy->>Proxy: refreshSession (may refresh cookies) + security headers
    Proxy->>Action: forward
    Action->>Action: inputSchema (signInSchema)
    alt invalid input
        Action-->>Form: validationErrors (Supabase not called)
        Form-->>Reader: field errors
    else valid
        Action->>SB: signInWithPassword
        alt ok
            SB-->>Action: session
            Action->>Action: setAll → cookies() (session cookies)
            Action-->>Form: action response: Set-Cookie (session) + redirect to / with its RSC payload
            Note over Proxy: refreshSession outcomes on any request — claims valid/refreshed → cookies + no-store; SupabaseConfigError → console.error(names), NextResponse.next(); resolved {error} → setAll's response (cookies removed) + no-store; throw → un-refreshed response. Security headers always.
            Note over Status: pathname /login → / → invalidate ["auth","session"]
            Status->>BC: getClaims()
            BC-->>Status: email
            Status-->>Reader: email + "Sign out"
        else invalid_credentials / email_not_confirmed / rate limit / config / other
            SB-->>Action: AuthError
            Action-->>Form: data { failed, failure }
            Form-->>Reader: role=alert message (FR-2)
        else unexpected throw
            Action-->>Form: serverError
            Form-->>Reader: role=alert "Something went wrong. Try again."
        end
    end
    Reader->>Status: "Sign out"
    Status->>Proxy: POST (signOutAction request)
    Proxy->>Proxy: refreshSession (may write refreshed cookies)
    Proxy->>Action: forward
    Action->>SB: signOut({ scope: "local" })
    alt ok (or 401/403/404: session already gone)
        Action->>Action: setAll → cookies cleared (action's Set-Cookie must win over any proxy refresh; verified in Gate 3)
        Action-->>Status: data { ok: true }
        Status->>Status: setQueryData(["auth","session"], null)
        Status-->>Reader: "Sign in"
        Status->>Status: router.refresh()
    else network / 5xx / serverError
        Action-->>Status: data { ok: false } or serverError (cookies kept)
        Status-->>Reader: still signed in + role=alert "Couldn't sign out. Try again."
    end
```

## Risks / Trade-offs

- **Session cookies are readable by JavaScript.** This is how `@supabase/ssr` works, and the header relies on it. An XSS bug could therefore exfiltrate a session. Current mitigation: React escaping, no `dangerouslySetInnerHTML`, and no third-party scripts. CSP is Out of Scope and recorded as a follow-up in ADR 0003.
- **Proxy and action both writing cookies on one response (Gate 1 P4).** The proxy runs before every Server Action POST and may refresh the session cookies. `signOutAction` then clears them on the same response. If the proxy's refreshed `Set-Cookie` were emitted after the action's deletion, the browser would keep a session. Mitigation: Gate 3 verifies, with a near-expiry token, that the session cookies are gone after sign-out. If they are not, the implementer skips the proxy refresh for Server Action requests (`Next-Action` header) that target sign-out. That is a local change in `proxy.ts`.
- **The browser client may cache the session.** D6 assumes the browser client's `getClaims()` reads the current cookies on every call, so it sees cookies a Server Action just wrote. If the installed supabase-js holds the session in memory instead, the header would lag behind a sign-in. Mitigation: Gate 3 checks the header right after sign-in and sign-out. If it lags, the implementer creates a fresh browser client per read instead of a singleton, which is cheap because it holds no subscription. This is a local change inside `browser.ts`.
- **Header sync depends on navigation.** A sign-in that ended on the same pathname would not trigger a re-read. Today every auth transition changes the pathname (`/login` → `/`, `/auth/confirm` → `/`), or the widget performs it itself (sign-out). A future flow that breaks this rule must refresh the widget explicitly.
- **All readers share one Supabase sign-in/sign-up budget (Gate 1 P2, verified in the Supabase docs; user decision 2026-10-02).**
  - Supabase Auth rate-limits `sign_in_sign_ups` per IP (default 30 per 5 minutes). Every call now comes from the Next server's IP, so all readers share that budget, and one abuser can exhaust it.
  - Forwarding the reader's IP (`Sb-Forwarded-For`) is honoured only with a **secret** key. That conflicts with NFR-1.
  - **Decision:** keep the publishable key, and raise `sign_in_sign_ups` in the dashboard (Migration Plan step 4).
  - Recorded as an accepted trade-off in ADR 0003, with a revisit trigger: before real public traffic, reconsider a secret-key, auth-only server client with IP forwarding.
- **Proxy adds an auth check to every matched request.** `getClaims` with asymmetric keys verifies locally against a cached JWKS. It calls the network only to refresh a token. Supabase errors never fail the request (D4).
- **Account enumeration.** Sign-in shows one message for a wrong email and a wrong password. Sign-up always shows "Check your email". Supabase returns `email_not_confirmed` only after a correct password.
- **Dashboard configuration drift.** The confirm flow depends on manual Supabase settings (Migration Plan). Gate 3 exercises the real email link.
- **Password length mismatch.** The app requires 8 characters; the dashboard minimum is set to 8. Any stronger server rule surfaces as `weak_password`.
- **A server-only export sits in an index that also exports Client Components.** The failure mode is a loud build error, not a leak. Cross-feature client reuse is deferred to the poems change (D1).
- **The action client lives in the feature.** It moves to `shared/lib` when a second feature needs it (D1). Until then the error policy is defined once, in `actions/action-client.ts`.

## Migration Plan

This change depends on the Cache Components change being merged first (user decision 2026-10-02). It is additive: no existing URL changes.

Before Gate 3 / deploy, the user configures these manually:

1. Supabase dashboard → Authentication → URL Configuration: Site URL = `http://localhost:3000` for dev (the deployed URL at deploy time). Add both to Redirect URLs.
2. Supabase dashboard → Authentication → Emails → "Confirm sign up" template: the link `href` becomes `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
3. Supabase dashboard → Authentication → Providers → Email: "Confirm email" on; minimum password length 8.
4. Supabase dashboard → Authentication → Rate Limits: raise "sign-ups and sign-ins" above the default 30 per 5 minutes. All readers share the server's IP budget (see Risks).
5. `.env.local` and the hosting platform: set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Rollback: revert the change's merge commit. The dashboard settings are harmless without the code.
