// Supabase Edge Function: migrateHost
//
// Triggers immediate server-side reconciliation of a lobby. Clients call this
// when they detect (via Realtime presence) that the host has left, so host
// migration and lobby cleanup happen without waiting for the pg_cron job.
//
// Reconciliation is performed by the `public.reconcile_lobby` SQL function
// (migration 0006), which:
//   * prunes participants whose heartbeat is stale (> 30s),
//   * deletes the lobby when no participants remain (auto-cleanup),
//   * promotes the longest-present remaining participant to host when the
//     current host is no longer in the roster (host migration).
//
// Any current participant may call this (no host authorization), because the
// caller is only asking the server to re-derive truth from the roster. The
// function verifies the caller is actually present in the lobby before acting.
//
// Deploy with: supabase functions deploy migrateHost --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface MigrateBody {
  code: string
  participantId: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Server misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: MigrateBody
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { code, participantId } = body
  if (!code || !participantId) {
    return new Response(
      JSON.stringify({ ok: false, error: 'code and participantId are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  // Confirm the lobby exists and the caller is a current participant. This
  // prevents arbitrary clients from triggering reconciliation on lobbies they
  // are not part of (a minor abuse vector, not a security boundary).
  const { data: lobby, error: lookupError } = await supabase
    .from('lobbies')
    .select('id')
    .eq('code', code)
    .maybeSingle()

  if (lookupError) {
    return new Response(
      JSON.stringify({ ok: false, error: lookupError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
  if (!lobby) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Lobby not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const { data: participant, error: partError } = await supabase
    .from('lobby_participants')
    .select('participant_id')
    .eq('lobby_id', lobby.id)
    .eq('participant_id', participantId)
    .maybeSingle()

  if (partError) {
    return new Response(
      JSON.stringify({ ok: false, error: partError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
  if (!participant) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Caller is not a participant of this lobby' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // Re-derive host + prune stale participants. RPC runs as service_role.
  const { error: rpcError } = await supabase.rpc('reconcile_lobby', {
    p_code: code,
  })

  if (rpcError) {
    return new Response(
      JSON.stringify({ ok: false, error: rpcError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
