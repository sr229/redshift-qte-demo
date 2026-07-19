# Supabase Migrations

The following files are used to perform migrations on the Supabase database for the Redshift QTE Demo as well as necessary infrastructure. These migrations will create the necessary tables and relationships for the multiplayer mode of the game.

## What's included here?

This includes the full backend infrastructure for the multiplayer mode of the Redshift QTE Demo, including:
 
- Tables for lobbies and participants
- Edge functions for telemetry and game state management

## Deploying to a hosted Supabase project

The Supabase backend has two parts that must be deployed separately: the **database migrations** (tables, RLS policies) and the **Edge Functions** (server-side logic). Both target the same linked project.

### Prerequisites

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
```

You can find your project ref in the Supabase dashboard (Project Settings → General → Reference ID), or via `npx supabase projects list`.

### 1. Database migrations

Push the versioned SQL migrations under `supabase/migrations/` to the linked project. This creates the `lobbies`, `participants`, `telemetry`, and `leaderboard` tables along with their RLS policies.

```bash
npx supabase db push
```

> `db push` applies any new migration files without resetting existing data. To re-apply from scratch (destructive — wipes data), use `npx supabase db reset` against a local stack instead.

### 2. Edge Functions

The Edge Functions live under `supabase/functions/`. Each is deployed individually. The platform automatically injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` at runtime, so no manual secrets configuration is required.

| Function | Deploy command | Notes |
| --- | --- | --- |
| `submitTelemetry` | `npx supabase functions deploy submitTelemetry` | Verifies the caller's JWT (default). |
| `createLobby` | `npx supabase functions deploy createLobby --no-verify-jwt` | Uses the service role key; invoked anon, so JWT verification is skipped. |
| `changeMode` | `npx supabase functions deploy changeMode --no-verify-jwt` | Uses the service role key; invoked anon. |
| `submitStateToLeaderboard` | `npx supabase functions deploy submitStateToLeaderboard --no-verify-jwt` | Uses the service role key; invoked anon. |

Deploy all of them in one go:

```bash
npx supabase functions deploy submitTelemetry
npx supabase functions deploy createLobby --no-verify-jwt
npx supabase functions deploy changeMode --no-verify-jwt
npx supabase functions deploy submitStateToLeaderboard --no-verify-jwt
```

> The `--no-verify-jwt` flag is required for the three functions that run with the service role key and are called directly from the browser without an authenticated user session. `submitTelemetry` keeps JWT verification on because it relies on the anon key and per-row RLS.

### 3. Frontend environment variables

Once the project is deployed, copy the project URL and the **publishable** (anon) key from the Supabase dashboard (Project Settings → API) into your app's `.env`:

```bash
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-publishable-anon-key>
```

The frontend reads these via `lib/supabase.ts` to enable multiplayer and telemetry submission.

### Local development

To run the entire stack locally instead:

```bash
npx supabase start        # spins up local DB, Realtime, Studio, and Edge Functions
npx supabase db reset     # (re)applies all migrations from scratch
```

`supabase start` writes `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to the shell environment, which the integration tests pick up automatically. Convenience npm scripts (`supabase:start`, `supabase:stop`, `supabase:reset`, `supabase:push`) wrap these commands.