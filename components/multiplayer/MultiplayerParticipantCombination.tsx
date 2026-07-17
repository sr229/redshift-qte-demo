import type { QteDirection } from '../../lib/types'

const ARROW: Record<QteDirection, string> = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
}

interface MultiplayerParticipantCombinationProps {
  steps: QteDirection[]
  progress: number
}

export default function MultiplayerParticipantCombination({
  steps,
  progress,
}: MultiplayerParticipantCombinationProps) {
  return (
    <div className="flex gap-1">
      {steps.map((step, i) => (
        <span
          key={i}
          className={[
            'flex h-8 w-8 items-center justify-center rounded-md text-lg font-mono',
            i < progress
              ? 'bg-retro-green/30 text-retro-green'
              : 'bg-retro-surface/40 text-retro-muted',
          ].join(' ')}
        >
          {ARROW[step]}
        </span>
      ))}
    </div>
  )
}
