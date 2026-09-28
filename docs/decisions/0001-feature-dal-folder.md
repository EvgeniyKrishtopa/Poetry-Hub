# 0001. Server-only data access lives in a feature's `dal/` folder

## Status

Accepted (2026-09-28)

## Context

`add-contentful-home-greeting` introduced the project's first server-only data access: CMS content that needs a secret token and is rendered only by Server Components, so it must not go through TanStack Query (`queryOptions` / client hooks would need the token on the client). The first implementation placed it in the feature's `api/` folder as `api/home-greeting.dal.ts`, next to the client-side fetchers (`*.api.ts`) and query options (`*.queries.ts`). On review, the project owner decided the DAL should be its own layer of the feature rather than a file-name suffix inside `api/`.

## Decision

- Each feature keeps its server-only data access in its own `features/<name>/dal/` folder (e.g. `src/features/home/dal/home-greeting.ts`).
- Modules there take **no** role suffix: the folder already names the role. This is the one exception to the "kebab-case with a role suffix" naming convention in CLAUDE.md.
- The rules for what goes there are unchanged: every module starts with `import "server-only"`, validates responses with a Zod schema from the feature's `model/`, returns a typed result, and is never wrapped in `queryOptions` or client hooks.
- `api/` stays for client-consumable fetchers and TanStack Query options only. Dependency direction is `dal/ → model/`, never the reverse.

## Consequences

**Positive**

- The server-only boundary is visible in the folder tree: everything under `dal/` is server-only, everything under `api/` is safe to reach from the client through query options.
- A future lint rule can target the folder (e.g. forbid importing `*/dal/*` from `"use client"` files) instead of a file-name pattern.

**Negative**

- One exception to the role-suffix naming convention; editor tabs show `home-greeting.ts` without a role hint.

## Alternatives Considered

- `api/<name>.dal.ts` (role suffix inside `api/`) — the first implementation; rejected because it mixes server-only and client-consumable data access in one folder, so the boundary is only visible in file names.
- `dal/<name>.dal.ts` (folder plus suffix) — rejected as redundant: the folder already names the role.
- A shared `shared/lib/cms` or `features/content` DAL for all content types — rejected (YAGNI, design.md D1): there is one content type; data access stays with the feature that owns the schema.
