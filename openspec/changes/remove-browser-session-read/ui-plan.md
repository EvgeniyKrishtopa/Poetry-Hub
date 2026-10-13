# UI Plan

Source: `docs/design-system.md` (Commit `724dc3f`). No mockup link: the user skipped the Claude
Design brief for this change (proposal, Mockups), so every value is "described".

| Screen | States | Components | Value source |
| --- | --- | --- | --- |
| Root layout header (every page that uses the root layout) | `loading`: the Suspense fallback, an empty `min-w-24` placeholder (the same placeholder the doc's `loading` row already names for the header); signed out: "Sign in" link; signed in: "Sign out" button; `error`: the inline `text-danger` sign-out failure (the doc's `error` row already names it). No `empty`, no `offline` | Existing `Button` (`ghost`) for "Sign out"; the existing `next/link` "Sign in" with `text-sm font-medium text-accent` (`primary` role's `accent` token); one new component, `SignOutButton` (feature-local), because the sign-out failure needs client state while `AuthStatus` stays a presentational Server Component | described |

## Acceptance criteria covered

- FR-1 (signed-out header), FR-2 (signed-in header, no email), FR-3 (fallback with neither link),
  FR-4 (sign-out success and failure): all on the header row.

The other criteria (FR-3's check results, FR-5 to FR-7, NFR-1 to NFR-3) have no human-visible
outcome on a screen. No gap.
