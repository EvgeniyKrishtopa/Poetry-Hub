# Proposal

## Why

Poetry Hub has no route-level fallbacks yet. An unknown URL shows Next.js's unstyled built-in 404 page. A render error in the home page (for example, the poems prefetch throwing) has no error boundary below the root, so the reader sees Next.js's generic error screen with no way to recover. Navigation also shows nothing while a segment is loading. Adding the three App Router conventions — `not-found.tsx`, `error.tsx`, `loading.tsx` — at the root segment gives every route a branded, accessible fallback before more routes (poem detail, collections) are added. Upcoming routes also split into pages anyone can read and pages that will need a signed-in reader, so this change also creates the `(public)` and `(authorized)` route groups. Later changes can then put routes in the right group without moving files again.

## What Changes

- Add `src/app/not-found.tsx`: a branded "page not found" screen with a link back to the home page. It is rendered for unmatched URLs and for any `notFound()` call in the root segment's subtree.
- Add `src/app/error.tsx` (Client Component): a branded error screen that shows a generic message (never the raw error message), shows the error's `digest` as a reference when present, logs the error to the browser console, and offers a "Try again" button that calls Next.js's `retry()` (refresh + boundary reset, stable since Next.js 16.3).
- Add `src/app/loading.tsx`: an accessible loading state (a `role="status"` region with screen-reader text and a decorative skeleton) shown while a route segment streams.
- Add route groups: move the home page from `src/app/page.tsx` to `src/app/(public)/page.tsx` (URL `/` unchanged). Give `(public)/` and `(authorized)/` each a pass-through `layout.tsx`. `(authorized)/` has no pages and no auth logic yet; its layout carries a comment marking where the guard goes when auth arrives.
- Add unit tests for the three fallback files and the two group layouts under `src/app/tests/`.

## Requirements

- **FR-1**: An unmatched URL SHALL render the app's not-found screen with HTTP status 404, inside the root layout. The screen SHALL contain an `h1` reading "Page not found", a short explanation, and a link to `/`.
- **FR-2**: When a page or component inside the root layout throws during rendering, the app SHALL render its error screen inside the root layout instead of the failing segment. The screen SHALL contain an `h1` reading "Something went wrong" and a generic explanation.
- **FR-3**: The error screen SHALL NOT render the thrown error's `message` or stack. When the error carries a `digest`, the screen SHALL show it as "Error reference: <digest>"; when it doesn't, no reference line is shown.
- **FR-4**: The error screen SHALL offer a "Try again" button. Activating it SHALL call the `retry` function Next.js passes to the boundary, exactly once per activation.
- **FR-5**: The error screen SHALL log the caught error to the browser console with `console.error` once each time it receives a new error.
- **FR-6**: While a route segment under the root layout is loading, the app SHALL render a loading state. That state is a `role="status"` region whose accessible text is "Loading…", plus skeleton blocks that are hidden from assistive technology.
- **FR-7**: The home page SHALL be served from `src/app/(public)/page.tsx` at URL `/`, with unchanged behavior: CMS greeting with static fallback, poems list, and ISR with `revalidate = 60`. No `src/app/page.tsx` SHALL remain.
- **FR-8**: `src/app/(public)/layout.tsx` and `src/app/(authorized)/layout.tsx` SHALL render their `children` unchanged, with no wrapper element, data fetching, or auth logic. `(authorized)/` SHALL contain no page, so the change adds no new URL.
- **NFR-1**: The three screens SHALL use only existing design tokens (`globals.css`) and Tailwind utilities; no hard-coded colors, no new dependencies.
- **NFR-2**: The loading skeleton's pulse animation SHALL be disabled when the reader prefers reduced motion (`prefers-reduced-motion: reduce`).
- **NFR-3**: Only `error.tsx` SHALL be a Client Component; `not-found.tsx` and `loading.tsx` SHALL remain Server Components.

## Acceptance Criteria

- **FR-1** — Given the app is running, When a browser requests `/does-not-exist`, Then the response status is 404 and the page shows the `h1` "Page not found" and a link whose `href` is `/`.
- **FR-1** — Given the not-found screen is shown, When the reader activates the home link, Then the browser navigates to `/` and the home page renders.
- **FR-2** — Given the root error boundary receives an `Error`, When it renders, Then the `h1` "Something went wrong" and the generic explanation are visible.
- **FR-3** — Given an error with message "secret internal detail" and digest "abc123", When the error screen renders, Then the text "secret internal detail" is absent and "Error reference: abc123" is present.
- **FR-3** — Given an error with no `digest`, When the error screen renders, Then no "Error reference" text is present.
- **FR-4** — Given the error screen is shown, When the reader clicks "Try again", Then `retry` has been called exactly once.
- **FR-5** — Given the error screen mounts with an error, When it renders, Then `console.error` has been called once with that error; and When it re-renders with a different error, Then `console.error` has been called once more, with the new error.
- **FR-6** — Given a route segment is loading, When the loading state renders, Then an element with role `status` and accessible text "Loading…" is present, and the skeleton blocks carry `aria-hidden="true"`.
- **FR-7** — Given the change is complete, When `npm run build` runs, Then its route list shows `/` as revalidated every 1m (ISR) and the set of routes is identical to the build on `main` before the change.
- **FR-7** — Given the app is running, When a browser requests `/`, Then the home greeting heading and the poem list render as before the change.
- **FR-8** — Given either group layout, When it renders a child element, Then the output is exactly that child, with no added wrapper element.
- **NFR-1** — Given the change is complete, When the three new screen files are searched for hex color literals (`#[0-9a-fA-F]{3,8}`), `rgb(`/`hsl(` calls, and Tailwind arbitrary color values (`-[#`, `-[rgb`, `-[hsl`), and `package.json` `dependencies` are diffed, Then there are no matches and no runtime dependency changes. (Note, Gate 3: `@playwright/test` was added as a devDependency by user decision to record the passed browser flows as scenarios; it is test tooling, not a dependency of the screens.)
- **NFR-2** — Given the loading state renders, When its skeleton blocks are inspected, Then each carries both `animate-pulse` and `motion-reduce:animate-none`.
- **NFR-3** — Given the change is complete, When the first statement of each new route file (the three screens and two group layouts) is read, Then only `error.tsx` starts with `"use client"`.

## Test Plan

| Requirement | Test(s) | Level |
| --- | --- | --- |
| FR-1 (unknown URL → 404, heading, link to `/`) | Unit: not-found screen renders `h1` "Page not found" and a link with `href="/"`. E2E (Gate 3): `GET /does-not-exist` returns 404 and shows the screen | unit + end-to-end |
| FR-1 (home link navigates to `/`) | E2E (Gate 3): activate the link on the not-found screen, home page renders | end-to-end |
| FR-2 (heading + generic explanation) | Unit: error screen rendered with an `Error` shows `h1` "Something went wrong" and the explanation | unit |
| FR-3 (message absent, digest shown) | Unit: error `{ message: "secret internal detail", digest: "abc123" }` → message text absent, "Error reference: abc123" present | unit |
| FR-3 (no digest → no reference line) | Unit: error without `digest` → no "Error reference" text | unit |
| FR-4 (Try again calls `retry` once) | Unit: click "Try again" → `retry` mock called exactly once | unit |
| FR-5 (logged once on mount) | Unit: `console.error` spy called once with the error after mount | unit |
| FR-5 (new error logged on re-render) | Unit: `rerender` with a different error → spy called once more with the new error | unit |
| FR-6 (status region + hidden skeleton) | Unit: `getByRole("status")` has accessible text "Loading…"; every skeleton block has `aria-hidden="true"` | unit |
| FR-7 (build route list unchanged, `/` ISR 1m) | Integration: production build's route table compared against the pre-move baseline; `/` listed as revalidated every 1m | integration |
| FR-7 (`/` renders as before) | E2E (Gate 3): `/` shows the greeting heading and the poem list | end-to-end |
| FR-8 (layouts add no markup) | Unit: each group layout rendered around a marker child → container's only child is the marker | unit |
| NFR-1 (no hard-coded colors, no new deps) | Static check (task 4.1): color-literal grep over the three screen files is empty; `package.json`/lockfile diff vs `main` is empty | integration |
| NFR-2 (reduced motion) | Unit: every skeleton block carries `animate-pulse` and `motion-reduce:animate-none` | unit |
| NFR-3 (only `error.tsx` is a Client Component) | Static check (task 4.1): first statement of the five new route files; only `error.tsx` is `"use client"` | integration |

## Capabilities

### New Capabilities
- `route-states`: the app-wide fallback screens Next.js renders for a missing route, a render error, and a loading segment.
- `route-groups`: the split of routes into a `(public)` group and an `(authorized)` group, and what each group's layout may contain.

### Modified Capabilities

None.

## Out of Scope

- `global-error.tsx`: errors thrown by the root layout itself stay on Next.js's built-in fallback. The root layout has no data fetching or logic today, so this is a deliberate YAGNI deferral, not an oversight.
- Segment-specific `error`/`not-found`/`loading` files for routes that don't exist yet (poem detail, collections).
- Reporting errors to an external monitoring service; console logging only.
- Custom metadata (page `<title>`) for the not-found screen.
- Any authentication, session handling, or redirect in `(authorized)/`: the group is a placeholder until an auth change defines it.
- Per-group `error`/`loading` files: the root ones cover both groups (decided with the user).

## Impact

- New files: `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/loading.tsx`, `src/app/(public)/layout.tsx`, `src/app/(authorized)/layout.tsx`, `src/app/tests/{not-found,error,loading,group-layouts}.test.tsx`.
- Moved: `src/app/page.tsx` → `src/app/(public)/page.tsx` (contents unchanged; relative imports, if any, adjusted).
- Docs: the `src/app/` tree in `docs/architecture.md` lists the fallback files and the two groups, plus a one-line rule on which group a new route goes in.
- No new URLs. No changes to features, `shared/`, APIs, dependencies, or environment variables. `src/app/**` stays excluded from coverage (`docs/testing.md`). The unit tests still run, and Gate 3 browser QA covers the not-found flow end to end.

## Open Questions

None.
