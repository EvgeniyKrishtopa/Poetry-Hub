# Tasks

Order: group 1 is the database. Group 2 is the server side (DAL and action) with no visuals.
Group 3 splits the add form into shared parts with no visible change. Group 4 adds the
offline and leave-guard building blocks, with no visible change until a form uses them. Groups 5
and 6 add the screens and wait for the approved Claude Design link (`docs/claude-design.md`).
Group 7 is docs and verification. Each group exports only what it already consumes (tests count as
consumers for knip), so `npm run knip` stays green per group PR.

## 1. Update operation and edit limit in the database <!-- judgement-heavy -->

- [ ] 1.1 (NFR-1, FR-4, FR-6, FR-10) Add `supabase/migrations/<ts>_update_my_poem.sql` with
  `public.update_my_poem(poem_id, title, text, genre_id, keep_illustration, illustration_path)`
  (design D2): `security definer`, `set search_path = ''`, owner and public profile from the
  session, old path read `for update`, only title/text/genre/illustration set, returns `updated`
  with `author_id` and `replaced_path`, or `not-found`; execute for `authenticated` only; no update
  grant or policy on `poems`; the down migration in the header.
- [ ] 1.2 (FR-7) In the same migration: widen `write_rate_limits.scope`'s check with `poem_edit` and
  replace `consume_write_allowance` with `('poem_edit', 10, interval '1 minute')` added to its
  limits (design D2).
- [ ] 1.3 (NFR-1, FR-7) Extend `supabase/tests/poems.test.sql` and
  `supabase/tests/write_rate_limits.test.sql` (design D13): direct `update poems` changes nothing for
  any role; anon can't execute `update_my_poem`; the owner's call changes the four fields and keeps
  `id`, `author_id`, `created_at`; keep / remove / replace of the illustration and `replaced_path`;
  a path in another author's folder is rejected; another author, an unknown id, and a non-public
  own profile get `not-found` with nothing changed; `poem_edit` allows 10 per minute and blocks the
  11th; the other scopes' tests stay green.
  - Verify: `npx supabase db reset` and `npx supabase test db` pass.

## 2. Update DAL and action (no visible change) <!-- judgement-heavy -->

- [ ] 2.1 (FR-5, FR-6) `model/`: `UPDATE_POEM_STATUS`, `ILLUSTRATION_CHANGE`, `UpdatePoemResult`,
  `UpdateOwnPoemResult`, `updatePoemInputSchema` (types only), export `normalizeTitle` and
  `normalizeText` from `poem-form.schema.ts`; move `checkGenre` / `checkIllustration` out of
  `create-poem.actions.ts` into a server-only module both actions use; export `uploadIllustration`
  from `poem-writes.ts` (design D1, D3).
  - Verify: the create action's and `poem-writes`' existing tests pass unchanged.
- [ ] 2.2 (FR-7) Add `dal/poem-edit-allowance.ts`: `consumePoemEditAllowance()` (design D3).
  - Verify with `tests/poem-edit-allowance.test.ts`: allowed, over the limit → `too-many-saves`, a
    5xx → `unavailable`, a rejected JWT → `unauthenticated`, a non-boolean → `unknown`.
- [ ] 2.3 (FR-4, FR-6, FR-10, NFR-5) Add `dal/poem-update.ts`: `updateOwnPoem(input)` — upload on
  `replace`, RPC, Zod parse, the author check, removal of the new upload when the row wasn't
  written, classification with the response status (design D3).
  - Verify with `tests/poem-update.test.ts`: each status; `keep` and `remove` upload nothing; an
    upload failure calls no RPC; the upload is removed on `not-found` and on an RPC failure; error
    classes; log lines carry no title, text, id, or path (implements NFR-5 of edit-poem).
- [ ] 2.4 (FR-4 – FR-10, FR-14) Add `actions/update-poem.actions.ts`: `updatePoemAction` in design D3's
  order.
  - Verify with `tests/update-poem.actions.test.ts`: a malformed id reaches no I/O and answers
    `not-found`; invalid fields and `replace` without a file → `invalid`, nothing counted; signed-out
    → `unauthenticated`; unknown session → `unavailable`; over the limit → `too-many-saves` with no
    upload, Contentful call, or file read; own-profile read failure → `failed`; not public →
    `failed: not-public`; genres unavailable → `failed: unavailable`; a removed genre → `invalid` on
    `genreId`; a bad file → `invalid` on `illustration`; an upload failure → `failed` with no tag
    expired; `not-found` or a failed update expires nothing; `updated` expires exactly the author's
    tag, then removes `replaced_path`; a removal or tag failure still answers `saved`.

## 3. Shared form parts (no visible change) <!-- judgement-heavy -->

- [ ] 3.1 (NFR-3) Split `NewPoemForm` into `PoemForm/use-poem-form.ts` and
  `PoemForm/PoemFormFields.tsx`; move `GenreSelect` and `IllustrationField` into `PoemForm/`;
  `NewPoemForm` composes them with its own create call and outcomes; rename `NewPoemSkeleton` to
  `PoemFormSkeleton` (design D4).
  - Verify: `NewPoemForm`'s, `GenreSelect`'s, and `IllustrationField`'s existing tests pass with
    import paths changed only.
- [ ] 3.2 (FR-3) Add `model/poem-form-values.ts`: `PoemFormValues`, `IllustrationState`,
  `isPoemFormChanged` (design D5); `usePoemForm` exposes `isChanged` and `reset()`.
  - Verify with `tests/poem-form-values.test.ts`: each field; trimming-only edits unchanged; an
    edit undone unchanged; `stored → none`, `stored → new`, `none → new` changed; a rejected pick
    unchanged.
- [ ] 3.3 (FR-4) `IllustrationField`: the stored preview, the picker label by state, the remove
  label as a prop (design D6). The add form passes its current labels.
  - Verify with `IllustrationField.test.tsx` (new cases) and the add form's tests unchanged.

## 4. Connection-status and leave-guard building blocks (no visible change until group 5 activates the guard; 4.3 changes «Выйти» only then) <!-- judgement-heavy -->

- [ ] 4.1 (FR-11) Add `src/shared/lib/network/use-connection-status.ts` (`online | slow | offline`),
  `network.constants.ts` (`SLOW_EFFECTIVE_TYPES`, `SLOW_RTT_MS`), and `src/shared/ui/ConnectionNotice/`
  (design D8).
  - Verify with `src/shared/lib/network/tests/use-connection-status.test.ts` (initial value;
    `offline` / `online` events; `effectiveType` «2g» and «slow-2g» → `slow`, «4g» → `online`;
    `rtt` 1001 → `slow`, 1000 → `online`; the `change` event; no `navigator.connection` → never
    `slow`; offline wins over slow; server snapshot `online`) and
    `src/shared/ui/tests/ConnectionNotice.test.tsx` (both texts verbatim, `role="status"`, nothing
    while online).
- [ ] 4.2 (FR-13) Add `src/features/poem-management/components/EditPoemForm/use-leave-guard.ts`
  (design D1, D10).
  - Verify with `src/features/poem-management/tests/use-leave-guard.test.tsx`: a click on a disallowed
    same-origin link is prevented and calls `onBlocked`; an allowed path, a modifier click, a middle
    click, `target="_blank"`, `download`, and an external link pass; `beforeunload` is prevented
    while active; both listeners are gone when inactive and on unmount.

- [ ] 4.3 (FR-13) `src/shared/lib/leave-guard/leave-block.store.ts` exists from the scaffold, complete; `useLeaveGuard` registers
  and clears its `onBlocked` there; `SignOutButton` calls the registered block instead of the
  sign-out when one is set (design D10).
  - Verify with the store's unit test, new `use-leave-guard` cases (registered while active, cleared
    when inactive and on unmount), and `SignOutButton.test.tsx` (blocked: no action call, block
    called; unblocked: unchanged behaviour) (implements FR-13 of edit-poem for sign-out).

## 5. Edit page, form, button, and notices (UI — waits for the approved mockups) <!-- judgement-heavy -->

- [ ] 5.1 (FR-1, FR-2, FR-15, NFR-8) Add the route
  `src/app/(authorized)/account/poems/[poemId]/edit/page.tsx`, its breadcrumb slot page,
  `EditPoemPage`, `EditPoemContent`, `EditPoemButton` (rendered with `DeletePoemButton` in one row in
  `OwnPoemContent`), `editPoemPath`, `EDIT_SEGMENT`, the trail label, and the `own-poem-edit` match
  in `breadcrumbs` (design D6, D12).
  - Verify with `tests/EditPoemContent.test.tsx` (filled values, genre fallback to «—» and
    «Без жанра», 404, error throw, genres alert, session unknown), `OwnPoemContent.test.tsx` (both
    buttons only when the poem renders), and `breadcrumbs`' `match-route` / trail tests (implements
    FR-15 of edit-poem).
- [ ] 5.2 (FR-3 – FR-12, NFR-4, NFR-7) Add `EditPoemForm` and its `use-save-poem.ts` (design D4,
  D5, D7, D8) and the
  `{ poemId, kind }` created-or-saved store with `CreatedPoemNotice` showing both texts.
  - Verify with `tests/EditPoemForm.test.tsx`: link vs save and discard buttons by `isChanged`;
    «Отменить изменения» restores every field and the stored preview, clears errors, sends nothing,
    and focuses the back link; sending state and a
    double click sending once; `saved` → store and `router.push(ownPoemPath)`; `invalid` → field
    errors and focus; `not-found` → deleted-notice store and `router.replace("/account/poems")`;
    `unauthenticated` → session-expired flag, `router.replace("/login")`, `router.refresh()`;
    other failures → alert above the form with focus, values kept, button enabled, no second call;
    rejected call while offline → offline notice, no alert; offline and slow disable the button and keep
    fields editable (implements FR-3, FR-6 – FR-11 of edit-poem); and `CreatedPoemNotice.test.tsx`
    (both texts, once).
- [ ] 5.3 (FR-13, NFR-4) Add `LeaveBlockedDialog` and wire `useLeaveGuard` into `EditPoemForm`
  (active while changed and while a save is sending, off after a `saved` result; allowed: this poem's page and edit page) (design D10).
  - Verify with `tests/LeaveBlockedDialog.test.tsx` (copy, focus in and back) and `EditPoemForm`
    cases: guard off while unchanged, on while changed, still on while sending, off after `saved` before the navigation (implements FR-13 of
    edit-poem).

## 6. Connection state on the add form and the profile editor (UI — waits for the approved mockups) <!-- judgement-heavy -->

- [ ] 6.1 (FR-11) `NewPoemForm`: the connection notice above the form, «Добавить произведение»
  disabled while offline or slow, a rejected call while the latest connection status is `offline`
  shows the notice, read from the hook through a ref (design D8).
  - Verify with `NewPoemForm.test.tsx` (new cases; existing ones unchanged).
- [ ] 6.2 (FR-11) Profile editor: `ConnectionNotice` in `AuthorProfileEditor`, `FieldEditActions`'
  «Сохранить» and `FieldActions`' «Удалить» disabled while offline or slow (design D8).
  - Verify with `AuthorProfileEditor`, `FieldEditActions`, and `FieldActions` tests (new cases; existing unchanged).
- [ ] 6.3 (NFR-2, NFR-3, NFR-6) Static checks: `"use client"` only in the listed modules; no
  `navigator.onLine` or `navigator.connection` outside `src/shared/` and no `beforeunload` outside the edit form's leave guard; no colour literals; both forms use
  `usePoemForm` and `PoemFormFields`.

## 7. Docs and verification <!-- isolated -->

- [ ] 7.1 (NFR-3) `docs/architecture.md`: the edit route, action, and DAL in poem-management's line,
  `PoemForm/`, `EditPoemForm/use-leave-guard.ts`, `shared/lib/network/`, `ConnectionNotice`; refresh
  `docs/design-system.md` for any new primitive or token the mockups add.
- [ ] 7.2 (NFR-2) `docs/state-management.md`: the created-or-saved store's `kind`; the shared
  leave-block store (a callback, no data); the edit draft lives in the route's `Activity` state, not
  a store.
- [ ] 7.3 (FR-7) ADR 0007: add `poem_edit` to its scope list (status-line note).
- [ ] 7.4 (NFR-1) Add `npx supabase db push` for `update_my_poem` to `docs/environment.md`'s deploy
  checklist.
- [ ] 7.5 (FR-1 – FR-15) Gate 3 (web-qa): the flows in design D13; record the happy path as a
  scenario under `tests/web-qa-scenarios` with a restore step.
- [ ] 7.6 (NFR-8) Run `npm run typecheck && npm run lint && npm run test:coverage && npm run build && npm run knip`
  and confirm the build's route list adds `/account/poems/[poemId]/edit` with the management
  routes' marker and keeps every other marker.
