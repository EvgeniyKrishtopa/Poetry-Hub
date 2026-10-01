# Poetry Hub

Web app for discovering, reading, and collecting poems.

## Current state

- **Home page** (`/`) — a greeting loaded from Contentful (falls back to a static greeting on any CMS failure) and a searchable list of poems. Rendered with ISR (re-renders at most every 60 s).
- **Poems** — served from a mock data source (`src/features/poems/api/poems.api.ts`) behind a stable function signature, so a real backend can replace it without touching queries or UI.
- **On-demand revalidation** — `POST /api/revalidate` is a Contentful publish webhook that expires all Contentful-cached fetches immediately. It is authenticated by a shared secret and fails closed when the secret is unset.
- **Route groups** — `(public)` holds the home page; `(authorized)` is an empty layout reserved for future signed-in routes. URLs are unaffected.
- **Route states** — branded root-level not-found (404), error, and loading screens.
- **Security headers** — `src/proxy.ts` adds `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`, and a restrictive `Permissions-Policy` to every page response.

Not yet built: authentication, a real poems backend, poem detail pages, and collections.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript** (strict)
- **TanStack Query v5** for server state, **Zustand v5** for client UI state
- **Tailwind CSS v4** for layout and basic styling, **CSS Modules** for custom element styles
- **Contentful** (Content Delivery API) for CMS content, **Zod** for validating it
- **Vitest** + Testing Library for unit/component tests, **Playwright** for recorded browser scenarios

## Getting started

Requires Node 24 (pinned in `.nvmrc`) and npm.

```bash
nvm use
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `CONTENTFUL_SPACE_ID` | yes | Contentful space |
| `CONTENTFUL_ACCESS_TOKEN` | yes | Content Delivery API token |
| `CONTENTFUL_ENVIRONMENT` | no | Contentful environment, defaults to `master` |
| `CONTENTFUL_REVALIDATE_SECRET` | for the webhook | Shared secret for `POST /api/revalidate` (generate with `openssl rand -hex 32`) |

All are server-only — never prefix them with `NEXT_PUBLIC_`. Without Contentful credentials the home page still renders, using the static greeting. Webhook setup and secret rotation are described in [`docs/environment.md`](docs/environment.md).

## Scripts

```bash
npm run dev            # dev server
npm run build          # production build
npm run start          # serve the production build
npm run lint           # ESLint; fails on any warning
npm run typecheck      # route type generation + tsc --noEmit
npm test               # Vitest in watch mode
npm run test:coverage  # single run with coverage (80% statements/lines/functions)
npm run knip           # unused files, exports, dependencies
npm run deps:audit     # npm audit, fails on high/critical advisories
npm run deps:outdated  # fails on any available upgrade (held majors in .ncurc.cjs)
npx playwright test    # replay recorded browser scenarios in tests/web-qa-scenarios
```

Before finishing a change, run:

```bash
npm run typecheck && npm run lint && npm run test:coverage && npm run build && npm run knip
```

## Project structure

Feature-first layout:

```
src/
  app/            routing only: layouts, pages, route states, API routes
    (public)/     public routes (home page)
    (authorized)/ reserved for signed-in routes
    api/revalidate/
  features/       business features, each imported only through its index.ts
    home/         CMS greeting: dal/ (server-only), model/, components/
    poems/        poems list and search: api/, model/, components/
  shared/         feature-agnostic code; never imports from features/ or app/
    config/  lib/ (Contentful client, query client)  ui/
  proxy.ts        security headers
```

Tests live in a `tests/` folder at each feature or module root, not next to source.

## Quality gates

- **Git hooks (Husky)** — pre-commit runs typecheck, lint, and lint-staged; pre-push runs the coverage test run and `npm audit`.
- **CI** (`.github/workflows/ci.yml`) — runs typecheck, lint, test:coverage, build, knip, and deps:audit as separate status checks on every PR. A ruleset on `main` blocks merging until all six pass and rejects direct pushes.
- **Dependency freshness** (`.github/workflows/deps-outdated.yml`) — `deps:outdated` runs weekly and on manual dispatch.

## Development workflow

Changes are spec-driven with [OpenSpec](https://github.com/Fission-AI/OpenSpec): each change gets a proposal, design, specs, and tasks under `openspec/changes/`, goes through automated review gates, and is archived into `openspec/specs/` once merged. Current capability specs: `content-revalidation`, `contentful-client`, `home-greeting`, `route-groups`, `route-states`, `security-headers`.

`PROGRESS.md` tracks the change in progress and next steps; `docs/deferred.md` tracks blocked or deferred work.

## Documentation

| Doc | Covers |
| --- | --- |
| [`docs/architecture.md`](docs/architecture.md) | folder layout, naming, feature boundaries |
| [`docs/state-management.md`](docs/state-management.md) | data fetching, stores, DAL, server → client data flow |
| [`docs/styling.md`](docs/styling.md) | Tailwind vs CSS Modules |
| [`docs/testing.md`](docs/testing.md) | test layout and coverage |
| [`docs/environment.md`](docs/environment.md) | environment variables and the Contentful webhook |
| [`docs/decisions/`](docs/decisions) | architecture decision records |
| [`.claude/docs/`](.claude/docs) | git conventions and review gates for the AI-assisted workflow |
