import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  Lobby,
  MultiplayerParticipant,
  MultiplayerVariant,
} from '../lib/types'
import { generateSequence } from '../lib/qte'
import { isMultiplayerEnabled, supabase } from '../lib/supabase'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface UseMultiplayerState {
  enabled: boolean
  lobby: Lobby | null
  /** True when the current user is the host of the active lobby. */
  isHost: boolean
  createLobby: (variant: MultiplayerVariant, name: string) => Promise<void>
  joinLobby: (code: string, name: string) => Promise<void>
  leaveLobby: () => void
  startGame: () => void
  /** Host-only: change the lobby's game mode. */
  updateVariant: (variant: MultiplayerVariant) => Promise<void>
}

function emptyLobby(code: string, hostName: string, variant: MultiplayerVariant, hostId: string): Lobby {
  return {
    id: `lobby_${code}`,
    code,
    hostId,
    variant,
    phase: 'idle',
    participants: [
      {
        id: hostId,
        name: hostName,
        score: 0,
        alive: true,
        sequence: null,
        progress: 0,
      },
    ],
  }
}

export function useMultiplayerState(): UseMultiplayerState {
  const [lobby, setLobby] = useState<Lobby | null>(null)
  const [isHost, setIsHost] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const hostIdRef = useRef<string | null>(null)

  const teardown = useCallback(() => {
    if (channelRef.current) {
      void supabase?.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [])

  const applyLobbyRow = useCallback(
    (row: { code: string; host_id: string; variant: MultiplayerVariant; phase: Lobby['phase'] }) => {
      setLobby((prev) =>
        prev
          ? { ...prev, variant: row.variant, phase: row.phase, hostId: row.host_id }
          : prev,
      )
    },
    [],
  )

  const createLobby = useCallback(
    async (variant: MultiplayerVariant, name: string) => {
      const code = Math.random().toString(36).slice(2, 7).toUpperCase()
      const hostId = `host_${code}`
      hostIdRef.current = hostId
      const newLobby = emptyLobby(code, name, variant, hostId)
      if (!isMultiplayerEnabled || !supabase) {
        setIsHost(true)
        setLobby(newLobby)
        return
      }
      const { error: insertError } = await supabase
        .from('lobbies')
        .insert({ code, host_id: hostId, variant })
      if (insertError) {
        console.error('Failed to register lobby', insertError)
        throw new Error('Could not create lobby. Please try again.')
      }
      const channel = supabase.channel(`lobby:${code}`)
      channelRef.current = channel
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<MultiplayerParticipant>()
        const participants = Object.values(state).flat()
        setLobby((prev) =>
          prev ? { ...prev, participants: participants.length ? participants : prev.participants } : prev,
        )
      })
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lobbies', filter: `code=eq.${code}` },
        (payload: RealtimePostgresChangesPayload<{ code: string; host_id: string; variant: MultiplayerVariant; phase: Lobby['phase'] }>) => {
          if (payload.new) applyLobbyRow(payload.new as any)
        },
      )
      await channel.subscribe()
      setIsHost(true)
      setLobby(newLobby)
    },
    [applyLobbyRow],
  )

  const joinLobby = useCallback(
    async (code: string, name: string) => {
      const normalized = code.toUpperCase()
      if (!isMultiplayerEnabled || !supabase) {
        // Mock mode has no server to verify against, so allow local testing.
        const participant: MultiplayerParticipant = {
          id: `guest_${normalized}_${name}`,
          name,
          score: 0,
          alive: true,
          sequence: generateSequence(4),
          progress: 0,
        }
        const newLobby = emptyLobby(normalized, name, 'score', `host_${normalized}`)
        newLobby.participants = [participant]
        setIsHost(false)
        setLobby(newLobby)
        return
      }
      // Invite-only: the lobby must exist (created and shared) before joining.
      const { data: existing, error: lookupError } = await supabase
        .from('lobbies')
        .select('code, host_id, variant, phase')
        .eq('code', normalized)
        .maybeSingle()
      if (lookupError) {
        console.error('Failed to look up lobby', lookupError)
        throw new Error('Could not verify lobby. Please try again.')
      }
      if (!existing) {
        throw new Error('Lobby not found. Ask the host to share their invite link.')
      }
      const channel = supabase.channel(`lobby:${normalized}`)
      channelRef.current = channel
      const participant: MultiplayerParticipant = {
        id: `guest_${normalized}_${name}`,
        name,
        score: 0,
        alive: true,
        sequence: generateSequence(4),
        progress: 0,
      }
      channel.on('presence', { event: 'join' }, () => {
        void channel.track(participant)
      })
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lobbies', filter: `code=eq.${normalized}` },
        (payload: RealtimePostgresChangesPayload<{ code: string; host_id: string; variant: MultiplayerVariant; phase: Lobby['phase'] }>) => {
          if (payload.new) applyLobbyRow(payload.new as any)
        },
      )
      await channel.subscribe()
      void channel.track(participant)
      setIsHost(false)
      setLobby((prev) =>
        prev
          ? { ...prev, participants: [...prev.participants, participant] }
          : emptyLobby(normalized, name, existing.variant, existing.host_id),
      )
    },
    [applyLobbyRow],
  )

  const leaveLobby = useCallback(() => {
    teardown()
    setIsHost(false)
    hostIdRef.current = null
    setLobby(null)
  }, [teardown])

  const startGame = useCallback(() => {
    setLobby((prev) =>
      prev ? { ...prev, phase: 'prestart' } : prev,
    )
    setTimeout(() => {
      setLobby((prev) =>
        prev && prev.phase === 'prestart' ? { ...prev, phase: 'playing' } : prev,
      )
    }, 9000)
  }, [])

  const updateVariant = useCallback(
    async (variant: MultiplayerVariant) => {
      if (!lobby) return
      if (!isMultiplayerEnabled || !supabase) {
        setLobby((prev) => (prev ? { ...prev, variant } : prev))
        return
      }
      const { error } = await supabase
        .from('lobbies')
        .update({ variant })
        .eq('code', lobby.code)
      if (error) {
        console.error('Failed to update lobby variant', error)
        throw new Error('Could not change game mode. Please try again.')
      }
      // Optimistic update; Realtime will confirm.
      setLobby((prev) => (prev ? { ...prev, variant } : prev))
    },
    [lobby],
  )

  useEffect(() => teardown, [teardown])

  // Default mockup mode to true for local testing without Supabase, as requested.
  // Can be controlled via VITE_MOCK_MODE environment variable.
  const isMockMode = import.meta.env.VITE_MOCK_MODE !== 'false'

  return {
    enabled: isMockMode || isMultiplayerEnabled,
    lobby,
    isHost,
    createLobby,
    joinLobby,
    leaveLobby,
    startGame,
    updateVariant,
  }
}
