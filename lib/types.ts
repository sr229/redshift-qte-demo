export type GameMode = 'timer' | 'endless'

export type MultiplayerVariant = 'score' | 'elimination' | 'reaction'

export type GamePhase = 'idle' | 'prestart' | 'playing' | 'gameover'

export type QteDirection = 'up' | 'down' | 'left' | 'right'

export interface QteSequence {
  id: string
  steps: QteDirection[]
}

export interface SingleplayerState {
  phase: GamePhase
  mode: GameMode
  score: number
  sequence: QteSequence | null
  /** Index of the next step the player must input. */
  progress: number
  /** Remaining time in milliseconds for the active phase. */
  timeLeftMs: number
  /** Remaining time in milliseconds for the prestart countdown (starts at 9s). */
  prestartTimeLeftMs: number
  /** The selected initial duration in seconds (5, 10, or 15). */
  limitSeconds: number
  /** Whether the most recent input was wrong. */
  failed: boolean
}

export interface MultiplayerParticipant {
  id: string
  name: string
  score: number
  alive: boolean
  /** Current sequence assigned to this participant, if any. */
  sequence: QteSequence | null
  /** Progress within the current sequence. */
  progress: number
}

export interface Lobby {
  id: string
  code: string
  hostId: string
  participants: MultiplayerParticipant[]
  variant: MultiplayerVariant
  phase: GamePhase
}
