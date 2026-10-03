@AGENTS.md

# Poetry Hub

Web app for discovering, reading, and collecting poems.

## Stack

- **Next.js 16** (App Router, Turbopack, `src/` dir, Cache Components, React Compiler) + **React 19** + **TypeScript** (strict)
- **TanStack Query v5** (server state), **Zustand v5** (client UI state)
- **Tailwind CSS v4** (layout, basic styling) + **CSS Modules** (custom element styles)
- npm as package manager

Next.js 16 differs from older versions — check `node_modules/next/dist/docs/` before using an API you're unsure of (see AGENTS.md).

## Commands

```bash
npm run dev            # dev server (http://localhost:3000)
npm run build          # production build
npm run lint           # ESLint; fails on any warning (--max-warnings 0)
npm run typecheck      # route type generation + tsc --noEmit
npm test               # Vitest in watch mode
npm run test:coverage  # single run with coverage (80% statements/lines/functions)
npm run knip           # dead code: unused files, exports, dependencies (ignores need a reason comment in knip.jsonc)
npm run deps:audit     # npm audit, fails on high/critical advisories not in scripts/audit-allowlist.json (each entry needs a reason + expiry)
npm run deps:outdated  # ncu, fails on any available upgrade; held majors and why live in .ncurc.cjs
```

Validate with `npm run typecheck && npm run lint && npm run test:coverage && npm run build && npm run knip` before finishing a task.

CI (`.github/workflows/ci.yml`) runs six checks (all of the above except `deps:outdated`) on every PR as separate status checks; a ruleset on `main` blocks merging until all six pass and rejects direct pushes, with no bypass for anyone. `deps:outdated` runs weekly and on manual dispatch (`.github/workflows/deps-outdated.yml`), not on PRs.

`.nvmrc` pins Node 24; bumping it means bumping `@types/node` too (held to its major in `.ncurc.cjs`).

## Shell

- The session cwd is already the repo root. Never prefix Bash commands with `cd <repo>` — a compound `cd … && <write>` always forces a manual permission prompt. Use relative paths.
- Put throwaway probes, scripts, and outputs in the session scratchpad, not in `src/` or anywhere else in the repo.

## Always

- Feature-first: `src/app/` is routing only (thin), `src/features/<name>/` holds business features, `src/shared/` is feature-agnostic and never imports from `features/` or `app/`.
- Import a feature only through its public API (`@/features/poems`), never its internals — lint enforces it.
- Server data lives in TanStack Query or a feature's server-only `dal/`; never copy it into Zustand. Never store derived values.
- Tests live in a `tests/` folder at the feature/module root, never next to source.
- Name numeric and string constants; no magic values. Exception: Next.js route segment config (`maxDuration`, …) must be a literal — comment why. Page cache lifetimes use a named `cacheLife` profile (`cacheLife("minutes")`), not a `revalidate` export (rejected under Cache Components) or a magic number.
- At the end of every task group, before its commit, record each task that ends blocked, skipped by decision, or obsolete in `docs/deferred.md`, and add `<!-- deferred: docs/deferred.md -->` to its line. Keep the line and any `blocked` marker in `tasks.md`, because `opsx-apply-git` reads them.

## Read when relevant

Not auto-loaded — open the file before doing the matching kind of work.

| Doc | Read before… |
| --- | --- |
| `docs/architecture.md` | adding a feature or file, naming files, touching `shared/`, cross-feature imports |
| `docs/state-management.md` | fetching data, adding a store, DAL work, server → client data flow |
| `docs/styling.md` | writing or changing component styles |
| `docs/testing.md` | writing or moving tests, coverage questions |
| `docs/environment.md` | adding or reading an environment variable |
| `docs/deferred.md` | finishing a task group, proposing a new change, preparing a deploy |

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
