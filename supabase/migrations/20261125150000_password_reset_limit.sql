-- Password recovery: the password_reset scope of the per-user write limit (password-recovery, FR-9, design D6).
--
-- A new scope of ADR 0007's counter, password_reset: 5 attempts per 1 minute per account, one attempt per
-- save on the new-password page, counted by the app after the session check and before updateUser. The limit
-- bounds only the attempts made through this app: a holder of the session can call Supabase Auth's own
-- endpoint directly and skip it, so it is defence in depth, not a security boundary (design D6). Keep the
-- number in step with the password-reset limit constant in the auth feature.
--
-- Same function body as 20261113170000_admin_moderation.sql (the restriction check first, one atomic upsert),
-- with the one new row in the limits list; the constraint list is the one from 20261111160000_work_ordering.sql
-- plus the new scope. `create or replace` keeps the function's grants.
--
-- Down migration (documented, never auto-run; revert the app first, its new-password page calls the scope and
-- would refuse every save without it):
--   delete from public.write_rate_limits where scope = 'password_reset';
--   alter table public.write_rate_limits drop constraint write_rate_limits_scope_check;
--   alter table public.write_rate_limits add constraint write_rate_limits_scope_check
--     check (scope in ('profile_write', 'photo_upload', 'poem_edit', 'collection_edit', 'collection_poems_save', 'order_move'));
--   then re-run, as `create or replace`, the statement that defines the previous body:
--   `public.consume_write_allowance` from 20261113170000_admin_moderation.sql.

alter table public.write_rate_limits drop constraint write_rate_limits_scope_check;
alter table public.write_rate_limits add constraint write_rate_limits_scope_check
  check (scope in ('profile_write', 'photo_upload', 'poem_edit', 'collection_edit', 'collection_poems_save', 'order_move', 'password_reset'));

-- Limits:
--   profile_write: 10 per 1 minute; photo_upload: 5 per 1 hour; poem_edit: 10 per 1 minute;
--   collection_edit: 10 per 1 minute; collection_poems_save: 10 per 1 minute; order_move: 30 per 1 minute;
--   password_reset: 5 per 1 minute.
-- The scope argument keeps its name (the app passes it by name) and is always written
-- consume_write_allowance.scope; a bare `scope`, as in the `on conflict` target, means the column, which is
-- what `#variable_conflict use_column` says.
create or replace function public.consume_write_allowance(scope text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  allowed boolean;
begin
  perform public.assert_not_restricted();

  with limits (scope, max_hits, window_length) as (
    values
      ('profile_write', 10, interval '1 minute'),
      ('photo_upload', 5, interval '1 hour'),
      ('poem_edit', 10, interval '1 minute'),
      ('collection_edit', 10, interval '1 minute'),
      ('collection_poems_save', 10, interval '1 minute'),
      ('order_move', 30, interval '1 minute'),
      ('password_reset', 5, interval '1 minute')
  ),
  counted as (
    insert into public.write_rate_limits as counter (user_id, scope, window_start, hits)
    values ((select auth.uid()), consume_write_allowance.scope, now(), 1)
    on conflict (user_id, scope) do update set
      window_start = case
        when counter.window_start <= now() - (select l.window_length from limits l where l.scope = counter.scope)
          then now()
        else counter.window_start
      end,
      hits = case
        when counter.window_start <= now() - (select l.window_length from limits l where l.scope = counter.scope)
          then 1
        else counter.hits + 1
      end
    returning counter.hits
  )
  select c.hits <= l.max_hits
  into allowed
  from counted c
  join limits l on l.scope = consume_write_allowance.scope;

  return allowed;
end;
$$;
