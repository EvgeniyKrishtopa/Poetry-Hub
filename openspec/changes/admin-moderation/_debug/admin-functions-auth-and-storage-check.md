# What Supabase Auth and Storage do with what the admin functions write (task 2.8)

- Change: `admin-moderation`
- Called from: `opsx-apply-git`, group 2
- Date: 2026-11-13
- Stack: local (`supabase start`, Auth with the Before User Created hook registered in `supabase/config.toml`)

Two throwaway probe scripts drove the real Auth and Storage HTTP APIs with real access tokens; the admin
functions ran as an admin session (`set local role authenticated` with the admin's claims). Nothing is left in
the database or in the buckets.

## Results on the local stack

| Check | What happened |
| --- | --- |
| Block: sign-in | HTTP 400, `error_code` `user_banned`, message `User is banned`. A wrong password for a blocked address gives the same answer. |
| Block: `banned_until` | `now() + 100 years` (2126-11-13 at the time of the run); GoTrue refuses on it. |
| `banned_until = 'infinity'` | GoTrue answers **HTTP 500**, `error_code` `unexpected_failure`, message `Database error querying schema`. So `infinity` does **not** work, and the finite constant is required (design D3). |
| Revoke: refresh token | After `admin_revoke_sessions` the `auth.sessions` rows are gone and a refresh with the old token is HTTP 400, `error_code` `refresh_token_not_found` (cascade removed the token). |
| Revoke: sign in again | Succeeds (HTTP 200). |
| Block: a refresh token live before the block | HTTP 400 `refresh_token_not_found`, because the block deleted the sessions. |
| Unblock: sign in | Succeeds (HTTP 200). |
| Hook, banned address, account deleted | The sign-up is refused: **HTTP 403**, `error_code` `unknown`, `msg` `signup not allowed`. No user is created. Same for the address in another case. |
| Hook, banned address, account still exists | Auth answers `user_already_exists` (HTTP 422) before the hook runs: the hook only runs for a new user. The ban of the address matters once the account is gone. |
| Hook, ordinary weak password | HTTP 422 `weak_password`, unchanged. |
| Hook, fresh address | HTTP 200, user created. |
| Storage: admin removes another author's file | `DELETE /storage/v1/object/poem-illustrations/<path>` with the admin's token: HTTP 200 `Successfully deleted`, object gone. The batch endpoint (`remove()` of supabase-js) also removed it. |
| Storage: non-admin removes another author's file | The single-object endpoint answers HTTP 400 `AccessDenied` (403 in the body); the object stays. |

## What this means for later groups

- **Task 4.5 (`signUpAction`)** must match the hook's rejection by **status 403 and the message `signup not
  allowed`**. supabase-js exposes it as an `AuthApiError` with `status` 403, `code` `unknown` and that message;
  the `code` field is not distinctive, so it must not be the only thing compared. Every other sign-up error keeps
  its existing mapping.
- **Task 4.4 (`signInAction`)** reads a banned or blocked account from `error_code` `user_banned` (HTTP 400).
- A wrong password for a blocked address also answers `user_banned`, so an anonymous caller can tell that an
  address belongs to a blocked or banned account. Accepted: the owner moderates a small site, and hiding it would
  need the app to proxy sign-in differently.
- **Task 4.4a (`readClaimsState`)**: a refresh for a revoked or blocked session is `refresh_token_not_found`,
  not `user_banned`; both must read as signed out.

## Not checked here

The hosted-project half of task 2.8 (the `postgres` role may update `auth.users` and delete `auth.sessions`, and
the same Auth and Storage answers on the hosted project) needs the hosted project and is recorded as deferred.
