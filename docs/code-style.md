# Code Style

Read before writing or changing a component, a helper, a type, a constant, or a comment. Folder roles and file naming live in `docs/architecture.md`; this file covers what goes inside a file and what gets its own.

## Comments

- Comment only what the code can't say itself: a non-obvious constraint, a subtle framework behavior, a security or accessibility reason, a deliberate trade-off. Explain *why*, never *what*.
- "Production code" below means application source: `src/` (tests excluded) and `next.config.ts`. Tooling and CI files (`.husky/`, `.github/`, `knip.jsonc`, …) keep their markers, since a requirement on them often has no test to carry one.
- Requirement markers (`implements <ID> of <change>`) belong in tests, on the test that verifies the requirement — `code-review`'s coverage check finds them there.
- Production code may carry a marker only for an `NFR-` that no test verifies; put it on the code that satisfies it. Never put an `FR-` marker in production code.
- A requirement about how code is written rather than what it does (tokens only, stays a Server Component, cache config) is specified as an `NFR-`, not an `FR-`.
- When removing a marker, keep the explanation that followed it only if it passes the first bullet, rewritten as a plain comment.
- A case these rules don't settle is raised for discussion, not decided silently.

## File granularity

### Components

- One component per file. A route file in `app/` holds only its default export; any other component it needs lives in a feature's `components/`.
- A top-level helper in a component file (anything that is not the component) moves to its own file: next to the component if only that component uses it (`SignInForm/submit-sign-in.ts`), or into `model/` if it's pure domain logic.
- Handlers declared inside the component body, using its hooks or state, stay there.

### Types

- Types that aren't domain model — props, variant unions (`ButtonVariant`) — live in `<Component>.types.ts` next to the component, not in the `.tsx`. A route file's own types go in `<route-file>.types.ts` next to it (`error.types.ts`).
- Domain types stay in `model/<name>.types.ts`.

### Functions outside components

- Functions that serve one piece of business logic stay together in one file; unrelated logic gets its own file.

### Constants

- A named constant lives in one file per level: `features/<name>/model/<name>.constants.ts` for a feature, `shared/config/constants.ts` for everything else (`app/`, `shared/`). Create the file with its first constant.
- A constant stays where it is when it is:
  - used by a single function and meaningless without it;
  - UI copy — it stays in the feature's messages file (`auth-messages.ts`);
  - declared in a server-only module;
  - Next.js route segment config — a literal in the route file (see `CLAUDE.md`).
