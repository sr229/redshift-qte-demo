-- Migration: add match settings columns to lobbies
-- Lets the host configure the initial window (seconds) and combo length for a
-- multiplayer lobby, mirroring the solo-mode settings. These are persisted so
-- every client (including late joiners) sees the same match parameters.

alter table public.lobbies
  add column if not exists window_seconds int not null default 5
    check (window_seconds in (5, 10, 15)),
  add column if not exists sequence_length int not null default 4
    check (sequence_length in (4, 6, 8));
