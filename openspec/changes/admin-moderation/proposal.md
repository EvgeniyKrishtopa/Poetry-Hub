## Why

Today every signed-in user is equal, and nobody can remove abusive content or stop an abusive account: the only
delete paths are an owner deleting their own poem or collection. The site owner needs a separate admin role that
is not self-assignable, and a way to delete any user's records, block accounts, keep a ban list, and cut off a
user's sessions, without ever putting a service-role key into the app (`docs/environment.md`: only the
publishable key is used).

## What Changes

- An **admin** role, held in the database by a hand-maintained allowlist of user ids. No sign-up, UI, or API can
  grant it; the owner adds a row with SQL.
- A closed **`/admin`** page, visible and reachable only by an admin: a list of users with their state, and
  per-user actions: block, unblock, ban, revoke sessions.
- An **«Админка» link in the site header**, shown to an admin only, that leads to `/admin`.
- A **delete** control on the regular poem and collection pages, rendered only for an admin, that removes any
  user's poem or collection.
- **Block**: a reversible suspension of an account. A blocked user cannot sign in and cannot write.
- **Ban list**: a permanent record of banned accounts, which also stops the same email from signing up again.
- **Revoke sessions**: end all of a user's refresh tokens. A blocked or banned account also loses the ability to
  **write** at once, even with a still-valid access token; a plain revoke leaves that token working until it
  expires.
- Every admin action is written to an **audit log**. No client can read it; the owner reads it in the Supabase dashboard.
- Every admin capability is a `security definer` SQL function that checks the admin allowlist itself, so a direct
  API call by a non-admin fails even if the UI is bypassed (ADR 0005 pattern).
- **BREAKING (internal)**: every existing write path (the poem, collection and ordering functions, the profile
  update policy, and the photo and illustration upload policies) refuses a blocked or banned caller.

## Capabilities

### New Capabilities

- `admin-moderation`: the admin role, the `/admin` page, deleting any user's poem or collection, blocking,
  banning, session revocation, and the audit log.

### Modified Capabilities

- `auth`: sign-in is refused for a blocked or banned account with its own message, and a banned email's sign-up
  is refused without revealing it.
- `poem-management`: write operations refuse a blocked or banned caller and show a `restricted` message.
- `collection-management`: the same `restricted` message on collection writes.
- `work-ordering`: a blocked or banned caller's move fails with a `restricted` message.
- `author-profiles`: a blocked or banned caller's profile and photo writes fail with a `restricted` message.

## Impact

- **Database**: a new migration with `admins`, `account_restrictions`, `banned_emails`, `moderation_log` tables, the
  admin functions, the sign-up hook, admin Storage policies; changes to the existing writers and policies to
  refuse restricted callers.
- **Code**: a new `src/features/admin/` feature (`dal`, `actions`, `model`, `components`, public API),
  `src/app/(authorized)/admin/` route plus its `@breadcrumbs` slot page, and a `moderation` render function prop on the
  poem and collection page components that the route files fill with the admin-only delete control.
- **Docs**: a new ADR (no service-role key: admin power lives in guarded SQL functions), `docs/architecture.md`, and
  `docs/environment.md`'s Deploy checklist gains the migration push and the manual step that adds the first admin.
- **Risk**: high (auth, permissions, database schema, security). Needs Architecture Review, Code Review, deep
  review, tests, and manual validation.

## Mockups

Approved Claude Design canvas: https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z (artboard numbers are the canvas's own; each artboard has light and dark,
desktop and mobile frames).

| Screen | Artboard | Link |
| --- | --- | --- |
| Site header: «Админка» link for the admin, between «Личный кабинет» and «Выйти» | 1 · Шапка (`Main.dc.html`, state «вошёл администратор») | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#Main.dc.html |
| `/admin` user list, filter, page links, row states | 41 · `AdminUsers.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#AdminUsers.dc.html |
| `/admin` last page, action pending, success results | 41 · `AdminUsersResults.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#AdminUsersResults.dc.html |
| `/admin` action failures | 41 · `AdminUsersFailures.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#AdminUsersFailures.dc.html |
| `/admin` loading, empty, list error | 41 · `AdminUsersStates.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#AdminUsersStates.dc.html |
| Ban confirmation dialog | 42 · `AdminBan.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#AdminBan.dc.html |
| `/admin` for a non-admin, and when the check can't be read | 43 · `AdminNotFound.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#AdminNotFound.dc.html |
| Poem page: admin delete button and states | 44 · `AdminPoem.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#AdminPoem.dc.html |
| Poem page: admin delete dialog | 44 · `AdminPoemDialog.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#AdminPoemDialog.dc.html |
| Collection page: admin delete button, dialog, states | 45 · `AdminCollection.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#AdminCollection.dc.html |
| «Аккаунт заблокирован» on poem forms and delete | 46 · `BlockedPoems.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#BlockedPoems.dc.html |
| «Аккаунт заблокирован» on collection forms, collection poems, board | 46 · `BlockedCollections.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#BlockedCollections.dc.html |
| «Аккаунт заблокирован» in the profile editor | 46 · `BlockedProfile.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#BlockedProfile.dc.html |
| Sign-in, blocked account | 47 · `BlockedLogin.dc.html` | https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#BlockedLogin.dc.html |

The mockups show focus rings and focus return in some frames; the admin UI has no accessibility requirement (spec
NFR-5), so those details are not binding. No new token: the state badge uses existing colours.
