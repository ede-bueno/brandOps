create table if not exists public.cron_job_locks (
  job_name text primary key,
  owner_id uuid not null,
  locked_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  released_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.cron_job_locks is
  'Locks server-side para cron jobs do Atlas com TTL e liberação segura.';

create index if not exists cron_job_locks_expires_at_idx
  on public.cron_job_locks (expires_at);

revoke all on public.cron_job_locks from anon, authenticated;

create or replace function public.acquire_cron_job_lock(
  p_job_name text,
  p_owner_id uuid,
  p_ttl_seconds integer default 3600,
  p_meta jsonb default '{}'::jsonb
)
returns table (
  acquired boolean,
  expires_at timestamptz,
  owner_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with upserted as (
    insert into public.cron_job_locks as locks (
      job_name,
      owner_id,
      locked_at,
      expires_at,
      released_at,
      meta,
      updated_at
    )
    values (
      p_job_name,
      p_owner_id,
      timezone('utc', now()),
      timezone('utc', now()) + make_interval(secs => greatest(1, p_ttl_seconds)),
      null,
      coalesce(p_meta, '{}'::jsonb),
      timezone('utc', now())
    )
    on conflict (job_name) do update
    set
      owner_id = excluded.owner_id,
      locked_at = excluded.locked_at,
      expires_at = excluded.expires_at,
      released_at = null,
      meta = excluded.meta,
      updated_at = excluded.updated_at
    where locks.expires_at <= timezone('utc', now())
      or locks.released_at is not null
    returning true as acquired, locks.expires_at as expires_at, locks.owner_id as owner_id
  )
  select upserted.acquired, upserted.expires_at, upserted.owner_id
  from upserted
  union all
  select
    false as acquired,
    locks.expires_at,
    locks.owner_id
  from public.cron_job_locks as locks
  where locks.job_name = p_job_name
    and not exists (select 1 from upserted);
end;
$$;

create or replace function public.renew_cron_job_lock(
  p_job_name text,
  p_owner_id uuid,
  p_ttl_seconds integer default 3600
)
returns table (
  renewed boolean,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with updated as (
    update public.cron_job_locks
    set
      expires_at = timezone('utc', now()) + make_interval(secs => greatest(1, p_ttl_seconds)),
      released_at = null,
      updated_at = timezone('utc', now())
    where job_name = p_job_name
      and owner_id = p_owner_id
      and (released_at is null or released_at <= timezone('utc', now()))
    returning true as renewed, cron_job_locks.expires_at as expires_at
  )
  select updated.renewed, updated.expires_at
  from updated
  union all
  select false as renewed, null::timestamptz
  where not exists (select 1 from updated);
end;
$$;

create or replace function public.release_cron_job_lock(
  p_job_name text,
  p_owner_id uuid
)
returns table (
  released boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with updated as (
    update public.cron_job_locks
    set
      released_at = timezone('utc', now()),
      expires_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    where job_name = p_job_name
      and owner_id = p_owner_id
      and released_at is null
    returning true as released
  )
  select updated.released
  from updated
  union all
  select false as released
  where not exists (select 1 from updated);
end;
$$;

grant execute on function public.acquire_cron_job_lock(text, uuid, integer, jsonb) to service_role;
grant execute on function public.renew_cron_job_lock(text, uuid, integer) to service_role;
grant execute on function public.release_cron_job_lock(text, uuid) to service_role;
