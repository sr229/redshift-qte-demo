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
  /** Average length (number of steps) of completed sequences this session. */
  avgSequenceLength: number
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
  /** Length (number of steps) of the completed sequence. */
  length: number
}

const KEYSTROKES_PER_WORD = 5

/**
 * Cap on retained per-sequence samples. Endless sessions can run for thousands of
 * sequences; keeping every sample would blow up memory and break `Math.max(...spread)`
 * in the snapshot. Once the cap is exceeded, older samples are dropped (ring-buffer
 * style) so the chart stays responsive and the spread calls stay safe.
 */
export const MAX_SAMPLES = 500

export function createEmptyTelemetry(): Telemetry {
  return {
    totalInputs: 0,
    correctInputs: 0,
    wrongInputs: 0,
    sequencesCompleted: 0,
    avgSequenceLength: 0,
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
  /** Length of the sequence currently in progress (set by the game loop). */
  private currentSeqLength = 0
  /** Sum of completed-sequence lengths, for computing the running average. */
  private totalSeqLength = 0

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
    this.currentSeqLength = 0
    this.totalSeqLength = 0
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

  /** Record the length (number of steps) of the sequence currently in progress. */
  setSequenceLength(length: number): void {
    this.currentSeqLength = length
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
    this.totalSeqLength += this.currentSeqLength
    this.samples.push({
      t: this.elapsedMs,
      score: this.score,
      wpm,
      accuracy: this.totalInputs > 0 ? this.correctInputs / this.totalInputs : 1,
      maxCombo: this.maxCombo,
      length: this.currentSeqLength,
    })
    // Cap retained samples so long endless sessions stay bounded and the
    // spread-based aggregations in getSnapshot() don't overflow the call stack.
    if (this.samples.length > MAX_SAMPLES) {
      this.samples.splice(0, this.samples.length - MAX_SAMPLES)
    }
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

    let highWpm = 0
    let lowWpm = 0
    for (const w of this.wpmSamples) {
      if (w > highWpm) highWpm = w
      if (lowWpm === 0 || w < lowWpm) lowWpm = w
    }

    const accuracy =
      this.totalInputs > 0 ? this.correctInputs / this.totalInputs : 1

    const avgSequenceLength =
      this.sequencesCompleted > 0
        ? this.totalSeqLength / this.sequencesCompleted
        : 0

    return {
      totalInputs: this.totalInputs,
      correctInputs: this.correctInputs,
      wrongInputs: this.wrongInputs,
      sequencesCompleted: this.sequencesCompleted,
      avgSequenceLength,
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
