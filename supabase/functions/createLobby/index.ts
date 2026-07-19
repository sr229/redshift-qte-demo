// Supabase Edge Function: createLobby
//
// Creates a multiplayer lobby with a server-generated, collision-free 5-character
// code. Runs with the service_role key so it can write to `public.lobbies`
// (anon clients are restricted to SELECT-only by migration 0003).
//
// Deploy with: supabase functions deploy createLobby --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const VARIANTS = ['score', 'elimination', 'reaction'] as const
type Variant = (typeof VARIANTS)[number]

interface CreateBody {
  hostId: string
  hostName: string
  variant: string
}

function randomCode(): string {
  return Math.random().toString(36).slice(2, 7).toUpperCase()
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

  let body: CreateBody
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { hostId, hostName, variant } = body
  if (!hostId || !hostName || !VARIANTS.includes(variant as Variant)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid payload' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  // Retry until we land a unique code (collisions are rare with 5 base36 chars).
  let code: string | null = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = randomCode()
    const { error } = await supabase
      .from('lobbies')
      .insert({ code: candidate, host_id: hostId, variant })
    if (!error) {
      code = candidate
      break
    }
    // A unique-violation (23505) means the code already exists; try again.
    if (error.code !== '23505') {
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
  }

  if (!code) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Could not allocate a lobby code' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  return new Response(
    JSON.stringify({ ok: true, code, hostId, variant }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
