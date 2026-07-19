-- Migration: lobby roster heartbeat, host migration, and auto-cleanup
--
-- Implements server-side lobby lifecycle management WITHOUT Realtime presence
-- webhooks. Presence webhooks are a Supabase Cloud-platform-only feature and
-- cannot be expressed in local config.toml (the [realtime] block only allows
-- `enabled`, `ip_version`, and `max_header_length`), so they cannot run under
-- `npx supabase start`. Instead, clients maintain a heartbeat row in
-- `lobby_participants` and a pg_cron job periodically reconciles each lobby:
--
--   * removes participants whose heartbeat is stale (client gone > 30s)
--   * deletes the lobby entirely when no participants remain (auto-cleanup)
--   * reassigns host_id to the longest-present participant when the host leaves
--     (host migration)
--
-- Clients also call the `migrateHost` Edge Function to trigger reconciliation
-- immediately when they detect the host has left presence.

-- Track when each participant joined so host migration can pick a deterministic
-- successor (the earliest joiner) rather than an arbitrary remaining row.
alter table public.lobby_participants
  add column if not exists joined_at timestamptz not null default now();

create index if not exists lobby_participants_updated_at_idx
  on public.lobby_participants (updated_at);

-- Reconcile a single lobby: prune stale participants, auto-delete when empty,
-- and migrate the host when the current host is no longer present.
create or replace function public.reconcile_lobby(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lobby_id uuid;
  v_host_id  text;
  v_new_host text;
begin
  select id, host_id into v_lobby_id, v_host_id
  from public.lobbies
  where code = p_code;

  if not found then
    return;
  end if;

  -- Drop participants whose heartbeat is stale (client left without cleanup).
  delete from public.lobby_participants
  where lobby_id = v_lobby_id
    and updated_at < now() - interval '30 seconds';

  -- No participants left: remove the lobby entirely (auto-cleanup). The
  -- cascade on lobby_participants.lobby_id takes care of the leftover rows.
  if not exists (
    select 1 from public.lobby_participants where lobby_id = v_lobby_id
  ) then
    delete from public.lobbies where id = v_lobby_id;
    return;
  end if;

  -- Host migration: if the stored host is no longer in the roster, promote the
  -- longest-present remaining participant (earliest joined_at).
  if not exists (
    select 1 from public.lobby_participants
    where lobby_id = v_lobby_id and participant_id = v_host_id
  ) then
    select participant_id into v_new_host
    from public.lobby_participants
    where lobby_id = v_lobby_id
    order by joined_at asc
    limit 1;

    if v_new_host is not null and v_new_host <> v_host_id then
      update public.lobbies set host_id = v_new_host where id = v_lobby_id;
    end if;
  end if;
end;
$$;

-- Reconcile every lobby. Intended to be driven by pg_cron on a fixed interval.
create or replace function public.cleanup_stale_lobbies()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in select code from public.lobbies loop
    perform public.reconcile_lobby(r.code);
  end loop;
end;
$$;

-- The Edge Functions connect as service_role and need EXECUTE privileges.
grant execute on function public.reconcile_lobby(text) to service_role;
grant execute on function public.cleanup_stale_lobbies() to service_role;

-- Schedule the cleanup job every minute. pg_cron is bundled with the Supabase
-- Postgres image used both locally and in the cloud, so this works under
-- `npx supabase start` as well as on a hosted project.
create extension if not exists pg_cron;

do $do$
begin
  if exists (select 1 from cron.job where jobname = 'cleanup-stale-lobbies') then
    perform cron.unschedule('cleanup-stale-lobbies');
  end if;
  perform cron.schedule(
    'cleanup-stale-lobbies',
    '* * * * *',
    $cmd$ select public.cleanup_stale_lobbies(); $cmd$
  );
end $do$;
