@AGENTS.md

# Poetry Hub

Web app for discovering, reading, and collecting poems.

## Stack

- **Next.js 16** (App Router, Turbopack, `src/` dir) + **React 19** + **TypeScript** (strict)
- **TanStack Query v5** (server state), **Zustand v5** (client UI state)
- **Tailwind CSS v4** (layout, basic styling) + **CSS Modules** (custom element styles)
- npm as package manager

Next.js 16 differs from older versions — check `node_modules/next/dist/docs/` before using an API you're unsure of (see AGENTS.md).

## Commands

```bash
npm run dev            # dev server (http://localhost:3000)
npm run build          # production build
npm run lint           # ESLint
npm run typecheck      # route type generation + tsc --noEmit
npm test               # Vitest in watch mode
npm run test:coverage  # single run with coverage (80% statements/lines/functions)
```

Validate with `npm run typecheck && npm run lint && npm run test:coverage && npm run build` before finishing a task.

## Shell

- The session cwd is already the repo root. Never prefix Bash commands with `cd <repo>` — a compound `cd … && <write>` always forces a manual permission prompt. Use relative paths.
- Put throwaway probes, scripts, and outputs in the session scratchpad, not in `src/` or anywhere else in the repo.

## Always

- Feature-first: `src/app/` is routing only (thin), `src/features/<name>/` holds business features, `src/shared/` is feature-agnostic and never imports from `features/` or `app/`.
- Import a feature only through its public API (`@/features/poems`), never its internals — lint enforces it.
- Server data lives in TanStack Query or a feature's server-only `dal/`; never copy it into Zustand. Never store derived values.
- Tests live in a `tests/` folder at the feature/module root, never next to source.
- Name numeric and string constants; no magic values. Exception: Next.js route segment config (`revalidate`, …) must be a literal — comment why.

## Read when relevant

Not auto-loaded — open the file before doing the matching kind of work.

| Doc | Read before… |
| --- | --- |
| `docs/architecture.md` | adding a feature or file, naming files, touching `shared/`, cross-feature imports |
| `docs/state-management.md` | fetching data, adding a store, DAL work, server → client data flow |
| `docs/styling.md` | writing or changing component styles |
| `docs/testing.md` | writing or moving tests, coverage questions |
| `docs/environment.md` | adding or reading an environment variable |

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
