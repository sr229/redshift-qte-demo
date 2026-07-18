/**
 * Framework-agnostic telemetry tracking for QTE gameplay.
 *
 * Tracks input accuracy, combos, and WPM (words-per-minute) metrics that are
 * shared between singleplayer and multiplayer sessions. A "word" is the
 * standard typing definition of 5 keystrokes.
 *
 * This module is intentionally free of React so it can be reused by any game
 * loop (singleplayer timer, multiplayer realtime, tests, etc.).
 */

/** A single point-in-time view of the session's telemetry. */
export interface Telemetry {
  /** Total keystrokes registered (correct + wrong). */
  totalInputs: number
  /** Keystrokes that matched the expected direction. */
  correctInputs: number
  /** Keystrokes that did not match the expected direction. */
  wrongInputs: number
  /** Number of full sequences completed this session. */
  sequencesCompleted: number
  /** Longest unbroken streak of correct inputs. */
  maxCombo: number
  /** Total active playing time in milliseconds. */
  elapsedMs: number
  /** WPM of the in-progress sequence so far. */
  currentWpm: number
  /** Session-wide average WPM (correct keystrokes / 5 / minutes). */
  averageWpm: number
  /** Highest per-sequence WPM observed this session. */
  highWpm: number
  /** Lowest per-sequence WPM observed this session. */
  lowWpm: number
  /** Fraction of correct inputs in [0, 1]. */
  accuracy: number
  /** Time-series samples captured per completed sequence. */
  samples: TelemetrySample[]
}

/** A single time-series data point captured during a session. */
export interface TelemetrySample {
  /** Elapsed playing time in milliseconds when the sample was taken. */
  t: number
  /** Cumulative score at the time of the sample. */
  score: number
  /** WPM for the sequence that was just completed. */
  wpm: number
  /** Accuracy up to this point, in [0, 1]. */
  accuracy: number
  /** Longest combo up to this point. */
  maxCombo: number
}

const KEYSTROKES_PER_WORD = 5

export function createEmptyTelemetry(): Telemetry {
  return {
    totalInputs: 0,
    correctInputs: 0,
    wrongInputs: 0,
    sequencesCompleted: 0,
    maxCombo: 0,
    elapsedMs: 0,
    currentWpm: 0,
    averageWpm: 0,
    highWpm: 0,
    lowWpm: 0,
    accuracy: 1,
    samples: [],
  }
}

/**
 * Stateful tracker that accumulates telemetry across a gameplay session.
 *
 * Call `start()` when the playing phase begins, `tick(now)` on each game-loop
 * update to keep elapsed time / current WPM fresh, `recordInput(correct, now)`
 * for every keystroke, and `recordSequenceComplete(now)` whenever a sequence is
 * finished. `stop(now)` freezes the clock at game over.
 */
export class TelemetryTracker {
  private totalInputs = 0
  private correctInputs = 0
  private wrongInputs = 0
  private sequencesCompleted = 0
  private combo = 0
  private maxCombo = 0
  private elapsedMs = 0
  private playingStartMs = 0
  private isPlaying = false
  private seqStartMs = 0
  private seqInputs = 0
  private wpmSamples: number[] = []
  private samples: TelemetrySample[] = []
  /** Cumulative score, supplied by the game loop via `setScore`. */
  private score = 0

  /** Begin (or restart) a session. Resets all accumulated metrics. */
  start(now: number = Date.now()): void {
    this.totalInputs = 0
    this.correctInputs = 0
    this.wrongInputs = 0
    this.sequencesCompleted = 0
    this.combo = 0
    this.maxCombo = 0
    this.elapsedMs = 0
    this.wpmSamples = []
    this.seqInputs = 0
    this.samples = []
    this.score = 0
    this.playingStartMs = now
    this.seqStartMs = now
    this.isPlaying = true
  }

  /** Freeze the playing clock (e.g. at game over). */
  stop(now: number = Date.now()): void {
    if (this.isPlaying) {
      this.elapsedMs += now - this.playingStartMs
      this.isPlaying = false
    }
  }

  /** Reset to a blank session without starting. */
  reset(): void {
    this.start(Date.now())
    this.stop(Date.now())
  }

  /** Keep elapsed time and current WPM up to date. Call from the game loop. */
  tick(now: number = Date.now()): void {
    if (!this.isPlaying) return
    this.elapsedMs = now - this.playingStartMs
  }

  /** Record a single keystroke. `correct` is whether it matched the expected direction. */
  recordInput(correct: boolean, now: number = Date.now()): void {
    this.totalInputs += 1
    if (correct) {
      this.correctInputs += 1
      this.combo += 1
      this.maxCombo = Math.max(this.maxCombo, this.combo)
      this.seqInputs += 1
    } else {
      this.wrongInputs += 1
      this.combo = 0
    }
    this.tick(now)
  }

  /** Update the cumulative score (called by the game loop when score changes). */
  setScore(score: number): void {
    this.score = score
  }

  /** Record that the current sequence was completed; starts measuring the next one. */
  recordSequenceComplete(now: number = Date.now()): void {
    this.sequencesCompleted += 1
    const seqTimeMs = now - this.seqStartMs
    let wpm = 0
    if (seqTimeMs > 0) {
      const minutes = seqTimeMs / 60_000
      wpm = this.seqInputs / KEYSTROKES_PER_WORD / minutes
      this.wpmSamples.push(wpm)
    }
    this.samples.push({
      t: this.elapsedMs + (now - this.playingStartMs),
      score: this.score,
      wpm,
      accuracy: this.totalInputs > 0 ? this.correctInputs / this.totalInputs : 1,
      maxCombo: this.maxCombo,
    })
    this.seqStartMs = now
    this.seqInputs = 0
  }

  /** Produce an immutable snapshot of the current telemetry. */
  getSnapshot(): Telemetry {
    const minutes = this.elapsedMs / 60_000
    const averageWpm =
      minutes > 0 ? this.correctInputs / KEYSTROKES_PER_WORD / minutes : 0

    let currentWpm = 0
    const seqTimeMs = this.isPlaying ? Date.now() - this.seqStartMs : 0
    if (seqTimeMs > 0) {
      const seqMinutes = seqTimeMs / 60_000
      currentWpm = this.seqInputs / KEYSTROKES_PER_WORD / seqMinutes
    }

    const highWpm = this.wpmSamples.length
      ? Math.max(...this.wpmSamples)
      : 0
    const lowWpm = this.wpmSamples.length
      ? Math.min(...this.wpmSamples)
      : 0

    const accuracy =
      this.totalInputs > 0 ? this.correctInputs / this.totalInputs : 1

    return {
      totalInputs: this.totalInputs,
      correctInputs: this.correctInputs,
      wrongInputs: this.wrongInputs,
      sequencesCompleted: this.sequencesCompleted,
      maxCombo: this.maxCombo,
      elapsedMs: this.elapsedMs,
      currentWpm,
      averageWpm,
      highWpm,
      lowWpm,
      accuracy,
      samples: [...this.samples],
    }
  }
}
