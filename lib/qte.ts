import type { QteDirection, QteSequence } from './types'

const DIRECTIONS: QteDirection[] = ['up', 'down', 'left', 'right']

let counter = 0
function nextId(): string {
  counter += 1
  return `seq_${Date.now().toString(36)}_${counter}`
}

/** Generate a random QTE sequence of the given length. */
export function generateSequence(length: number): QteSequence {
  const steps: QteDirection[] = []
  for (let i = 0; i < length; i += 1) {
    steps.push(DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)])
  }
  return { id: nextId(), steps }
}

/**
 * Compute the per-sequence time limit (ms) for endless mode.
 * Starts at 5000ms and shrinks by 250ms per completed sequence, with a 1500ms floor.
 */
export function endlessTimeLimit(completed: number): number {
  return Math.max(1500, 5000 - completed * 250)
}

/** Map a keyboard event to a QTE direction, or null if it isn't a directional key. */
export function keyToDirection(key: string): QteDirection | null {
  switch (key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      return 'up'
    case 'ArrowDown':
    case 's':
    case 'S':
      return 'down'
    case 'ArrowLeft':
    case 'a':
    case 'A':
      return 'left'
    case 'ArrowRight':
    case 'd':
    case 'D':
      return 'right'
    default:
      return null
  }
}
