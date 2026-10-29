# Tasks

Order: group 1 is the database. Group 2 is the server side (DAL and action) with no visuals.
Group 3 adds the shared building blocks with no visible change (the contact dialog and the created
notice keep their behaviour). Group 4 adds the screens and waits for the approved Claude Design
link (`docs/claude-design.md`). Group 5 is docs and verification. Each group exports only what it
already consumes (tests count as consumers for knip), so `npm run knip` stays green per group PR.

## 1. Delete operation in the database <!-- judgement-heavy -->

- [ ] 1.1 (NFR-1, FR-3, FR-4) Add `supabase/migrations/<ts>_delete_my_poem.sql` with
  `public.delete_my_poem(poem_id uuid)` (design D2): `security definer`, `set search_path = ''`,
  owner from `auth.uid()` and `my_author_profile_id()`, returns `deleted` with `author_id` and
  `illustration_path`, or `not-found`; execute for `authenticated` only; no delete grant or policy
  on `poems`; the down migration in the header.
- [ ] 1.2 (FR-9) In the same migration (design D2): `poem_creations` (RLS on, no policies, no
  client grants), the `after insert on poems` trigger that logs each creation and prunes the
  author's rows past the window, the backfill from existing poems, and `poem_create_status`
  counting `poem_creations`.
- [ ] 1.3 (NFR-1, FR-9) Extend `supabase/tests/poems.test.sql` (design D9): direct `delete from poems`
  changes nothing for any role; anon can't execute `delete_my_poem`; the owner gets `deleted`
  with `author_id` and `illustration_path` and the row is gone; another author and an unknown id
  get `not-found` and the other author's row stays; a Storage delete in another author's folder
  removes nothing; 100 creations then 10 deletes → `create_my_poem` and `can_create_poem` answer
  `over-limit` (implements FR-9 of delete-poem); a creation older than 30 days stops counting and
  is pruned; no client role reads or writes `poem_creations`; the existing limit tests stay green.
  - Verify: `npx supabase db reset` and `npx supabase test db` pass.

## 2. Delete DAL and action (no visible change) <!-- judgement-heavy -->

- [ ] 2.1 (NFR-5) Move `describeError`, `logFailure`, `toServiceFailure`, and `withStatus` from
  `poem-writes.ts` to `dal/write-log.ts`, `removeIllustrationBestEffort` to
  `dal/illustration-cleanup.ts`, and `expirePoemsTag` from `create-poem.actions.ts` to the
  server-only `actions/expire-poems-tag.ts` (design D1).
  - Verify: the existing `poem-writes` and create-action tests pass unchanged.
- [ ] 2.2 (FR-3, FR-4) Add `DELETE_POEM_STATUS`, `DeletePoemResult`, `DeleteOwnPoemResult`, and
  `model/delete-poem.schema.ts`: the input schema checks only that `poemId` is a string; the
  lowercase-hex UUID guard is a separate function the action runs first, so a malformed id answers
  `not-found`, never `validationErrors` (design D1, D3; Gate 2b).
  - Verify with `tests/delete-poem.schema.test.ts`.
- [ ] 2.3 (FR-3, FR-4, FR-6, NFR-5) Add `dal/poem-delete.ts`: `deleteOwnPoem(poemId)` (RPC, Zod parse
  of the answer, `classifySupabaseError` with the response status) (design D3).
  - Verify with `tests/poem-delete.test.ts`: each status; a rejected JWT → `unauthenticated`; a 5xx
    → `unavailable`; an unexpected shape → `unknown`; log lines carry no title, id, or path
    (implements NFR-5 of delete-poem).
- [ ] 2.4 (FR-3, FR-4, FR-5, FR-6, FR-7, FR-8) Add `actions/delete-poem.actions.ts`: `deletePoemAction` in design D3's
  order: UUID guard, session, RPC, `updateTag(poemsTag(authorId))` only on `deleted`, then the
  best-effort file removal.
  - Verify with `tests/delete-poem.actions.test.ts`: a malformed id reaches no I/O and answers
    `{ status: "not-found" }`; signed-out →
    `unauthenticated`; a refreshed session (the proxy already renewed the access token) runs the delete as
    usual (FR-7); unknown session → `unavailable`; `not-found` and failures expire no tag
    (FR-8); `deleted` expires exactly the returned author's tag, before the file removal; a file
    removal failure still returns `deleted`; a tag expiry failure is logged and still returns
    `deleted`.

## 3. Shared building blocks (no visible change) <!-- judgement-heavy -->

- [ ] 3.1 (FR-3, FR-4, FR-6) Add `src/shared/lib/one-time-notice/use-one-time-value.ts` with
  `CreatedPoemNotice`'s snapshot / clear / `Activity`-dismiss logic, and move `CreatedPoemNotice`
  onto it (design D5).
  Its effect also reads the store on every run, so a route revealed from `Activity` picks up a
  new value (Gate 1 P1).
  - Verify with `src/shared/lib/one-time-notice/tests/use-one-time-value.test.tsx` (snapshot,
    cleared store, Strict Mode re-run, hide-then-show, hide → new value → show shows it) and `CreatedPoemNotice`'s existing tests
    unchanged and green.
- [ ] 3.2 (FR-6) Add `session-expired-notice.store.ts` in the same folder (design D6).
  - Verify with its unit test (mark, clear).
- [ ] 3.3 (FR-2, FR-3) `Dialog`: add `closable` (default `true`): `false` disables the corner button,
  ignores the backdrop, prevents Escape's `cancel`, and re-opens the dialog at once if it closes
  anyway (design D7).
  - Verify with `src/shared/ui/tests/Dialog.test.tsx` (new cases) and the contact dialog's tests
    unchanged.
- [ ] 3.4 (NFR-6) `Button`: add `variant="danger"` (solid `danger` fill, `on-danger` text); add the
  `--on-danger` token to `globals.css` in light and dark with its theme mapping (design D7,
  artboard 22).
  - Verify with `Button.test.tsx` and the token literal search.
- [ ] 3.5 (FR-6, NFR-6) `Alert`: add `tone="neutral"` (`muted` left border, `role="status"`)
  (design D7, artboard 24).
  - Verify with `Alert.test.tsx`.

## 4. Delete button, notices, and the sign-in notice (UI — waits for the approved mockups) <!-- judgement-heavy -->

- [ ] 4.1 (FR-1 – FR-6, NFR-4, NFR-7) Add `DeletePoemButton` and render it below `PoemArticle` in
  `OwnPoemContent`; copy in `poem-management-messages.ts`; `deleted-poem-notice-ui.store.ts`
  (design D4, D5).
  - Verify with `tests/DeletePoemButton.test.tsx`: opens with focus on «Отмена»; each cancel path
    sends nothing and returns focus; «Удаление…» and disabled controls while pending, Escape
    ignored; a double click sends once; `deleted` → store `{deleted, title}` and
    `router.replace("/account/poems")`; `not-found` → `{already-deleted}` and the same target;
    `unauthenticated` → session-expired flag, `router.replace("/login")`, then `router.refresh()`;
 other failures,
    `serverError`, and `validationErrors` → the alert in the dialog with focus on «Удалить»; the
    alert hides when the next confirm starts (implements FR-1 – FR-6 of delete-poem); and
    `OwnPoemContent.test.tsx` (button only when the poem renders).
- [ ] 4.2 (FR-3, FR-4, NFR-2, NFR-4) Add `DeletedPoemNotice` and render it in `MyPoemsPage`
  between the heading and the Suspense boundary (design D5).
  - Verify with `tests/DeletedPoemNotice.test.tsx`: both texts verbatim, `role="status"`, shown
    once, nothing for an empty store.
- [ ] 4.3 (FR-6) Add `auth`'s `SessionExpiredNotice` and render it in `SignInPanel` above the
  Suspense boundary (design D6).
  - Verify with `src/features/auth/tests/SessionExpiredNotice.test.tsx`: text verbatim,
    `role="status"`, once; nothing on a plain visit.
- [ ] 4.4 (NFR-2, NFR-3, NFR-6) Static checks: `"use client"` only in the listed modules; no import
  of `@/features/poem-management` from `poems`, `authors`, or `auth`; no colour literals.

## 5. Docs and verification <!-- judgement-heavy -->

- [ ] 5.1 (NFR-3) `docs/architecture.md`: the delete action and DAL in poem-management's line,
  `shared/lib/one-time-notice/`, `Dialog`'s `closable`, `Button`'s danger variant; then re-run
  `design-system` to refresh `docs/design-system.md` from the code (`--on-danger`, the `danger`
  button, the neutral `Alert` tone).
- [ ] 5.2 (NFR-2) `docs/state-management.md`: the shared session-expired store as the one
  exception to "stores live in features", and the deleted notice store.
- [ ] 5.3 (FR-9) Write ADR 0010 "row-creating limits count creations, not live rows" in
  `docs/decisions/`, amending ADR 0009; add "Amended by 0010" to ADR 0009's status line.
- [ ] 5.4 (NFR-1, FR-9) Add `npx supabase db push` for `delete_my_poem` to `docs/environment.md`'s deploy
  checklist.
- [ ] 5.5 (FR-1 – FR-8) Gate 3 (web-qa): delete with and without an illustration, every cancel
  path, failure with the database stopped, already deleted in a second tab, expired session (and
  the header right after it), freshness on the public author page and the poem URL, the
  list → poem → delete path showing the notice, no 404 flash before the navigation, Escape twice
  while pending (design D9); record the happy path as a scenario under
  `tests/web-qa-scenarios`.
- [ ] 5.6 (NFR-2, NFR-3, NFR-6) Run `npm run typecheck && npm run lint && npm run test:coverage && npm run build && npm run knip`
  and confirm the build's route list keeps every render-mode marker.
