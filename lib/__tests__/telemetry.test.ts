import { describe, it, expect } from 'vitest'
import { TelemetryTracker, createEmptyTelemetry } from '../telemetry'

describe('createEmptyTelemetry', () => {
  it('returns a zeroed snapshot with perfect accuracy', () => {
    const t = createEmptyTelemetry()
    expect(t.totalInputs).toBe(0)
    expect(t.correctInputs).toBe(0)
    expect(t.wrongInputs).toBe(0)
    expect(t.accuracy).toBe(1)
    expect(t.samples).toEqual([])
  })
})

describe('TelemetryTracker', () => {
  it('tracks correct/wrong inputs and the max combo', () => {
    const tr = new TelemetryTracker()
    tr.start(0)
    tr.recordInput(true, 0)
    tr.recordInput(true, 10)
    tr.recordInput(false, 20)
    const s = tr.getSnapshot()
    expect(s.totalInputs).toBe(3)
    expect(s.correctInputs).toBe(2)
    expect(s.wrongInputs).toBe(1)
    expect(s.maxCombo).toBe(2)
    expect(s.accuracy).toBeCloseTo(2 / 3)
  })

  it('computes elapsed time via tick and freezes on stop', () => {
    const tr = new TelemetryTracker()
    tr.start(1000)
    tr.tick(1500)
    expect(tr.getSnapshot().elapsedMs).toBe(500)
    tr.stop(2000) // adds 2000-1000 = 1000 to the running 500
    tr.tick(3000) // ignored after stop
    expect(tr.getSnapshot().elapsedMs).toBe(1500)
  })

  it('records sequence completion and derives KPM + average length', () => {
    const tr = new TelemetryTracker()
    tr.start(0)
    tr.setSequenceLength(5)
    tr.recordInput(true, 0)
    tr.recordInput(true, 1000) // 2 inputs over 1s => 120 kpm
    tr.recordSequenceComplete(1000)
    const s = tr.getSnapshot()
    expect(s.sequencesCompleted).toBe(1)
    expect(s.avgSequenceLength).toBe(5)
    expect(s.highKpm).toBeCloseTo(120)
    expect(s.lowKpm).toBeCloseTo(120)
    expect(s.samples).toHaveLength(1)
  })

  it('resets all state when start() is called again', () => {
    const tr = new TelemetryTracker()
    tr.start(0)
    tr.recordInput(true, 0)
    tr.start(0)
    expect(tr.getSnapshot().totalInputs).toBe(0)
  })

  it('caps retained samples for very long sessions', () => {
    const tr = new TelemetryTracker()
    tr.start(0)
    for (let i = 0; i < 600; i += 1) {
      tr.setSequenceLength(1)
      tr.recordInput(true, i)
      tr.recordSequenceComplete(i + 1)
    }
    expect(tr.getSnapshot().samples.length).toBeLessThanOrEqual(500)
  })
})
