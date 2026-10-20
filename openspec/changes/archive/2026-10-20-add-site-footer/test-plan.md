# Test plan

One row per acceptance criterion in `proposal.md`. Levels: **unit** (a pure function or a
component rendered with Testing Library, collaborators mocked), **end-to-end** (a real browser
against the running app, Gate 3). Rows marked **static check** are verified by a command in
the task list, not by a test; see the note at the end.

| Requirement | Tests | Level |
| --- | --- | --- |
| FR-1 — `/`, `/login`, `/signup`, `/authors`, `/authors/<id>`, `/account`, `/account/author` (signed in), and `/does-not-exist` each have exactly one `contentinfo` landmark, after `main` | Gate 3: open each route, read the accessibility tree; one `contentinfo`, after `main` in document order (task 2.4). The error and loading screens are covered by structure, not by a row (FR-1) | end-to-end |
| FR-2 (founding year) — clock 2026-10-20 (UTC) → `© 2026 Поэтический Хаб` | `SiteFooter.test.tsx`: `vi.setSystemTime` to 2026-10-20, render `await SiteFooter()`, the `contentinfo` contains the exact text (task 1.4); `copyright-years.test.ts`: 2026/2026 → `2026` (task 1.2) | unit |
| FR-2 (first year after) — clock 2027-01-01T00:00:00Z → `© 2026–2027 Поэтический Хаб` | `SiteFooter.test.tsx`: clock at 2027-01-01T00:00:00Z, the exact text with the en dash (task 1.4); `copyright-years.test.ts`: 2026/2027 → `2026–2027` (task 1.2) | unit |
| FR-2 (later year) — clock 2030-06-15 (UTC) → `© 2026–2030 Поэтический Хаб` | `SiteFooter.test.tsx`: clock at 2030-06-15, the exact text (task 1.4); `copyright-years.test.ts`: 2026/2030 → `2026–2030`, plus 2026/2025 → `2026` for a backwards clock (design D2, task 1.2) | unit |
| FR-3 — the navigation «Информация о проекте» holds exactly three links, in order, with `/about`, `/privacy`, `/contact` | `SiteFooter.test.tsx`: `getByRole("navigation", { name })`, `within(...).getAllByRole("link")` has length 3, names and `href`s in order (task 1.4) | unit |
| FR-4 — activating «О проекте» gives 404, «Страница не найдена», footer still present | Gate 3: click each of the three footer links; response 404, the not-found `h1`, one `contentinfo` (task 2.4) | end-to-end |
| NFR-1 — a `contentinfo` landmark contains a `navigation` landmark named «Информация о проекте» | `SiteFooter.test.tsx`: `getByRole("contentinfo")` contains `getByRole("navigation", { name: "Информация о проекте" })` (task 1.4) | unit |
| NFR-2 — no `"use client"` in `src/features/site-footer/` | `grep` in task 2.3 prints nothing | static check |
| NFR-3 — every `○` route on `main` stays `○`, none newly `ƒ` | `npm run build` route table compared with `main`'s (task 2.3) | static check |
| NFR-4 (literals) — no colour literals or arbitrary colour values in the feature's source | The literal search in task 2.3 prints nothing | static check |
| NFR-4 (computed colours) — copyright and links at rest are `muted`, a hovered link is `accent`, in both schemes | Gate 3: `getComputedStyle(...).color` on the notice, a link, and a hovered link under light and dark emulation (task 2.4) | end-to-end |
| NFR-5 — `SiteFooter.tsx` holds no path or copy literal | Read of `SiteFooter.tsx` in task 2.3 (and code review) | static check |
| NFR-6 — `docs/architecture.md` lists the feature and the footer; `docs/state-management.md` names the component-owned cache scope | Read of both docs after task 2.2 (code review) | static check |

Note: static-check rows have no automated test by design. Each is a command or a read in the
task list, and `code-review` confirms it on the diff.
