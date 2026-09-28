@AGENTS.md

# Poetry Hub

Web app for discovering, reading, and collecting poems.

## Stack

- **Next.js 16** (App Router, Turbopack, `src/` dir) + **React 19** + **TypeScript** (strict)
- **TanStack Query v5** — server state (fetching, caching, hydration)
- **Zustand v5** — client UI state
- **Tailwind CSS v4** — layout and basic styling
- **CSS Modules** — custom element styles
- npm as package manager

Next.js 16 differs from older versions — check `node_modules/next/dist/docs/` before using an API you're unsure of (see AGENTS.md).

## Commands

```bash
npm run dev        # dev server (http://localhost:3000)
npm run build      # production build
npm run lint       # ESLint
npm run typecheck  # route type generation + tsc --noEmit
npm test               # Vitest in watch mode
npm run test:coverage  # single run with coverage (80% statements/lines/functions)
```

Validate with `npm run typecheck && npm run lint && npm run test:coverage && npm run build` before finishing a task.

Tests: Vitest + Testing Library (jsdom), colocated as `*.test.ts(x)` next to the code. Test pure `model/` logic directly; test components through user-visible behavior (roles, labels). `src/app/**` is excluded from coverage — route composition and async Server Components are verified by browser QA (`web-qa`) instead.

## Shell

- The session cwd is already the repo root. Never prefix Bash commands with `cd <repo>` — a compound `cd … && <write>` always forces a manual permission prompt. Use relative paths.
- Put throwaway probes, scripts, and outputs in the session scratchpad, not in `src/` or anywhere else in the repo.

## Project structure (feature-first)

```
src/
├── app/                      # Routing only: pages, layouts, route handlers, providers
│   ├── layout.tsx
│   ├── page.tsx
│   ├── providers.tsx         # QueryClientProvider (+ devtools)
│   └── globals.css           # Tailwind import + design tokens
├── features/                 # One folder per business feature
│   └── poems/
│       ├── api/              # Fetchers (*.api.ts) + query keys/options/hooks (*.queries.ts)
│       ├── dal/              # Server-only data access for Server Components (no role suffix)
│       ├── model/            # Types, Zustand stores (*.store.ts), pure domain logic
│       ├── components/       # Feature UI, one folder per component (+ .module.css)
│       └── index.ts          # Public API of the feature
└── shared/                   # Feature-agnostic code only
    ├── ui/                   # Reusable UI primitives (Button, …) + index.ts
    ├── lib/                  # Infrastructure helpers (query-client, …)
    │   └── contentful/       # Server-only Contentful GraphQL client (every module: import "server-only")
    └── config/               # App-wide constants
```

### Boundary rules

- `app/` stays thin: compose features, prefetch data, no business logic.
- Import a feature only through its public API: `@/features/poems`, never `@/features/poems/model/...` (enforced by `no-restricted-imports` in `eslint.config.mjs`).
- Features must not import from other features' internals. If two features need the same thing, move it to `shared/` or compose them in `app/`.
- `shared/` never imports from `features/` or `app/`.
- Inside a feature, use relative imports; across layers, use the `@/` alias.
- Don't create a `shared/` abstraction until a second feature actually needs it. Exception: an infrastructure client for an external service (e.g. `shared/lib/contentful`) may live in `shared/lib` from its first consumer.

## State management

| Kind of state | Where it lives |
| --- | --- |
| Server data (anything fetched) | TanStack Query — never copy it into Zustand |
| Server-only data rendered only by Server Components (CMS content, anything needing a secret) | The feature's `dal/` folder — see below |
| Client UI state (filters, search, toggles, modals) | Zustand store in `features/<name>/model/<name>-ui.store.ts` |
| Local component state | `useState` |
| Form state | local state (add a form library only when needed) |
| Derived values | computed during render / in pure functions — never stored |

### TanStack Query conventions

- Define a key factory per feature (`poemsKeys`) and export `queryOptions(...)` objects; hooks wrap those options.
- The same `queryOptions` are used for server prefetching (`prefetchQuery` + `HydrationBoundary` in a Server Component page) and for client hooks.
- Use `getQueryClient()` from `@/shared/lib/query-client` — per-request on the server, singleton in the browser.
- Fetchers in `*.api.ts` are plain async functions returning typed data; they know nothing about React.

### Server-only data (DAL)

- Data that needs a secret and is consumed only by Server Components goes through a module in `features/<name>/dal/` (e.g. `dal/home-greeting.ts` — the folder names the role, so no `.dal.ts` suffix): starts with `import "server-only"`, validates the response with a Zod schema from `model/`, and returns a typed result. Never wrap it in `queryOptions` or client hooks — a client refetch would need the secret.
- The page awaits the DAL and passes plain values to synchronous presentational components (Vitest can't render async Server Components).

### Zustand conventions

- One small store per feature concern; no global god-store.
- Always read via selectors: `useStore((s) => s.field)` — never destructure the whole store.
- Stores are module singletons, so only use them in Client Components and only for client-only state. If a store ever needs server-provided initial data, switch to a per-request store created in a context provider.

## Styling

- **Tailwind** for layout, spacing, typography, and simple colors (`flex`, `grid`, `gap-4`, `text-muted`).
- **CSS Modules** (`Component.module.css`, colocated) for anything custom: hover/transition effects, pseudo-elements, complex selectors, component variants.
- Both read the same design tokens defined in `src/app/globals.css` — Tailwind via `@theme` (`bg-surface`, `text-accent`), CSS Modules via `var(--color-surface)`. Add new colors as tokens there; don't hard-code hex values in components.
- Combining both on one element is fine: `className={\`${styles.card} flex gap-3 p-6\`}`.
- Do not use `@apply` in CSS Modules; use plain CSS.

## Environment variables

- `.env.example` (committed) lists every variable **by name only** — never put a value in it. Real values live in `.env.local` (git-ignored) and on the hosting platform.
- Contentful: `CONTENTFUL_SPACE_ID`, `CONTENTFUL_ACCESS_TOKEN` (Content Delivery API token), optional `CONTENTFUL_ENVIRONMENT` (defaults to `master`). Server-only: never prefix them with `NEXT_PUBLIC_`.
- They are validated lazily on each call; a missing or malformed value fails as a `config` error naming the variable, never its value.

## Conventions

- Components: `PascalCase` folder + file (`PoemCard/PoemCard.tsx`, `PoemCard.module.css`), named exports only (except Next.js route files, which need default exports).
- Non-component files: `kebab-case` with a role suffix (`poems.api.ts`, `poems.queries.ts`, `poems-ui.store.ts`, `poem.types.ts`). Exception: modules in a feature's `dal/` folder take no suffix (`dal/home-greeting.ts`).
- Add `"use client"` only to components that need hooks, state, or browser APIs; keep pages as Server Components.
- Keep domain logic in pure functions under `model/` so it's testable without React.

## Adding a new feature

1. Create `src/features/<name>/{api,model,components}` and `index.ts`.
2. Types in `model/<name>.types.ts`; fetchers in `api/<name>.api.ts`; keys + `queryOptions` + hooks in `api/<name>.queries.ts`. Server-only data for Server Components goes in `dal/<name>.ts` instead (see `docs/decisions/0001-feature-dal-folder.md`).
3. UI state (if any) in `model/<name>-ui.store.ts`.
4. Export only what `app/` needs from `index.ts`.
5. Wire it up in a route under `src/app/`.

## Harness (sdd-harness-web-ykryshtopa)

- @.claude/docs/git-conventions.md — branch/commit conventions. This is
  also the documented authorization for `opsx-apply-git` to commit
  automatically at task-group and archive boundaries (its §3/§5.3) —
  without this reference, that override isn't discoverable and shouldn't
  be assumed.
- @.claude/docs/review-gates.md — the seven automated review gates and
  their order.
- @.claude/docs/laziness-ladder.md — priority order to check before
  writing new code; does not apply to trust-boundary validation,
  data loss, security, or accessibility.
- @CONTEXT.md — this project's glossary of domain terms. `spec-reviewer`
  checks every spec against it; without this reference it never loads into
  a session and the check has nothing to read.
- @.claude/harness.json — detected stack (framework, package manager,
  test runner, coverage threshold). Every skill and hook in this harness
  reads from here; do not re-detect any of it.
- PROGRESS.md — current change, status, and next steps as of the last
  stop. `SessionStart` already prints its in-progress/blocked line and
  Next steps section at the start of every session; read the file itself
  for anything beyond that digest (the Done list, clock-in/out history). Not
  `@`-imported — the hook already surfaces it, so importing it too would
  load the same content twice.
- docs/decisions/ — one ADR-format file per architectural decision that
  outlives a single change; see `docs/decisions/NNNN-*.md` if the
  directory exists yet. Not auto-loaded — read the relevant file when a
  past decision might be in play.
