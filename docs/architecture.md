# Architecture

Read before adding a feature, adding a file to `shared/`, or importing across features.

## Project structure (feature-first)

```
src/
├── app/                      # Routing only: pages, layouts, route handlers, providers
│   ├── layout.tsx            # Root shell: html/body/Providers + header (site link, AuthStatus)
│   ├── error.tsx             # Client error boundary: generic copy + digest, retry() (covers both groups)
│   ├── not-found.tsx         # 404 screen for unmatched URLs (covers both groups)
│   ├── loading.tsx           # Neutral loading state for any segment (covers both groups)
│   ├── (public)/             # Route group (no URL segment): pages anyone can read
│   │   ├── layout.tsx        # Pass-through
│   │   ├── page.tsx          # / (home)
│   │   ├── login/page.tsx    # /login (reads ?error= inside <Suspense>)
│   │   └── signup/page.tsx   # /signup
│   ├── (authorized)/         # Route group for pages that will need a signed-in reader
│   │   └── layout.tsx        # Pass-through placement marker; enforces nothing yet
│   ├── api/                  # Route handlers, outside both groups
│   ├── auth/confirm/route.ts # Sign-up email link: verifies the token, 303 to / or /login?error=confirm-failed
│   ├── providers.tsx         # QueryClientProvider (+ devtools)
│   └── globals.css           # Tailwind import + design tokens
├── features/                 # One folder per business feature
│   ├── auth/                 # Sign-up, sign-in, sign-out, header session widget
│   └── poems/
│       ├── actions/          # Server Actions ("use server", *.actions.ts) + the feature's action client
│       ├── api/              # Fetchers (*.api.ts) + query keys/options/hooks (*.queries.ts)
│       ├── dal/              # Server-only data access for Server Components (no role suffix)
│       ├── model/            # Types, Zustand stores (*.store.ts), pure domain logic
│       ├── components/       # Feature UI, one folder per component (+ .module.css)
│       ├── tests/            # Tests, mirroring the feature (tests/model/…, tests/components/<Name>.test.tsx)
│       └── index.ts          # Public API of the feature
└── shared/                   # Feature-agnostic code only
    ├── ui/                   # Reusable UI primitives (Button, …) + index.ts
    ├── lib/                  # Infrastructure helpers (query-client, …)
    │   ├── contentful/       # Server-only Contentful GraphQL client, cached with "use cache" (every module: import "server-only")
    │   └── supabase/         # Supabase clients: index.ts client-safe (browser client, SupabaseConfigError); server.ts and session.ts server-only
    └── config/               # App-wide constants
```

## Boundary rules

- `app/` stays thin: compose features, prefetch data, declare page caching (`"use cache"` + `cacheLife` + `cacheTag`, see `docs/state-management.md`), no business logic.
- A new page goes in `app/(public)/` unless it needs a signed-in reader; then it goes in `app/(authorized)/`. That group enforces nothing yet — placing a page there does not protect it; the auth change that introduces sign-in owns enforcement (proxy or DAL/page checks, never a layout-only check). Route handlers under `app/api/` stay outside both groups.
- Import a feature only through its public API: `@/features/poems`, never `@/features/poems/model/...` (enforced by `no-restricted-imports` in `eslint.config.mjs`).
- Features must not import from other features' internals. If two features need the same thing, move it to `shared/` or compose them in `app/`.
- `shared/` never imports from `features/` or `app/`.
- Inside a feature, use relative imports; across layers, use the `@/` alias.
- Don't create a `shared/` abstraction until a second feature actually needs it. Exception: an infrastructure client for an external service (e.g. `shared/lib/contentful`, `shared/lib/supabase`) may live in `shared/lib` from its first consumer.
- `shared/lib/supabase/index.ts` stays client-safe. Its server-only modules start with `import "server-only"` and are imported by subpath: `@/shared/lib/supabase/server` (actions, route handlers, `dal/`) and `@/shared/lib/supabase/session` (the proxy only). Identity and reader content live in Supabase, editorial pages in Contentful (`docs/decisions/0003-supabase-auth-and-content-split.md`).
- A feature index that exports a server-only module (e.g. `features/auth` exports `confirmSignUp`) is imported only by Server Components and route handlers. The feature's own Client Components import their siblings by relative path, including its `"use server"` actions.

## Naming

- Components: `PascalCase` folder + file (`PoemCard/PoemCard.tsx`, `PoemCard.module.css`), named exports only (except Next.js route files, which need default exports).
- Non-component files: `kebab-case` with a role suffix (`poems.api.ts`, `poems.queries.ts`, `poems-ui.store.ts`, `poem.types.ts`, `auth.actions.ts`). Exception: modules in a feature's `dal/` folder take no suffix (`dal/home-greeting.ts`).
- A feature's `actions/` folder holds `"use server"` modules (`<name>.actions.ts`, exporting only Server Actions) and the feature's action client (`action-client.ts`, `import "server-only"`). Server Actions are public endpoints: validate input with a `model/` schema and never export anything else from a `"use server"` module.
- Add `"use client"` only to components that need hooks, state, or browser APIs; keep pages as Server Components.
- Keep domain logic in pure functions under `model/` so it's testable without React.

## Adding a new feature

1. Create `src/features/<name>/{api,model,components}` and `index.ts`.
2. Types in `model/<name>.types.ts`; fetchers in `api/<name>.api.ts`; keys + `queryOptions` + hooks in `api/<name>.queries.ts`. Server-only data for Server Components goes in `dal/<name>.ts` instead (see `docs/decisions/0001-feature-dal-folder.md`).
3. UI state (if any) in `model/<name>-ui.store.ts`.
4. Export only what `app/` needs from `index.ts`.
5. Wire it up in a route under `src/app/`.
