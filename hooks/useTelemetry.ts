import { useCallback, useRef, useState } from 'react'
import { TelemetryTracker, createEmptyTelemetry } from '../lib/telemetry'
import type { Telemetry } from '../lib/telemetry'

export interface UseTelemetry {
  /** Current telemetry snapshot. */
  telemetry: Telemetry
  /** Begin a fresh session. */
  start: () => void
  /** Freeze the clock (call at game over). */
  stop: () => void
  /** Advance the clock; call from the game loop to keep WPM fresh. */
  tick: () => void
  /** Record a keystroke. */
  recordInput: (correct: boolean) => void
  /** Record a completed sequence. */
  recordSequenceComplete: () => void
  /** Reset to a blank session. */
  reset: () => void
}

/**
 * Shared telemetry hook used by both singleplayer and multiplayer game loops.
 * Wraps the framework-agnostic {@link TelemetryTracker} and re-renders on each
 * update so consumers can display live stats.
 */
export function useTelemetry(): UseTelemetry {
  const trackerRef = useRef<TelemetryTracker | null>(null)
  if (!trackerRef.current) {
    trackerRef.current = new TelemetryTracker()
  }

  const [telemetry, setTelemetry] = useState<Telemetry>(createEmptyTelemetry())

  const sync = useCallback(() => {
    setTelemetry(trackerRef.current!.getSnapshot())
  }, [])

  const start = useCallback(() => {
    trackerRef.current!.start()
    sync()
  }, [sync])

  const stop = useCallback(() => {
    trackerRef.current!.stop()
    sync()
  }, [sync])

  const tick = useCallback(() => {
    trackerRef.current!.tick()
    sync()
  }, [sync])

  const recordInput = useCallback(
    (correct: boolean) => {
      trackerRef.current!.recordInput(correct)
      sync()
    },
    [sync],
  )

  const recordSequenceComplete = useCallback(() => {
    trackerRef.current!.recordSequenceComplete()
    sync()
  }, [sync])

  const reset = useCallback(() => {
    trackerRef.current!.reset()
    sync()
  }, [sync])

  return {
    telemetry,
    start,
    stop,
    tick,
    recordInput,
    recordSequenceComplete,
    reset,
  }
}
