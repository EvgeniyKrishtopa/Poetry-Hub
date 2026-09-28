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
```

Validate with `npm run typecheck && npm run lint && npm run build` before finishing a task. No test runner is set up yet — when the first real behavior lands, add Vitest + Testing Library and a `test` script (pure `model/` functions are the first candidates).

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
│       ├── model/            # Types, Zustand stores (*.store.ts), pure domain logic
│       ├── components/       # Feature UI, one folder per component (+ .module.css)
│       └── index.ts          # Public API of the feature
└── shared/                   # Feature-agnostic code only
    ├── ui/                   # Reusable UI primitives (Button, …) + index.ts
    ├── lib/                  # Infrastructure helpers (query-client, …)
    └── config/               # App-wide constants
```

### Boundary rules

- `app/` stays thin: compose features, prefetch data, no business logic.
- Import a feature only through its public API: `@/features/poems`, never `@/features/poems/model/...` (enforced by `no-restricted-imports` in `eslint.config.mjs`).
- Features must not import from other features' internals. If two features need the same thing, move it to `shared/` or compose them in `app/`.
- `shared/` never imports from `features/` or `app/`.
- Inside a feature, use relative imports; across layers, use the `@/` alias.
- Don't create a `shared/` abstraction until a second feature actually needs it.

## State management

| Kind of state | Where it lives |
| --- | --- |
| Server data (anything fetched) | TanStack Query — never copy it into Zustand |
| Client UI state (filters, search, toggles, modals) | Zustand store in `features/<name>/model/<name>-ui.store.ts` |
| Local component state | `useState` |
| Form state | local state (add a form library only when needed) |
| Derived values | computed during render / in pure functions — never stored |

### TanStack Query conventions

- Define a key factory per feature (`poemsKeys`) and export `queryOptions(...)` objects; hooks wrap those options.
- The same `queryOptions` are used for server prefetching (`prefetchQuery` + `HydrationBoundary` in a Server Component page) and for client hooks.
- Use `getQueryClient()` from `@/shared/lib/query-client` — per-request on the server, singleton in the browser.
- Fetchers in `*.api.ts` are plain async functions returning typed data; they know nothing about React.

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

## Conventions

- Components: `PascalCase` folder + file (`PoemCard/PoemCard.tsx`, `PoemCard.module.css`), named exports only (except Next.js route files, which need default exports).
- Non-component files: `kebab-case` with a role suffix (`poems.api.ts`, `poems.queries.ts`, `poems-ui.store.ts`, `poem.types.ts`).
- Add `"use client"` only to components that need hooks, state, or browser APIs; keep pages as Server Components.
- Keep domain logic in pure functions under `model/` so it's testable without React.

## Adding a new feature

1. Create `src/features/<name>/{api,model,components}` and `index.ts`.
2. Types in `model/<name>.types.ts`; fetchers in `api/<name>.api.ts`; keys + `queryOptions` + hooks in `api/<name>.queries.ts`.
3. UI state (if any) in `model/<name>-ui.store.ts`.
4. Export only what `app/` needs from `index.ts`.
5. Wire it up in a route under `src/app/`.
