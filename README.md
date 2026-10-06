# Poetry Hub

Web app for discovering, reading, and collecting poems.

## Current state

- **Home page** (`/`) — a greeting loaded from Contentful (falls back to a static greeting on any CMS failure) and a searchable list of poems. Rendered with Cache Components: the page body is a shared `"use cache"` scope (`cacheLife("minutes")`), tagged so the Contentful webhook can expire it.
- **Poems** — served from a mock data source (`src/features/poems/api/poems.api.ts`) behind a stable function signature, so a real backend can replace it without touching queries or UI.
- **On-demand revalidation** — `POST /api/revalidate` is a Contentful publish webhook that expires all Contentful-cached fetches immediately. It is authenticated by a shared secret and fails closed when the secret is unset.
- **Route groups** — `(public)` holds the home page; `(authorized)` is an empty layout reserved for future signed-in routes. URLs are unaffected.
- **Route states** — branded root-level not-found (404), error, and loading screens.
- **Authentication** (Supabase Auth, email and password) — `/signup`, `/login`, email confirmation through `GET /auth/confirm`, and sign-out from the header. Credentials go through Server Actions built with `next-safe-action`, validated with Zod on the server. The header shows the signed-in email; it reads the session in the browser only, so `/` stays cached and identical for every reader. See [ADR 0003](docs/decisions/0003-supabase-auth-and-content-split.md).
- **Session refresh + security headers** — `src/proxy.ts` refreshes the Supabase session on every page request, then adds `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`, and a restrictive `Permissions-Policy`.

Not yet built: route protection, password reset, a real poems backend (Supabase tables), poem detail pages, and collections.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript** (strict)
- **TanStack Query v5** for server state, **Zustand v5** for client UI state
- **Tailwind CSS v4** for layout and basic styling, **CSS Modules** for custom element styles
- **Contentful** (Content Delivery API) for editorial content, **Zod** for validating it
- **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`) for identity and, later, reader content; **next-safe-action** for validated Server Actions
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
| `NEXT_PUBLIC_SUPABASE_URL` | for auth | Project URL, exactly `https://<project-ref>.supabase.co` (plain `http://` only for `localhost`/`127.0.0.1`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | for auth | The `sb_publishable_…` key. Never a secret or service-role key |

The Contentful variables are server-only — never prefix them with `NEXT_PUBLIC_`. The two Supabase values are public by design (the browser client needs them). Without Contentful credentials the home page still renders, using the static greeting; without valid Supabase values the header shows "Sign in" and the auth forms report that sign-in is unavailable. Webhook setup, secret rotation, and the Supabase dashboard setup (confirmation email template, URL configuration, rate limits) are described in [`docs/environment.md`](docs/environment.md).

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
npm run deps:audit     # npm audit, fails on high/critical advisories not in scripts/audit-allowlist.json
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
    (public)/     public routes: home page, /login, /signup
    (authorized)/ reserved for signed-in routes
    api/revalidate/
    auth/confirm/ sign-up email link handler
  features/       business features, each imported only through its index.ts
    auth/         sign-up, sign-in, sign-out: actions/ (Server Actions), api/, dal/, model/, components/
    home/         CMS greeting: dal/ (server-only), model/, components/
    poems/        poems list and search: api/, model/, components/
  shared/         feature-agnostic code; never imports from features/ or app/
    config/  lib/ (Contentful client, Supabase clients, query client)  ui/
  proxy.ts        session refresh + security headers
```

Tests live in a `tests/` folder at each feature or module root, not next to source.

## Quality gates

- **Git hooks (Husky)** — pre-commit runs typecheck, lint, and lint-staged; pre-push runs the coverage test run and `deps:audit`.
- **CI** (`.github/workflows/ci.yml`) — runs typecheck, lint, test:coverage, build, knip, and deps:audit as separate status checks on every PR. A ruleset on `main` blocks merging until all six pass and rejects direct pushes.
- **Dependency freshness** (`.github/workflows/deps-outdated.yml`) — `deps:outdated` runs weekly and on manual dispatch. It checks for available upgrades only; vulnerabilities are checked by `deps:audit` on every PR and push.
- **Audit exceptions** — `scripts/audit-allowlist.json` lists advisories with no available fix, each with a reason and an expiry date; an expired entry fails the audit again.

## Development workflow

Changes are spec-driven with [OpenSpec](https://github.com/Fission-AI/OpenSpec): each change gets a proposal, design, specs, and tasks under `openspec/changes/`, goes through automated review gates, and is archived into `openspec/specs/` once merged. Current capability specs: `auth`, `ci-pipeline`, `content-revalidation`, `contentful-client`, `home-greeting`, `route-groups`, `route-states`, `security-headers`.

`PROGRESS.md` tracks the change in progress and next steps; `docs/deferred.md` tracks blocked or deferred work.

## Documentation

| Doc | Covers |
| --- | --- |
| [`docs/architecture.md`](docs/architecture.md) | folder layout, naming, feature boundaries |
| [`docs/state-management.md`](docs/state-management.md) | data fetching, stores, DAL, server → client data flow |
| [`docs/styling.md`](docs/styling.md) | Tailwind vs CSS Modules |
| [`docs/testing.md`](docs/testing.md) | test layout and coverage |
| [`docs/environment.md`](docs/environment.md) | environment variables, the Contentful webhook, and the Supabase dashboard setup |
| [`docs/decisions/`](docs/decisions) | architecture decision records |
| [`.claude/docs/`](.claude/docs) | git conventions and review gates for the AI-assisted workflow |
