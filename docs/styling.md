# Styling

Read before writing or changing any component styles.

- **Tailwind** for layout, spacing, typography, and simple colors (`flex`, `grid`, `gap-4`, `text-muted`).
- **CSS Modules** (`Component.module.css`, colocated) for anything custom: hover/transition effects, pseudo-elements, complex selectors, component variants.
- Both read the same design tokens defined in `src/app/globals.css` — Tailwind via `@theme` (`bg-surface`, `text-accent`), CSS Modules via `var(--color-surface)`. Add new colors as tokens there; don't hard-code hex values in components.
- Combining both on one element is fine: `className={\`${styles.card} flex gap-3 p-6\`}`.
- Do not use `@apply` in CSS Modules; use plain CSS.
