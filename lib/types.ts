export type GameMode = 'timer' | 'endless'

export type MultiplayerVariant = 'score' | 'elimination' | 'reaction'

export type GamePhase = 'idle' | 'playing' | 'gameover'

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
  /** Remaining time in milliseconds for the current sequence / round. */
  timeLeftMs: number
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
