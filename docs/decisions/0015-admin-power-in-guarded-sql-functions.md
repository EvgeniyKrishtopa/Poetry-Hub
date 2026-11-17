# 0015. Admin power lives in guarded SQL functions; no service-role key; the restriction check is in every writer

## Status

Proposed (2026-11-17) -- written by an autonomous series, not yet confirmed

Amends 0005 (Decision 1) and notes 0013 (Decision 3).

## Context

`admin-moderation` lets one admin (the owner) delete any poem or collection, block, unblock and ban an
account, and end a user's sessions. Supabase Auth's admin API (list users, ban, sign out a user) needs the
service-role key, and `docs/environment.md` forbids any secret key in `src/`: the app only ever holds the
publishable key.

User content is protected by ADR 0005 Decision 1: RLS plus column grants, no client write grants, and every
write is a `security definer` function that takes the owner from `auth.uid()` and never a user id from the
caller. ADR 0013 Decision 3 repeated that for collections. An admin acts on someone else's rows, so that rule
needs one exception. There is also no single place every write passes through: `consume_write_allowance` is a
separate RPC some writes call, creates count their own rows (ADR 0009, 0010), and profile and photo writes are
direct updates and Storage uploads under RLS. Details live in the archived change's `design.md` (D1-D7, D11).

## Decision

1. **No service-role key, ever.** Admin power is a set of `security definer` functions with an empty
   `search_path`, executable by `authenticated` only, each starting with `perform public.assert_admin()`
   (SQLSTATE `42501` for a non-admin or a signed-out caller). A direct PostgREST call by anyone else fails
   inside the database, whatever the UI shows. The admin is a row in `public.admins` (no policies, no client
   grants, added by SQL), not a JWT claim: a claim would need the Auth admin API to set and would outlive the
   admin's removal until the token expired. A test scans `src/` for a service-role or secret-key variable.
2. **Amends ADR 0005 Decision 1 (and notes ADR 0013 Decision 3).** A function whose first statement is
   `assert_admin()` may take a target user id or row id. Only `features/admin` sends one, and only through its
   own DAL. The owner functions keep deriving the owner from `auth.uid()`. The shared delete bodies moved into
   `delete_poem_of` and `delete_collection_of`, which take the owner as an argument and are therefore revoked
   from `public`, `anon` and `authenticated` (pgTAP proves it); the owner's and the admin's function both call
   them.
3. **The restriction check is in every writer, not at a choke point.** `assert_not_restricted()` is the first
   statement of every `security definer` writer of user content and of `can_create_poem()`, and
   `not public.is_restricted()` is in the profile update policy and the owner insert and delete policies on the
   two buckets. A pgTAP test over `pg_proc` fails when a volatile `security definer` function that
   `authenticated` can execute neither calls it nor is on the explicit allowlist. The check raises a dedicated
   SQLSTATE `AM001` (`42501` already means "not signed in" and "not an admin"), which
   `classifySupabaseError` maps once to `restricted`.
4. **Block, ban and revoke write to the `auth` schema.** The functions set `auth.users.banned_until` and
   delete `auth.sessions` rows as the migration role. `banned_until` is a finite far-future time
   (`now() + 100 years`), because `infinity` makes GoTrue answer HTTP 500 (checked on the local stack, task
   2.8). That couples us to Supabase's internal schema, confined to `apply_restriction`,
   `admin_unblock_user` and `admin_revoke_sessions`. The hosted project's half of the check waits for the
   deploy (`docs/deferred.md`).
5. **Revoking sessions does not end the current access token.** It stays valid until it expires (Supabase's
   default is one hour) and `getClaims()` reads it locally, so the user's own private pages stay readable
   until then. Writes are closed at once by Decision 3. For a plain revoke of an unrestricted account the
   leftover token also still writes; the next refresh fails. Shortening the JWT expiry is an open question.

## Consequences

**Positive**

- The app holds no secret that could end every account if it leaked; the admin's reach is the list of
  functions, each testable with pgTAP.
- A new writer that forgets the check fails the suite instead of shipping unguarded.
- One SQLSTATE and one classifier entry carry "restricted" to every surface.

**Negative**

- The check is repeated, not enforced in one place: a forgotten call is caught by a test, not by structure.
- The migration depends on what the `postgres` role may do in Supabase's `auth` schema; a platform change can
  break block, unblock and revoke until the functions move to a role that holds the grant.
- A revoked, unblocked user can still write for up to an hour (Decision 5).
- The Before User Created hook is a manual dashboard step on the hosted project.

## Alternatives Considered

- Use the service-role key in a server-only module -- rejected because one leaked key would be full access to
  every account and row, and `docs/environment.md` already forbids it.
- `app_metadata.role` in the JWT -- rejected because setting it needs the Auth admin API, and a claim stays
  valid until the token expires, so removing an admin would not take effect at once.
- One hook in `consume_write_allowance` for the restriction check -- rejected because not every writer calls
  it, and the profile and Storage writes cannot.
- `42501` for a restricted account -- rejected because existing writers raise it for "not signed in" and
  `assert_admin()` for "not an admin", so the app could not tell them apart.
- `infinity` for `banned_until` -- rejected because GoTrue turns it into HTTP 500, which the app would read as
  "service unavailable" instead of signed out.
- Hiding content instead of deleting it -- rejected as out of scope for this change.
