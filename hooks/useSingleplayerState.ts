import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameMode, QteDirection, SingleplayerState } from '../lib/types'
import { endlessTimeLimit, generateSequence, keyToDirection } from '../lib/qte'

const TIMER_MODE_DURATION_MS = 30_000
const TIMER_MODE_SEQUENCE_LIMIT_MS = 5000
const SEQUENCE_LENGTH = 4

function createInitialState(mode: GameMode): SingleplayerState {
  return {
    phase: 'idle',
    mode,
    score: 0,
    sequence: null,
    progress: 0,
    timeLeftMs: mode === 'timer' ? TIMER_MODE_DURATION_MS : endlessTimeLimit(0),
    failed: false,
  }
}

export interface UseSingleplayerState {
  state: SingleplayerState
  start: (mode: GameMode) => void
  reset: () => void
}

export function useSingleplayerState(): UseSingleplayerState {
  const [state, setState] = useState<SingleplayerState>(() =>
    createInitialState('timer'),
  )

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const deadlineRef = useRef<number>(0)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const nextSequence = useCallback((mode: GameMode, completed: number) => {
    const limit =
      mode === 'timer' ? TIMER_MODE_SEQUENCE_LIMIT_MS : endlessTimeLimit(completed)
    setState((prev) => ({
      ...prev,
      sequence: generateSequence(SEQUENCE_LENGTH),
      progress: 0,
      failed: false,
      timeLeftMs: limit,
    }))
    deadlineRef.current = Date.now() + limit
  }, [])

  const endGame = useCallback(() => {
    clearTimer()
    setState((prev) => ({ ...prev, phase: 'gameover', sequence: null }))
  }, [clearTimer])

  const start = useCallback(
    (mode: GameMode) => {
      clearTimer()
      setState(createInitialState(mode))
      setState((prev) => ({ ...prev, phase: 'playing' }))
      nextSequence(mode, 0)
      deadlineRef.current = Date.now() + (mode === 'timer' ? TIMER_MODE_DURATION_MS : endlessTimeLimit(0))
      timerRef.current = setInterval(() => {
        const remaining = deadlineRef.current - Date.now()
        if (remaining <= 0) {
          if (mode === 'timer') {
            endGame()
          } else {
            // Endless: failing the timer eliminates the player.
            endGame()
          }
          return
        }
        setState((prev) => ({ ...prev, timeLeftMs: remaining }))
      }, 100)
    },
    [clearTimer, endGame, nextSequence],
  )

  const reset = useCallback(() => {
    clearTimer()
    setState(createInitialState('timer'))
  }, [clearTimer])

  const handleInput = useCallback(
    (direction: QteDirection) => {
      setState((prev) => {
        if (prev.phase !== 'playing' || !prev.sequence) return prev
        const expected = prev.sequence.steps[prev.progress]
        if (direction !== expected) {
          if (prev.mode === 'endless') {
            clearTimer()
            return { ...prev, phase: 'gameover', failed: true, sequence: null }
          }
          // Timer mode: a wrong input just resets the current sequence.
          return { ...prev, failed: true, progress: 0 }
        }
        const nextProgress = prev.progress + 1
        if (nextProgress >= prev.sequence.steps.length) {
          const newScore = prev.score + 1
          if (prev.mode === 'timer') {
            nextSequence('timer', newScore)
          } else {
            nextSequence('endless', newScore)
          }
          return { ...prev, score: newScore }
        }
        return { ...prev, progress: nextProgress, failed: false }
      })
    },
    [clearTimer, nextSequence],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const direction = keyToDirection(e.key)
      if (direction) handleInput(direction)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleInput])

  useEffect(() => clearTimer, [clearTimer])

  return { state, start, reset }
}
