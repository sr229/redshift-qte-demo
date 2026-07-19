-- Migration: add synchronized round start timestamp to lobbies
--
-- The host broadcasts a single absolute `started_at` when a round begins so
-- every client can anchor its local countdown to the same instant and stay
-- synchronized despite Realtime broadcast latency.

alter table public.lobbies
  add column if not exists started_at timestamptz;
