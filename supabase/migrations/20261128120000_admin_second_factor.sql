-- The admin's second factor (pre-deploy-security-hardening FR-9, design D6) and the totp_verify scope of the
-- per-user write limit.
--
-- Admin power now needs a session that verified a second factor: the JWT's `aal` must be `aal2`.
-- assert_admin() (the first statement of every admin_* function), may_moderate_author() and the two admin
-- Storage policies require it. is_admin() does not: the app asks it to tell an admin who still has to enter
-- the code from a reader who is not an admin. A token without `aal` counts as not verified.
--
-- totp_verify: 5 code attempts per 1 minute per account, counted by the app before it asks Supabase to check a
-- code. It bounds the app's path only: a holder of the session can call Supabase Auth's verify endpoint
-- directly (ADR 0025). The number lives only here.
--
-- consume_write_allowance has the body of 20261125150000_password_reset_limit.sql with one new row in the
-- limits list. `create or replace` keeps every function's grants.
--
-- Down migration (documented, never auto-run; revert the app first, its /admin/verify page calls the scope and
-- would refuse every code without it):
--   delete from public.write_rate_limits where scope = 'totp_verify';
--   alter table public.write_rate_limits drop constraint write_rate_limits_scope_check;
--   alter table public.write_rate_limits add constraint write_rate_limits_scope_check
--     check (scope in ('profile_write', 'photo_upload', 'poem_edit', 'collection_edit', 'collection_poems_save', 'order_move', 'password_reset'));
--   alter policy "admins read poem illustrations" on storage.objects
--     using (bucket_id = 'poem-illustrations' and (select public.is_admin()));
--   alter policy "admins delete poem illustrations" on storage.objects
--     using (bucket_id = 'poem-illustrations' and (select public.is_admin()));
--   then re-run, as `create or replace`, the statements that define the previous bodies:
--   `public.assert_admin` from 20261113170000_admin_moderation.sql, `public.may_moderate_author` from
--   20261113180000_admin_moderation_functions.sql, and `public.consume_write_allowance` from
--   20261125150000_password_reset_limit.sql.

create or replace function public.assert_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() or (select auth.jwt() ->> 'aal') is distinct from 'aal2' then
    raise exception 'not an admin' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.may_moderate_author(author_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin()
    and coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
    and not exists (
      select 1 from public.author_profiles ap
      where ap.id = may_moderate_author.author_profile_id
        and ap.user_id = (select auth.uid())
    );
$$;

alter policy "admins read poem illustrations" on storage.objects
  using (
    bucket_id = 'poem-illustrations'
    and (select public.is_admin())
    and (select auth.jwt() ->> 'aal') = 'aal2'
  );

alter policy "admins delete poem illustrations" on storage.objects
  using (
    bucket_id = 'poem-illustrations'
    and (select public.is_admin())
    and (select auth.jwt() ->> 'aal') = 'aal2'
  );

alter table public.write_rate_limits drop constraint write_rate_limits_scope_check;
alter table public.write_rate_limits add constraint write_rate_limits_scope_check
  check (scope in ('profile_write', 'photo_upload', 'poem_edit', 'collection_edit', 'collection_poems_save', 'order_move', 'password_reset', 'totp_verify'));

-- Limits:
--   profile_write: 10 per 1 minute; photo_upload: 5 per 1 hour; poem_edit: 10 per 1 minute;
--   collection_edit: 10 per 1 minute; collection_poems_save: 10 per 1 minute; order_move: 30 per 1 minute;
--   password_reset: 5 per 1 minute; totp_verify: 5 per 1 minute.
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
      ('password_reset', 5, interval '1 minute'),
      ('totp_verify', 5, interval '1 minute')
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
