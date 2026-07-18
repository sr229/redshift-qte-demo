import type { Telemetry } from '../lib/telemetry'

interface TelemetryChartProps {
  telemetry: Telemetry
  className?: string
}

const W = 720
const H = 360
const PAD = { top: 28, right: 24, bottom: 40, left: 44 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

const AXIS = '#949494'
const GRID = '#2a2a2a'
const WPM_COLOR = '#3ad07a'
const SCATTER_COLOR = '#5ab0ff'

function niceMax(value: number): number {
  if (value <= 0) return 1
  const pow = Math.pow(10, Math.floor(Math.log10(value)))
  const n = value / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * pow
}

/** Evenly spaced tick values across [0, max] (inclusive). */
function ticks(max: number, count = 4): number[] {
  const out: number[] = []
  for (let i = 0; i <= count; i += 1) out.push((max / count) * i)
  return out
}

/**
 * Unified telemetry chart combining three correlated views of the session in a
 * single SVG:
 *   - top:    WPM-over-time line chart (green) with score markers (gold)
 *   - middle: WPM (x) vs Accuracy (y) scatter plot (blue)
 *   - bottom:  WPM distribution histogram (green)
 * All three share the same WPM axis scale so correlations are visually aligned.
 */
export default function TelemetryChart({ telemetry, className }: TelemetryChartProps) {
  const samples = telemetry.samples
  const pts = samples.filter((s) => s.wpm > 0)
  const hasData = pts.length > 0

  const maxWpm = niceMax(Math.max(1, ...pts.map((s) => s.wpm)))
  const maxT = niceMax(Math.max(1, ...pts.map((s) => s.t)))

  // Three equal-height bands within the plot area.
  const bandH = PLOT_H / 3
  const yTop = PAD.top
  const yMid = PAD.top + bandH
  const yBot = PAD.top + bandH * 2

  const xForT = (t: number) => PAD.left + (maxT > 0 ? (t / maxT) * PLOT_W : 0)
  const xForWpm = (w: number) => PAD.left + (w / maxWpm) * PLOT_W
  const yForWpm = (w: number, top: number) => top + bandH - (w / maxWpm) * bandH
  // Accuracy is in [0, 1]; scale it to the middle band's height.
  const yForAccuracy = (a: number) => yMid + bandH - a * bandH

  return (
    <div className={['w-full', className ?? ''].join(' ')}>
      <h3 className="mb-2 font-pixel text-sm text-retro-text">Performance Graph</h3>
      {!hasData ? (
        <p className="font-pixel text-[10px] text-retro-muted">
          Complete a sequence to start collecting chart data.
        </p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Unified telemetry chart">
          {/* Shared WPM gridlines + left axis (applies to all three bands) */}
          {ticks(maxWpm, 4).map((v, i) => {
            const yTopBand = yForWpm(v, yTop)
            const yMidBand = yForWpm(v, yMid)
            const yBotBand = yForWpm(v, yBot)
            return (
              <g key={i}>
                <line x1={PAD.left} y1={yTopBand} x2={W - PAD.right} y2={yTopBand} stroke={GRID} strokeWidth={1} />
                <line x1={PAD.left} y1={yMidBand} x2={W - PAD.right} y2={yMidBand} stroke={GRID} strokeWidth={1} />
                <line x1={PAD.left} y1={yBotBand} x2={W - PAD.right} y2={yBotBand} stroke={GRID} strokeWidth={1} />
                <text x={PAD.left - 6} y={yBotBand + 3} textAnchor="end" fontSize={9} fill={AXIS}>
                  {v}
                </text>
              </g>
            )
          })}

          {/* Band separators + labels */}
          <line x1={PAD.left} y1={yMid} x2={W - PAD.right} y2={yMid} stroke={AXIS} strokeWidth={1} strokeDasharray="3 3" />
          <line x1={PAD.left} y1={yBot} x2={W - PAD.right} y2={yBot} stroke={AXIS} strokeWidth={1} strokeDasharray="3 3" />
          <text x={PAD.left} y={yTop + 12} fontSize={9} fill={WPM_COLOR}>WPM over time</text>
          <text x={PAD.left} y={yMid + 12} fontSize={9} fill={SCATTER_COLOR}>WPM (x) vs Accuracy (y)</text>
          <text x={PAD.left} y={yBot + 12} fontSize={9} fill={WPM_COLOR}>WPM distribution</text>

          {/* Top band: WPM line + score markers over time */}
          {pts.length > 1 && (
            <polyline
              points={pts.map((s) => `${xForT(s.t)},${yForWpm(s.wpm, yTop)}`).join(' ')}
              fill="none"
              stroke={WPM_COLOR}
              strokeWidth={2}
            />
          )}
          {pts.map((s, i) => (
            <circle key={`top-${i}`} cx={xForT(s.t)} cy={yForWpm(s.wpm, yTop)} r={3} fill={WPM_COLOR} />
          ))}

          {/* Middle band: scatter (WPM x vs Accuracy y) */}
          {pts.map((s, i) => (
            <circle key={`sc-${i}`} cx={xForWpm(s.wpm)} cy={yForAccuracy(s.accuracy)} r={3.5} fill={SCATTER_COLOR} opacity={0.85} />
          ))}

          {/* Bottom band: WPM histogram */}
          {(() => {
            const bins = 6
            const counts = new Array(bins).fill(0)
            pts.forEach((s) => {
              const idx = Math.min(bins - 1, Math.floor((s.wpm / maxWpm) * bins))
              counts[idx] += 1
            })
            const maxCount = Math.max(1, ...counts)
            const binW = PLOT_W / bins
            return counts.map((c, i) => {
              const h = (c / maxCount) * bandH
              const x = PAD.left + i * binW + binW * 0.15
              const w = binW * 0.7
              const y = yBot + bandH - h
              return <rect key={`h-${i}`} x={x} y={y} width={w} height={h} rx={2} fill={WPM_COLOR} opacity={0.85} />
            })
          })()}

          {/* X axis */}
          <line x1={PAD.left} y1={PAD.top + PLOT_H} x2={W - PAD.right} y2={PAD.top + PLOT_H} stroke={AXIS} strokeWidth={1} />
          <text x={W - PAD.right} y={H - 12} textAnchor="end" fontSize={9} fill={AXIS}>
            time →
          </text>
          <text x={PAD.left} y={H - 12} fontSize={9} fill={AXIS}>
            WPM (left axis)
          </text>

          {/* Legend */}
          <g transform={`translate(${W - PAD.right - 220}, ${PAD.top - 18})`}>
            <rect x={0} y={-8} width={10} height={10} rx={2} fill={WPM_COLOR} />
            <text x={14} y={1} fontSize={9} fill={AXIS}>WPM</text>
            <circle cx={75} cy={-3} r={4} fill={SCATTER_COLOR} />
            <text x={84} y={1} fontSize={9} fill={AXIS}>Accuracy</text>
          </g>
        </svg>
      )}
    </div>
  )
}
