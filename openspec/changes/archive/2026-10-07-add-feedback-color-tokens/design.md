# Design

## Context

`docs/design-system.md` (commit `7176572`) lists six tokens:
- `background`, `foreground`, `surface`, `border` — neutrals;
- `muted` — secondary text;
- `accent` — links, the primary button, focus, and, today, errors.

It has no `danger` or `success` role. Feedback is rendered three ways:

| Where | Today |
| --- | --- |
| `AuthField` error | `<p class="text-sm font-medium text-accent">`; input `aria-invalid:border-accent` |
| `SignInForm` / `SignUpForm` form error | `<p role="alert" class="rounded-md bg-surface px-3 py-2 text-sm font-medium">` |
| `PoemList` load error | `<p role="alert">Could not load poems.</p>` (no styling) |
| `AuthStatus` sign-out failure | `<p role="alert" class="font-medium text-accent">` (inline, in the header) |
| `SignUpForm` check-email | `<div role="status">` with an `h2` and muted text; no tone |

Styling rules: Tailwind v4 utilities for layout and simple colours, CSS Modules for custom
effects. Both read the CSS variables in `src/app/globals.css` through `@theme inline`
(`docs/styling.md`).

## Goals / Non-Goals

**Goals:**
- add `danger` and `success`, meeting WCAG AA in both themes;
- give every error and success message one consistent look;
- keep texts, roles, ARIA, and behaviour unchanged.

**Non-Goals:**
- the other design-system discrepancies (inputs, links, headings, radius, loading, offline);
- `warning` or `info` tones;
- icons;
- dismissible alerts or toasts.

## Decisions

### D1 — Token values, chosen for contrast

`globals.css` gains `--danger` and `--success` in `:root` and in the
`prefers-color-scheme: dark` block, mapped in `@theme inline` as `--color-danger` and
`--color-success`.

| Token | Light | Dark | Source |
| --- | --- | --- | --- |
| `danger` | `#dc2626` (red-600) | `#f87171` (red-400) | Tailwind palette (user decision 2026-10-07) |
| `success` | `#15803d` (green-700) | `#4ade80` (green-400) | Tailwind palette; green-700, not green-600, in light |

Measured contrast (WCAG 2.1 relative luminance):

| Pair | Light | Dark | Needed |
| --- | --- | --- | --- |
| danger text on `background` | 4.83 | 7.16 | 4.5 |
| success text on `background` | 5.02 | 11.36 | 4.5 |
| danger on `surface` (border only) | 4.39 | 6.40 | 3.0 (non-text) |
| success on `surface` (border only) | 4.56 | 10.17 | 3.0 (non-text) |
| `foreground` on `surface` (alert body) | 16.31 | 15.13 | 4.5 |

Two consequences:
- **Light success is green-700.** The user's first pick, green-600 (`#16a34a`), measures
  3.30:1 on white and fails AA for text.
- **Danger text never goes on `surface`.** At 4.39:1 in the light theme it fails as text. In
  an alert, `danger` colours only the border, and the body stays `foreground` (D3).

*Alternative:* ship green-600 and use success only for borders and icons. Rejected: the
success heading should be allowed to carry the tone later without a contrast bug.

### D2 — A shared `Alert` primitive in `src/shared/ui`

`src/shared/ui/Alert/Alert.tsx`, exported from `src/shared/ui/index.ts` next to `Button`:

```tsx
type AlertTone = "danger" | "success";

interface AlertProps {
  tone: AlertTone;
  children: ReactNode;
  className?: string;
}
```

- `danger` renders `role="alert"`, so it is announced immediately, as the current error
  paragraphs are. `success` renders `role="status"`, a polite announcement, as the current
  check-email `div` is.
- The tone-to-class mapping is a constant map (no magic strings in JSX):

  ```ts
  const TONE_BORDER = {
    danger: "border-danger",
    success: "border-success",
  } as const;
  ```

- No `"use client"`, no hooks. It renders from Server and Client Components alike.

**Why `shared/ui` now:** two features need it (auth forms and `PoemList` in poems). That meets
the `docs/architecture.md` rule ("don't create a `shared/` abstraction until a second
feature actually needs it").

*Alternative:* a CSS Module class per feature. Rejected: it duplicates the look across
features, which is the discrepancy this change exists to remove.

### D3 — Alert look: tone border, neutral body

Classes: `rounded-md border-l-4 bg-surface px-3 py-2 text-sm font-medium text-foreground`
plus the tone border.

- The left border carries the tone (non-text contrast of at least 3:1 against `surface`, D1).
- The body text stays `foreground`, at about 16:1, so the message is readable in both themes
  regardless of tone.
- It keeps today's form-alert shape (`rounded-md bg-surface px-3 py-2 text-sm font-medium`),
  so the layout doesn't shift. The tone border is the only visual addition.
- The `className` prop is for layout utilities only (the check-email state needs
  `flex flex-col gap-2`). Classes are joined by plain concatenation, as in `Button`, so a
  caller passing `border-*` or `text-*` could conflict with the tone. That is a usage rule,
  not something the code enforces; a class-merge library isn't worth adding for one caller
  (Gate 1 P2).

*Alternative:* a tinted background (`bg-danger/10`) with `danger` text. Rejected: `danger` text
on a light tint lands near or below 4.5:1, the same failure as on `surface`.

### D4 — Inline feedback stays inline

- **`AuthField` errors** stay a small paragraph under the input: the class becomes
  `text-danger`, and the input's invalid border becomes `aria-invalid:border-danger`. An invalid
  field stays `danger` while focused (`aria-invalid:focus:border-danger`, so the result doesn't
  depend on CSS rule order); a valid field keeps `focus:border-accent`.
- **`AuthStatus` sign-out failure** stays an inline `role="alert"` paragraph in the header,
  coloured `text-danger`. A boxed `Alert` would break the header row. Both sit on
  `background`, where `danger` text passes (D1).

### D5 — Where each message moves

| Message | After |
| --- | --- |
| `SignInForm` / `SignUpForm` form error | `<Alert tone="danger">{formError}</Alert>` |
| `PoemList` load error | `<Alert tone="danger">Could not load poems.</Alert>` |
| `SignUpForm` check-email | `<Alert tone="success" className="flex flex-col gap-2">` wrapping the existing `h2` and paragraph; the paragraph drops `text-muted` and inherits the Alert's `foreground` (`muted` on `surface` is about 4.4:1 in light, below AA) |
| `AuthField` error, `AuthStatus` sign-out failure | inline, `text-danger` (D4) |

The texts, the `role` values, and the `aria-describedby`/`aria-invalid` wiring are unchanged
(NFR-3).

### D6 — `docs/design-system.md` refreshed last

Per `CLAUDE.md` ("Design-system updates … re-run `design-system` to refresh
`docs/design-system.md` from the code"), the document is regenerated by the `design-system`
skill in extract-from-code mode **after** the code is in. It is never hand-edited ahead of the
code. The `Source` line keeps `non-machine — skipped connecting a tool`. The `Commit` line becomes the
short hash of HEAD when the skill runs: the last implementation commit, before the docs commit
(a commit can't record its own hash).

## Risks / Trade-offs

- **Visual change across auth screens.** Errors stop being violet. That is intended, but it is
  visible on every form. Gate 3 checks the forms in both themes.
- **Tests asserting classes.** Component tests that check `text-accent` on errors (if any)
  change to `text-danger`. Behavioural assertions (texts, roles, ARIA) must stay untouched
  (NFR-3).
- **Dark theme only by system preference.** There is no in-app toggle; Gate 3 needs the
  browser's colour scheme switched to verify the dark values.

## Migration Plan

Additive tokens and a new primitive; no data or route changes. Rollback: revert the change's
merge commit.
