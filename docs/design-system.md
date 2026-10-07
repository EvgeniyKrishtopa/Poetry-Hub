# Design system

Extracted from the code as it is. Values come from `src/app/globals.css`, `src/shared/ui`, and
the feature components. Where the code has no named value, this document says so instead of
inventing one. Read this before planning UI (`ui-plan`) or writing component styles
(`docs/styling.md` covers *how* to style; this covers *with what*).

## 1. Basis

Own primitives, no ready-made component library. Styling is Tailwind CSS v4 utilities plus
CSS Modules for custom effects. Both read the same CSS variables defined in
`src/app/globals.css`, which has a light and a dark (`prefers-color-scheme: dark`) set. The
only shared primitive so far is `Button` in `src/shared/ui`.

## 2. Design tokens

| Role | Value (light / dark) | Name in code |
| --- | --- | --- |
| primary | `#7c3aed` / `#a78bfa`, text on it `#ffffff` / `#0a0a0a` | `--accent` → Tailwind `accent` (`bg-accent`, `text-accent`); `--accent-foreground` → `accent-foreground` |
| danger | none: errors currently reuse `accent` | no name yet |
| success | none | no name yet |
| muted | `#71717a` / `#a1a1aa` | `--muted` → Tailwind `muted` (`text-muted`) |
| spacing step | Tailwind's default scale (0.25rem per step); no project step defined. Most used: page `px-6 py-16`, stacks `gap-4`, controls `px-3 py-2` | no name yet |
| text-size step | Tailwind's default scale; no project step defined. Used: `text-sm`, `text-lg`, `text-xl`, `text-2xl`, `text-4xl` | no name yet |

Other tokens in the code, outside the four roles:

| Token | Value (light / dark) | Name in code |
| --- | --- | --- |
| background | `#ffffff` / `#0a0a0a` | `--background` → `background` |
| foreground | `#171717` / `#ededed` | `--foreground` → `foreground` |
| surface | `#f4f4f5` / `#18181b` | `--surface` → `surface` |
| border | `#e4e4e7` / `#27272a` | `--border` → `border` |
| fonts | Geist Sans / Geist Mono | `--font-sans`, `--font-mono` |

No radius or shadow tokens exist. Radii are written per component (see section 3).

## 3. UI primitives

| Name | What it is | Where it lives |
| --- | --- | --- |
| `Button` | Pill button (`border-radius: 9999px`), variants `primary` (accent fill) and `ghost` (transparent, surface on hover); disabled at 50% opacity; press scale 0.97 | `src/shared/ui/Button/Button.tsx` + `Button.module.css` |
| `AuthField` | Labelled input with error text wired through `aria-invalid` / `aria-describedby`; `rounded-md`, `px-3 py-2`, accent border on focus and on error | `src/features/auth/components/AuthField/AuthField.tsx` (feature-local, not shared) |
| `PoemCard` | Card: `border-radius: 1rem`, surface background, accent border and glow on hover; quoted excerpt with an accent left rule | `src/features/poems/components/PoemCard/` (feature-local) |

## 4. States

| State | Name in this project | What it looks like |
| --- | --- | --- |
| loading | `Loading` (`src/app/loading.tsx`, route level) | skeleton blocks (`bg-surface animate-pulse`, off under reduced motion) plus a screen-reader-only "Loading…" status. Inside components there is no shared pattern; see the discrepancies |
| error | `RootError` (`src/app/error.tsx`, route level) | heading "Something went wrong", muted explanation, optional error digest in mono, and a "Try again" `Button`. Inside components, a `role="alert"` paragraph |
| empty | no named component | muted text, e.g. "No poems match your search." in `PoemList` |
| offline | none | not handled |

Related route state: `NotFound` (`src/app/not-found.tsx`) shows the heading "Page not found",
muted text, and an accent link back home.

## 5. Source

- Source: non-machine — skipped connecting a tool
- Commit: `7176572`
