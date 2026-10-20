# Previous trail reported on home after a client navigation

- Change: `add-breadcrumbs`
- Called from: `web-qa`
- First seen: 2026-10-20
- Limit in force: `maxFixAttempts: 2`

## Failure

Gate 3 (`web-qa-manual-tester`), flow 6: from `/authors`, clicking the trail's «Главная» (or home → «Наши авторы» → Back) lands on `/` with the home heading, "but the old trail «Главная › Наши авторы» stays under the header". A hard load of `/` showed no trail.

## Reproduce

- `@playwright/test` scenarios (role-based locators, which see only visible, accessible elements): no reproduction in any variant, twice each. Variants:
  - home → header «Наши авторы» → trail «Главная»;
  - Back;
  - `/authors` opened directly → «Главная»;
  - author page → «Наши авторы» → «Главная»;
  - `/login` → wordmark;
  - signed in: `/account/author` → «Мастерская поэта» → «Главная»;
  - after clearing cookies.

  Counts sampled immediately and up to 3 s later were always 0.
- Playwright MCP, same steps (`/authors` → trail «Главная»): `document.querySelectorAll('nav[aria-label="Навигационная цепочка"]').length` is 1 on `/`. This reproduces the tester's observation.

## Attempt 1 — 2026-10-20

- Isolated to: the leftover `nav` element on `/`. `checkVisibility()` is false and its box is 0×0. The element itself carries `style="display: none !important;"`.
- Hypothesis: not a defect. With Cache Components, Next 16 keeps the previous route's slot content mounted but hidden (React Activity) for back/forward state preservation, so the DOM still holds the old `nav` with `display: none`. It is not rendered and is outside the accessibility tree; the tester counted DOM nodes instead of visible ones.
- Expected effect: no code change; visible and accessible counts on `/` after a client navigation are 0, which the role-based scenarios already show.
- What actually happened: role-based counts were 0 in every variant; the only remaining `nav` is `display: none !important`, invisible, 0×0. The tester's own screenshot of the "stale" state shows home with no trail under the header.
- Verdict: matched. No fix applied.

## Outcome

- Not a defect: an artifact of the check. Next's route state preservation keeps the previous slot content hidden in the DOM; nothing is visible or announced.
- Spec case: skipped, because there is no defect in the app; FR-7 ("disappears when returning home") holds for what a reader sees and hears.
- Regression guard: `tests/web-qa-scenarios/breadcrumbs-home-hides-trail.spec.ts` asserts with role-based locators (visible, accessible) that home after a client navigation has no trail.
