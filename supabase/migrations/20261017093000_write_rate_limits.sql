-- Per-user write limits for the profile Server Actions (add-author-profiles, FR-21, design D13).
--
-- Every successful profile write expires the public pages' cache, so an unlimited save loop from one
-- account would keep them uncached. Each action asks consume_write_allowance() before it writes. The
-- limits live in that function, so no client input can raise them, and no client role can read or change
-- the counters: the function is the only way to reach the table.
--
-- Down migration (documented, never auto-run; revert the app first, or its actions fail closed):
--   drop function if exists public.consume_write_allowance(text);
--   drop table if exists public.write_rate_limits;

-- One row per user and scope, so the table stays bounded. A fixed window: it starts at the first counted
-- attempt and restarts once its length has passed.
create table public.write_rate_limits (
  user_id      uuid not null references auth.users (id) on delete cascade,
  scope        text not null check (scope in ('profile_write', 'photo_upload')),
  window_start timestamptz not null,
  hits         integer not null check (hits > 0),
  primary key (user_id, scope)
);

-- No policies and no grants: only consume_write_allowance() touches the table.
alter table public.write_rate_limits enable row level security;
revoke all on public.write_rate_limits from anon, authenticated;

-- Counts one attempt for the caller and returns whether it is within the scope's limit:
--   profile_write: 10 per 1 minute; photo_upload: 5 per 1 hour.
-- One upsert, so concurrent attempts serialize on the row lock and can't both pass as the last allowed
-- one. A blocked attempt still counts; that changes nothing, because the window ends at window_start plus
-- its length either way. An unknown scope fails the table's check; a caller with no auth.uid() fails
-- user_id's not-null constraint.
-- `language sql`, and the argument always written consume_write_allowance.scope: in plpgsql a bare
-- `scope` next to the `scope` column is ambiguous (Gate 1, 2026-10-17).
create function public.consume_write_allowance(scope text)
returns boolean
language sql
volatile
security definer
set search_path = ''
as $$
  with limits (scope, max_hits, window_length) as (
    values
      ('profile_write', 10, interval '1 minute'),
      ('photo_upload', 5, interval '1 hour')
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
  from counted c
  join limits l on l.scope = consume_write_allowance.scope;
$$;

revoke execute on function public.consume_write_allowance(text) from public, anon;
grant execute on function public.consume_write_allowance(text) to authenticated;
