-- Migration: lock down lobby writes + add leaderboard table
--
-- The multiplayer Edge Functions (createLobby, changeMode,
-- submitStateToLeaderboard) run with the service_role key, which bypasses RLS
-- entirely. To prevent anonymous clients from writing directly to `lobbies`
-- (e.g. a guest hijacking another lobby's mode), we drop the anon
-- insert/update/delete policies and keep SELECT only. The browser client
-- therefore cannot mutate `lobbies` except through the functions.
--
-- `public.leaderboard` stores per-lobby final results so the results screen
-- can be rendered from server state instead of ephemeral presence.

-- ── Tighten RLS on lobbies: anon may only read ─────────────────────────────
drop policy if exists "anon insert lobbies" on public.lobbies;
drop policy if exists "anon update lobbies" on public.lobbies;
drop policy if exists "anon delete lobbies" on public.lobbies;

-- Keep the read policy so the browser can still look up a lobby by code.
-- (The "anon read lobbies" policy from 0001 remains in place.)

-- Revoke write privileges from anon/authenticated; the service_role used by
-- the Edge Functions keeps full access regardless of these grants.
revoke insert, update, delete on table public.lobbies from anon, authenticated;

-- The Edge Functions connect as service_role, which needs explicit table
-- privileges to write (it bypasses RLS but still needs GRANTs).
grant select, insert, update, delete on table public.lobbies to service_role;

-- ── Leaderboard table ──────────────────────────────────────────────────────
create table if not exists public.leaderboard (
  lobby_code text not null,
  participant_id text not null,
  name text not null,
  score int not null default 0,
  alive boolean not null default true,
  variant text not null check (variant in ('score', 'elimination', 'reaction')),
  created_at timestamptz not null default now(),
  primary key (lobby_code, participant_id)
);

create index if not exists leaderboard_lobby_idx on public.leaderboard (lobby_code);

alter publication supabase_realtime add table public.leaderboard;

alter table public.leaderboard enable row level security;

-- The results screen reads leaderboard rows by lobby code; allow anon reads.
create policy "anon read leaderboard" on public.leaderboard
  for select to anon using (true);

-- Writes go through the submitStateToLeaderboard function (service_role), so
-- anon/authenticated get no direct write privileges here either.
grant select on table public.leaderboard to anon, authenticated;

-- The Edge Function connects as service_role and needs write privileges.
grant select, insert, update, delete on table public.leaderboard to service_role;
