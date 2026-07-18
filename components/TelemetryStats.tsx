import type { Telemetry } from '../lib/telemetry'

interface TelemetryStatsProps {
  telemetry: Telemetry
  /** Optional title shown above the grid. */
  title?: string
  className?: string
}

function formatWpm(wpm: number): string {
  return wpm > 0 ? wpm.toFixed(0) : '—'
}

function formatAccuracy(accuracy: number): string {
  return `${(accuracy * 100).toFixed(0)}%`
}

/**
 * Shared read-only display of gameplay telemetry (WPM, accuracy, combos, etc.).
 * Used by both the singleplayer results screen and the multiplayer HUD.
 */
export default function TelemetryStats({ telemetry, title, className }: TelemetryStatsProps) {
  const stats: Array<{ label: string; value: string }> = [
    { label: 'Avg WPM', value: formatWpm(telemetry.averageWpm) },
    { label: 'High WPM', value: formatWpm(telemetry.highWpm) },
    { label: 'Low WPM', value: formatWpm(telemetry.lowWpm) },
    { label: 'Accuracy', value: formatAccuracy(telemetry.accuracy) },
    { label: 'Max Combo', value: `${telemetry.maxCombo}` },
    { label: 'Avg Len', value: telemetry.avgSequenceLength > 0 ? telemetry.avgSequenceLength.toFixed(1) : '—' },
    { label: 'Sequences', value: `${telemetry.sequencesCompleted}` },
    { label: 'Inputs', value: `${telemetry.totalInputs}` },
  ]

  return (
    <div className={['w-full', className ?? ''].join(' ')}>
      {title && (
        <h3 className="mb-2 font-pixel text-sm text-retro-text">{title}</h3>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center rounded-lg border border-retro-border/60 bg-retro-bg/40 px-2 py-2"
          >
            <span className="font-mono text-lg text-retro-green">{stat.value}</span>
            <span className="font-pixel text-[9px] uppercase tracking-wide text-retro-muted">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
