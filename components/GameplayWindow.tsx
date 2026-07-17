import { PixelCard, PixelProgress, PixelBadge } from '@pxlkit/ui-kit'
import { PxlKitIcon } from '@pxlkit/core'
import { Clock, SparkleSmall } from '@pxlkit/ui'
import type { QteDirection, SingleplayerState } from '../lib/types'

const ARROW: Record<QteDirection, string> = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
}

interface GameplayWindowProps {
  state: SingleplayerState
}

export default function GameplayWindow({ state }: GameplayWindowProps) {
  const { sequence, progress, timeLeftMs, mode, score } = state
  const totalMs = mode === 'timer' ? 30_000 : 5000
  const pct = Math.max(0, Math.min(100, (timeLeftMs / totalMs) * 100))

  return (
    <PixelCard tone="neutral" className="w-full max-w-xl">
      <div className="flex items-center justify-between">
        <PixelBadge tone="green" iconLeft={<PxlKitIcon icon={SparkleSmall} size={14} />}>
          Score {score}
        </PixelBadge>
        <PixelBadge tone="cyan" iconLeft={<PxlKitIcon icon={Clock} size={14} />}>
          {mode === 'timer' ? 'Timer Mode' : 'Endless Mode'}
        </PixelBadge>
      </div>

      <PixelProgress value={pct} tone="green" label="Time remaining" />

      <div className="flex justify-center gap-3 py-2">
        {sequence?.steps.map((step, i) => (
          <span
            key={i}
            className={[
              'flex h-16 w-16 items-center justify-center rounded-lg text-3xl font-mono',
              i < progress
                ? 'bg-retro-green/30 text-retro-green'
                : i === progress
                  ? 'bg-retro-surface text-retro-green ring-2 ring-retro-green'
                  : 'bg-retro-surface/40 text-retro-muted',
            ].join(' ')}
          >
            {ARROW[step]}
          </span>
        ))}
      </div>

      <p className="text-center text-sm text-retro-muted">
        Use the arrow keys (or WASD) to enter the sequence.
      </p>
    </PixelCard>
  )
}
