# Tasks

Order: group 1 opens the database with the admin role and the restriction check in every writer and policy
(nothing in the app reads it yet). Group 2 adds the admin functions, the storage policies and the auth hook.
Group 3 is the admin feature's server side (DAL, model, Server Actions; no screen calls it yet). Group 4 teaches
the write features and sign-in/sign-up their new failure kinds. Group 5 is the `/admin` page and group 6 the delete
control on public pages; both are UI groups and wait for the approved Claude Design link
(`docs/claude-design.md`), non-UI groups may proceed. Group 7 is docs and the final verification. Each group exports
only what it already consumes (tests count as consumers for knip), so `npm run knip` stays green per group PR, and
each group lands its own tests.

## 1. Database: admin role and the restriction check <!-- judgement-heavy -->

- [ ] 1.1 (FR-13) List, by grep over `supabase/migrations/`, every `security definer` writer of user content and
  every direct-write path (the `author_profiles` update policy, the owner insert/delete policies on the
  `author-photos` and `poem-illustrations` buckets). Record the list in the migration header; it is the checklist
  for tasks 1.3 and 1.4.
- [ ] 1.2 (FR-1, NFR-1) New migration `supabase/migrations/<timestamp>_admin_moderation.sql`: `public.admins`,
  `public.account_restrictions` (cascade on the account), `public.banned_emails`, `public.moderation_log` (user ids
  without foreign keys) (RLS on, no policies, grants
  revoked from `anon` and `authenticated`); `is_admin()` (executable by `authenticated` only), `assert_admin()`, `is_restricted()`,
  `assert_not_restricted()` (raises SQLSTATE `AM001`; `is_restricted()` executable by `authenticated`, since the profile and
  Storage policies evaluate it as that role); header comment with the documented down migration. Check
  on the local stack how PostgREST reports `AM001` (HTTP status and `code`) and record it in the header.
- [ ] 1.3 (FR-13) The same migration: `perform public.assert_not_restricted()` as the first statement of every
  writer from task 1.1, and `can_create_poem()` (each re-created from its latest definition with its signature, result and limits
  unchanged; `consume_write_allowance` becomes `plpgsql` for this; `can_create_poem` stays `stable`).
- [ ] 1.4 (FR-13) The same migration: `and not public.is_restricted()` added to the `owners update their own
  profile` policy (`using` and `with check`) and to the owner insert and delete policies on the two buckets.
- [ ] 1.5 (FR-1, FR-13, NFR-1) pgTAP `supabase/tests/admin_foundation.test.sql`: `is_admin()` for a listed user and a
  non-admin, and refused for a signed-out caller; a client insert into `admins` is refused; the four tables are closed to `anon`
  and `authenticated`; a blocked user fails every writer in task 1.1's list, a direct profile update and a direct
  upload to each bucket; an unblocked user writes; public reads still work; and the `pg_proc` check: every volatile
  `security definer` function in `public` that `authenticated` can execute calls `assert_not_restricted` or is on an
  explicit allowlist; a blocked user creating a poem with an illustration is refused by `can_create_poem` before
  any upload.
- [ ] 1.6 (NFR-1) Run `supabase db reset` and the whole pgTAP suite: the existing files must pass unchanged.

## 2. Database: admin functions, storage policies, auth hook <!-- judgement-heavy -->

- [ ] 2.1 (FR-8, FR-9, NFR-1) Move the bodies of `delete_my_poem` and `delete_my_collection` into
  `delete_poem_of(profile, poem_id)` and `delete_collection_of(profile, collection_id)`, revoked from `public`,
  `anon` and `authenticated`, no admin assert inside; the owner functions call them with `my_author_profile_id()`
  and keep their signatures and results (design D7). The existing delete pgTAP tests must stay green unedited.
- [ ] 2.2 (FR-8, FR-9, FR-11, NFR-1) `admin_delete_poem` and `admin_delete_collection`: `assert_admin()`, resolve
  the row's `author_id` and that author's auth user id (stored as `target_user_id`), call the internal function (the collection's advisory lock is the target author's),
  append a log row only on `deleted`.
- [ ] 2.2a (FR-10, NFR-1) `may_moderate_author(author_profile_id)`: true only for an admin who is not the profile's
  owner; executable by `authenticated` only; pgTAP for admin on others' work, admin on own work, non-admin, signed out.
- [ ] 2.3 (FR-8) Storage: `for select` and `for delete` policies on `poem-illustrations`, `to authenticated`, using
  `public.is_admin()`;
  no SQL deletes from `storage.objects`.
- [ ] 2.4 (FR-3, NFR-1) `admin_list_users(page_size, after_created_at, after_id, email)`: forward keyset by
  `created_at, id`, joins `auth.users`, `author_profiles` and `account_restrictions`, exact-email filter (whole address, trimmed and lower-cased on both sides), returns
  only the columns the page shows plus an `is_admin` flag per row.
- [ ] 2.5 (FR-4, FR-5, FR-6, FR-7, FR-11) `admin_block_user`, `admin_unblock_user`, `admin_ban_user`,
  `admin_revoke_sessions`: `assert_admin()`, refuse own id and admin targets, `not-found`, idempotent answers (`no-sessions` for a revoke that ends nothing, with no log row),
  `banned_until` set to the named far-future constant and cleared, `auth.sessions` rows deleted, ban adds the email
  hash, one log row per change, one transaction.
- [ ] 2.6 (FR-17, NFR-1) `reject_banned_signup(event jsonb)`: `security definer`, empty `search_path`, execute for
  `supabase_auth_admin` only, whole body wrapped so any error or unrecognised input allows, one fixed rejection
  code; register it as the Before User Created hook in `supabase/config.toml` for the local stack.
- [ ] 2.7 (FR-1 – FR-11, FR-13, FR-17, NFR-1) pgTAP `supabase/tests/admin_functions.test.sql` covering every
  scenario of FR-3 – FR-9, FR-11 and FR-17 plus the no-op cases (no log row), a direct call as `anon` and as a
  non-admin to every `admin_*` function and to `delete_poem_of`, `delete_collection_of`, `reject_banned_signup`.
- [ ] 2.8 (FR-4, FR-6, FR-8) Local-stack and hosted-project check, recorded in the change's `_debug/` folder:
  blocking makes Auth refuse sign-in and refresh with the chosen `banned_until` value (and whether `infinity`
  works); deleting `auth.sessions` stops a refresh token; the `postgres` role may update `auth.users` and delete
  `auth.sessions` on the hosted project; an admin removes another author's illustration with their own session and a
  non-admin cannot; and the error shape (status, code, message) supabase-js actually receives when the sign-up hook
  rejects, which task 4.5 matches exactly.

## 3. Admin feature: DAL, model, actions (no UI) <!-- judgement-heavy -->

- [ ] 3.1 (NFR-4, NFR-2) Scaffold `src/features/admin/` (`actions`, `dal`, `model`, `components`, `tests`,
  `index.ts`) per the approved scaffold; `AdminPage` and `AdminDeleteControl` as the only public API; lint boundary entries so only
  `src/app/` imports `@/features/admin`, and `poems`/`collections` boundary tests assert they do not.
  `AdminDeleteControl` takes `kind`, `id`, `title` and `redirectHref` as props.
- [ ] 3.2 (FR-2, FR-12) `model/`: `admin.types.ts` (discriminated results), `admin.schema.ts` (uuid target), `admin.constants.ts` (named constants), `admin-messages.ts` (Russian copy).
- [ ] 3.3 (FR-2, FR-3, NFR-6) `dal/`: `admin-check.ts` (`is_admin()`, `unknown` on outage; reads the session through
  `@/features/auth`), `user-list.ts`, `moderation-rpc.ts` (block, unblock, ban, revoke), `delete-rpc.ts`,
  `illustration-cleanup.ts` (bucket constant from `@/features/poems`); errors classified by SQLSTATE, never logging
  email or text.
- [ ] 3.4 (FR-4 – FR-9, FR-12) Server Actions: block, unblock, ban, revoke sessions, delete poem (expires the
  author's works tag, removes the illustration best-effort), delete collection (expires the tag). Each validates on
  the server, re-reads the session, and returns a discriminated result.
- [ ] 3.5 (FR-2, FR-4 – FR-9, FR-12, NFR-6) Vitest for the DAL and actions (`features/admin/tests/`): validation
  failures call no RPC; every function answer maps to its message; permission, expired session and outage stay
  distinct; a failed illustration removal does not undo the delete; logs carry no personal data.

## 4. Failure kinds in the write features, sign-in and sign-up <!-- judgement-heavy -->

- [ ] 4.1 (FR-14, FR-15, FR-18, FR-19) Map SQLSTATE `AM001` once, in `src/shared/lib/supabase/classify-error.ts`
  (a `restricted` member of `SupabaseFailure`, checked before the `42501` and generic mappings), with its test; then
  each feature (`poem-management`, `collection-management`, `work-ordering`, `authors`) only adds its message and
  surface. No feature detects the code itself. Turn the single-value comparisons that would silently send
  `restricted` to the generic path into exhaustive switches checked by `tsc`: `work-ordering/actions/run-move.ts`,
  `DeletePoemButton`, and the `"unauthenticated"` checks in the collection-management forms; keep read results narrow
  where the type allows.
- [ ] 4.2 (FR-14, FR-15, FR-18, FR-19) Show the message on the poem and collection forms and delete flows, the
  board (item snaps back) and the profile editor; input stays on screen; no retry.
- [ ] 4.3 (FR-14, FR-15, FR-18, FR-19) Vitest for each classification and surface: `restricted` is not
  `session-expired`; fields kept; nothing retried; other failures keep their message.
- [ ] 4.4 (FR-16) `auth`: a `restricted` sign-in failure kind from the Auth refusal of a banned user, with its
  message; wrong credentials stay generic. Vitest for both.
- [ ] 4.4a (FR-16) Vitest: the Auth error shape of a banned refresh run through `readClaimsState` is signed out.
- [ ] 4.5 (FR-17) `signUpAction` maps exactly the hook's fixed rejection code to its `check-email` answer; every
  other sign-up error keeps its mapping. Vitest for the banned path and an ordinary error.

## 5. The `/admin` page (UI) <!-- judgement-heavy -->

- [ ] 5.1 (FR-2) `src/app/(authorized)/admin/page.tsx` (one line, renders `AdminPage`; the session and admin gate
  live in `AdminPage` inside its own Suspense), its `@breadcrumbs` slot page, and the
  `app/tests/breadcrumbs-slot.test.ts` update; signed-out to `/login`, non-admin to `notFound()`, outage to the
  "service unavailable" state; never cached.
- [ ] 5.2 (FR-3) `AdminPage`, `AdminUserList`, `AdminUserRow`: the server-rendered list, state badges (admin rows marked, with no controls; blocked rows offer unblock, revoke, ban; banned rows only revoke), results and failures inside the row, URL-cursor
  next link and first-page link, the email filter, loading and empty states.
- [ ] 5.3 (FR-4 – FR-7, FR-12, NFR-5) Block, unblock and revoke controls (one click each) and a ban control with a
  confirmation dialog naming the user's email; no reason field anywhere; result line;
  `refresh()` after a success. No accessibility work is required for the admin UI (NFR-5).
- [ ] 5.3a (FR-20, NFR-3, NFR-4) `AdminNavLink` (session first, `is_admin()` only for a signed-in reader, link or `null`)
  inside its own `<Suspense fallback={null}>`; an optional `adminLink?: ReactNode` slot on `auth`'s `HeaderAuthLinks`
  rendered between «Личный кабинет» and «Выйти» (artboard 1), filled by `src/app/layout.tsx`; the three-row mobile
  header only when the slot is filled; `AdminNavLink` added to the admin public API.
- [ ] 5.4 (FR-2 – FR-7, FR-12, FR-20, NFR-5) Component tests for the list, the filter, the paging, the header link (admin, others, guest with no RPC) and the ban dialog (texts come from
  `admin-messages.ts`).

## 6. Admin delete control on public pages (UI) <!-- judgement-heavy -->

- [ ] 6.1 (FR-10, NFR-3) `AdminDeleteControl` (a Server Component that reads the session first, calls
  `may_moderate_author(author)` only for a signed-in reader, inside its own `<Suspense>`, and renders nothing otherwise, an admin's own work included) with its
  confirmation dialog and the two delete actions.
- [ ] 6.2 (FR-10, NFR-4) A `moderation?: (target: { id; title; authorId }) => ReactNode` prop on `PoemPage` and
  `PublicCollectionPage`, called by `PoemPageContent` and the collection's content component after their own read
  succeeds; the two route files under `src/app/(public)/authors/[id]/` supply
  `(t) => <AdminDeleteControl ... redirectHref={authorPagePath(t.authorId)} />`. No route file awaits `params`
  outside a Suspense boundary.
- [ ] 6.3 (FR-10, NFR-3, NFR-4, NFR-5) Tests: renders for an admin only, never for guest, non-admin or author; nothing else
  on the page differs; confirm, cancel and redirect; no control on a soft 404; a build check that both routes keep
  their rendering mode.

## 7. Docs and verification <!-- isolated -->

- [ ] 7.1 (NFR-2) ADR in `docs/decisions/`: no service-role key; admin power in guarded SQL functions; it amends ADR
  0005 D1 (and notes ADR 0013 D3): a function whose first statement is `assert_admin()` may take a target user id or
  row id, and only `features/admin` sends one; add an "Amended by" line to ADR 0005; the check in every writer instead
  of a choke point, and the dedicated SQLSTATE `AM001`; the auth-schema coupling, the `banned_until` value and the access-token
  window (design D3, D4, D5).
- [ ] 7.2 (FR-1, FR-17) `docs/environment.md`: the Deploy checklist gains the migration push, the Before User
  Created hook registration in the dashboard, and the SQL that inserts the owner's user id into `public.admins`;
  `docs/architecture.md` lists `features/admin`, its two import edges (`auth`, `poems` bucket constant) and the
  `/admin` route (no breadcrumbs `STATIC_ROUTES` row).
- [ ] 7.3 (NFR-2) A test that fails when `src/` reads a service-role or secret Supabase key variable.
- [ ] 7.4 (all) Web QA of the whole flow on the local stack: admin sign-in, block, sign-in refused, unblock, ban and
  the sign-up showing the neutral answer, revoke, delete another user's poem (with illustration) and collection from
  the public pages, and a non-admin's `/admin` 404. Keep the passing flows as `tests/web-qa-scenarios` specs.
- [ ] 7.5 (all) Validate: `npm run typecheck && npm run lint && npm run test:coverage && npm run build &&
  npm run knip`, and the whole pgTAP suite after `supabase db reset`.
