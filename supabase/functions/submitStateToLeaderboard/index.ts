// Supabase Edge Function: submitStateToLeaderboard
//
// Persists the final participant states for a finished multiplayer lobby into
// `public.leaderboard`. The results screen reads these rows (by lobby code) so
// the standings survive after presence participants disconnect. Runs with the
// service_role key; anon clients are SELECT-only on `public.leaderboard` per
// migration 0003.
//
// Deploy with: supabase functions deploy submitStateToLeaderboard --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const VARIANTS = ['score', 'elimination', 'reaction'] as const
type Variant = (typeof VARIANTS)[number]

interface ParticipantState {
  participantId: string
  name: string
  score: number
  alive: boolean
}

interface SubmitBody {
  code: string
  variant: string
  participants: ParticipantState[]
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

  let body: SubmitBody
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { code, variant, participants } = body
  if (
    !code ||
    !VARIANTS.includes(variant as Variant) ||
    !Array.isArray(participants) ||
    participants.length === 0
  ) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid payload' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const rows = participants.map((p) => ({
    lobby_code: code,
    participant_id: p.participantId,
    name: p.name,
    score: p.score ?? 0,
    alive: p.alive ?? true,
    variant,
  }))

  // Upsert so re-submitting the same lobby replaces the prior standings.
  const { error } = await supabase.from('leaderboard').upsert(rows, {
    onConflict: 'lobby_code,participant_id',
  })

  if (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
