# Tasks

Order: group 1 makes the membership read shareable (memoized per request, exported) with no visible
change. Group 2 filters the plain list on `/account/poems` and wires the route. Group 3 is the
integration check. No new screen, element, or copy, so no Claude Design brief (proposal, Mockups).
Each group exports only what it already consumes (tests count as consumers for knip), so
`npm run knip` stays green per group PR, and each group lands its own tests and docs.

## 1. One shared membership read (no visible change) <!-- isolated -->

- [x] 1.1 (NFR-2) Wrap `listCollectedPoems` in `collection-management/dal/collection-poems.ts` in
  React's `cache` (design D2); `listOwnCollectionsWithPoems` keeps calling it unchanged.
  - Verify with `tests/dal/collection-poems.test.ts`: two calls in one request reach the RPC once
    (proves the wrapper; real dedupe is checked at runtime in 3.2), existing cases unchanged.
- [x] 1.2 (NFR-2) Docs: a one-line amendment note in ADR 0011 §3 (a page and its slot may share a
  memoized private read) and the matching line in `docs/state-management.md` (Gate 1 P2).

## 2. Free poems only on `/account/poems` <!-- judgement-heavy -->

- [ ] 2.1 (FR-1) `poem-management/model/free-poems.ts`: `selectFreePoems(poems, collected)` keeps
  poems whose id is not collected, order kept (design D3).
  - Verify with `tests/model/free-poems.test.ts`: free only, newest-first order kept, unknown
    collected ids ignored, every poem collected → empty.
- [ ] 2.2 (FR-1, FR-2, NFR-1) `MyPoemsPage` / `MyPoemsContent` take the required prop
  `readCollectedPoems` typed by `poem-management`'s own `CollectedPoemsRead`; `MyPoemsContent` reads
  it in parallel with `listAuthorPoems` after the public-profile check and renders the free poems,
  no list when empty, or the list alert when either read fails (design D1, D3).
  - Verify with `tests/components/MyPoemsContent.test.tsx` (and `MyPoemsPage`'s test where it
    renders the content): free poems only; all collected → no list and no text; membership read
    fails → «Не удалось загрузить произведения. Попробуйте позже.» and no poem link; poem read fails
    → same alert; buttons and slot present in every case; `readCollectedPoems` not called on the
    not-public or session-unknown branch.
- [ ] 2.3 (FR-1, NFR-1) Export `listCollectedPoems` from `collection-management/index.ts` and pass
  it from `src/app/(authorized)/account/poems/page.tsx` as `readCollectedPoems`.
  - Verify with both features' `tests/boundaries.test.ts`: still no import between
    `poem-management` and `collection-management`; `npm run typecheck` proves the route passes the
    prop and the result types fit.

## 3. Verification <!-- judgement-heavy -->

- [ ] 3.1 (FR-1 – FR-4, NFR-1, NFR-2) Gate 3 (web-qa) on `/account/poems`: free poems only; every
  poem collected → no list; delete a collection → its poems in the plain list, also after Back and
  Forward; save a collection's poems → the plain list follows (by link and by Back); each poem shown
  once. Record "delete a collection, its poems move to the plain list" as a scenario under
  `tests/web-qa-scenarios` with a cleanup step.
- [ ] 3.2 (NFR-2) In the dev server log or a temporary probe in the scratchpad, confirm one
  `my_collected_poems` call per `/account/poems` request; leave nothing in the repo.
- [ ] 3.3 (FR-1 – FR-4, NFR-1, NFR-2) Run `npm run typecheck && npm run lint && npm run test:coverage && npm run build && npm run
  knip`; confirm the build keeps `/account/poems`' rendering marker unchanged.
