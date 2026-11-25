# Poetry Hub

Web app for discovering, reading, and collecting poems.

## Current state

A Russian-language site where readers become authors, publish poems, group them into collections, and are read
by anyone. The full catalogue of built behaviour and its rules is in
[`docs/business-features.md`](docs/business-features.md). In short:

- **Accounts** — email and password sign-up with email confirmation, Google sign-in (Supabase OAuth), password recovery by email link, sign-out, and a reader account page. Credentials go through Server Actions built with `next-safe-action` and validated with Zod. See [ADR 0003](docs/decisions/0003-supabase-auth-and-content-split.md) and [ADR 0004](docs/decisions/0004-server-side-header-session.md).
- **Author profiles** — a profile (first name, last name, about in Markdown, photo) is public once both names are set. Public directory at `/authors` and a page per author.
- **Poems** — authors create, edit and delete poems with a genre (from Contentful), Markdown text and an optional illustration, with per-user write limits enforced in Postgres.
- **Collections** — authors group their own poems into collections; a collection is public once its author is public and it holds a poem. A poem belongs to at most one collection.
- **Drag-and-drop ordering** — authors reorder poems and collections and move poems between collections and the free poems, with keyboard and touch support; public pages show the author's order.
- **Home page** — hero, featured poems and authors (chosen by the admin), about, latest publications and a closing invitation. Texts come from Contentful with static fallbacks; each section fails independently.
- **Admin and moderation** — `/admin` (admins only): user list, block, ban, revoke sessions, delete any poem or collection, a violation review list with a 24-hour warning period, an audit log, and home page curation at `/admin/home`. Moderation emails go through Resend.
- **Contact form** — a dialog opened from the footer, delivered to a Telegram chat, with a honeypot field.
- **Editorial pages** — `/about` and `/privacy` from Contentful; `POST /api/revalidate` is the Contentful publish webhook that expires cached content immediately (shared secret, fails closed when unset).
- **Navigation** — header, breadcrumbs on every page but home, footer, and branded not-found, error and loading screens.
- **SEO** — per-page titles, descriptions, canonical URLs, Open Graph and Twitter cards, `robots.txt` and `sitemap.xml`. Signed-in and auth pages are `noindex`.
- **Security** — `src/proxy.ts` refreshes the Supabase session and redirects guests away from account routes, then adds `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY` and a restrictive `Permissions-Policy`. Row-level security on every table; admin power lives in guarded SQL functions, and the app never uses a service-role key.
- **Rendering** — Cache Components: public pages are cached or partially prerendered and session-free; account, admin and reset-password pages render per request.

Not yet built: a deployed production environment (see the Deploy checklist in [`docs/environment.md`](docs/environment.md)) and `/admin` numbered pagination.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript** (strict)
- **TanStack Query v5** for server state, **Zustand v5** for client UI state
- **Tailwind CSS v4** for layout and basic styling, **CSS Modules** for custom element styles
- **Contentful** (Content Delivery API) for editorial content, **Zod** for validating it
- **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`) for auth, author profiles, poems, collections and moderation data (Postgres with RLS, Storage for photos and illustrations); **next-safe-action** for validated Server Actions; **react-markdown** for safe Markdown; **@dnd-kit** for drag and drop; **lucide-react** for icons
- **Resend** for moderation emails and the **Telegram Bot API** for the contact form (both plain HTTP calls, no SDK)
- **Vitest** + Testing Library for unit/component tests, **pgTAP** (`supabase/tests/`) for database rules, **Playwright** for recorded browser scenarios

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
| `NEXT_PUBLIC_SUPABASE_URL` | for auth and author photos (also read at build time; see `docs/environment.md`) | Project URL, exactly `https://<project-ref>.supabase.co` (plain `http://` only for `localhost`/`127.0.0.1`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | for auth | The `sb_publishable_…` key. Never a secret or service-role key |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | for the contact form | Bot and chat that receive contact messages |
| `RESEND_API_KEY`, `EMAIL_FROM` | for moderation emails | Resend key and sender address |
| `SITE_URL` | no | Public address for canonical URLs and the sitemap; defaults to Vercel's production URL |

The Contentful, Telegram and Resend variables are server-only — never prefix them with `NEXT_PUBLIC_`. The two Supabase values are public by design (the publishable key is meant to be exposed). Without Contentful credentials the home page still renders its static fallbacks; without valid Supabase values the header shows "Sign in" and the auth forms report that sign-in is unavailable. Webhook setup, secret rotation, the Supabase dashboard setup (email templates, URL configuration, rate limits, the Google provider, the Before User Created hook), the Contentful content model, and the Deploy checklist are described in [`docs/environment.md`](docs/environment.md).

### Local database

Schema lives in `supabase/migrations/`. A local stack needs Docker:

```bash
npx supabase start      # local Postgres, Auth and Storage
npx supabase db reset   # apply migrations and supabase/seed.sql (five test authors, author1@example.test … author5@example.test)
npx supabase test db    # run the pgTAP tests in supabase/tests/
```

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

Feature-first layout (full details in [`docs/architecture.md`](docs/architecture.md)):

```
src/
  app/                routing only: layouts, pages, route states, API routes
    (public)/         public routes: home, /about, /privacy, /authors/**, /login, /signup, /reset-password
    (authorized)/     signed-in routes: /account/**, /admin/**
    @breadcrumbs/     parallel slot with the breadcrumb trail for every page
    api/revalidate/   Contentful publish webhook
    auth/             confirm (email links) and callback (Google)
    robots.ts  sitemap.ts
  features/           business features, each imported only through its index.ts
    auth/  authors/  poems/  collections/            identity, profiles, public poems and collections
    poem-management/  collection-management/         owner-side create, edit, delete
    work-ordering/                                   drag-and-drop order
    admin/                                           moderation, review list, home curation
    home/  content-page/  contact/                   home sections, about and privacy, contact form
    breadcrumbs/  site-footer/  seo/                 navigation and crawler discovery
  shared/             feature-agnostic code; never imports from features/ or app/
  proxy.ts            session refresh, account-route redirect, security headers
supabase/             migrations, seed.sql, pgTAP tests, email templates
openspec/             capability specs (specs/) and changes (changes/)
tests/web-qa-scenarios/   recorded Playwright scenarios
```

Tests live in a `tests/` folder at each feature or module root, not next to source.

## Quality gates

- **Git hooks (Husky)** — pre-commit runs typecheck, lint, and lint-staged; pre-push runs the coverage test run and `deps:audit`.
- **CI** (`.github/workflows/ci.yml`) — runs typecheck, lint, test:coverage, build, knip, and deps:audit as separate status checks on every PR. A ruleset on `main` blocks merging until all six pass and rejects direct pushes.
- **Dependency freshness** (`.github/workflows/deps-outdated.yml`) — `deps:outdated` runs weekly and on manual dispatch. It checks for available upgrades only; vulnerabilities are checked by `deps:audit` on every PR and push.
- **Audit exceptions** — `scripts/audit-allowlist.json` lists advisories with no available fix, each with a reason and an expiry date; an expired entry fails the audit again.

## Development workflow

Changes are spec-driven with [OpenSpec](https://github.com/Fission-AI/OpenSpec): each change gets a proposal, design, specs, and tasks under `openspec/changes/`, goes through automated review gates, and is archived into `openspec/specs/` once merged. There is one capability spec per area under `openspec/specs/` (for example `auth`, `author-profiles`, `poem-management`, `collection-management`, `work-ordering`, `admin-moderation`, `home-sections`, `page-metadata`); [`docs/business-features.md`](docs/business-features.md) maps them to product behaviour.

`PROGRESS.md` tracks the change in progress and next steps; `docs/deferred.md` tracks blocked or deferred work.

## Documentation

| Doc | Covers |
| --- | --- |
| [`docs/business-features.md`](docs/business-features.md) | every built product feature and its business rules |
| [`docs/architecture.md`](docs/architecture.md) | folder layout, naming, feature boundaries |
| [`docs/state-management.md`](docs/state-management.md) | data fetching, stores, DAL, server → client data flow |
| [`docs/code-style.md`](docs/code-style.md) | component, helper, type and comment conventions |
| [`docs/styling.md`](docs/styling.md) | Tailwind vs CSS Modules |
| [`docs/design-system.md`](docs/design-system.md) | design tokens, primitives and states |
| [`docs/testing.md`](docs/testing.md) | test layout and coverage |
| [`docs/environment.md`](docs/environment.md) | environment variables, the Contentful webhook, the Supabase dashboard setup and the Deploy checklist |
| [`docs/deferred.md`](docs/deferred.md) | work left blocked, skipped or obsolete by a change |
| [`docs/decisions/`](docs/decisions) | architecture decision records |
| [`.claude/docs/`](.claude/docs) | git conventions and review gates for the AI-assisted workflow |
