import type { EngineState } from './types'
import type { MultiplayerParticipant, MultiplayerVariant } from './multiplayer'

/**
 * Decides whether the player is eliminated given engine state and game variant.
 * In elimination mode, a player is eliminated once their engine phase becomes gameover.
 */
export function isPlayerEliminated(state: EngineState, variant: MultiplayerVariant): boolean {
  return variant === 'elimination' && state.phase === 'gameover'
}

/**
 * Computes whether the round should end for timer-like variants.
 * All participants must be finished and there must be at least one participant.
 */
export function shouldEndTimerRound(participants: MultiplayerParticipant[]): boolean {
  return participants.length > 0 && participants.every((p) => p.finished)
}

/**
 * Computes whether the local player has won an elimination match.
 * The match is won if the number of alive participants is <= 1,
 * and the local player is still alive.
 */
export function hasLocalPlayerWonElimination(
  participants: MultiplayerParticipant[],
  localParticipantId: string | null
): boolean {
  const localId = localParticipantId ?? 'local'
  const local = participants.find((p) => p.id === localId)
  if (local && !local.alive) {
    return false
  }
  const aliveCount = participants.filter((p) => p.alive).length
  return aliveCount <= 1
}

/**
 * Builds the MultiplayerParticipant display/broadcast object from EngineState.
 */
export function buildParticipant(
  state: EngineState,
  participantId: string | null,
  name: string,
  variant: MultiplayerVariant
): MultiplayerParticipant {
  const eliminated = isPlayerEliminated(state, variant)
  return {
    id: participantId ?? 'local',
    name,
    score: state.score,
    alive: !eliminated,
    ready: true,
    finished: eliminated || state.phase === 'gameover',
    sequence: state.sequence,
    progress: state.progress,
  }
}
