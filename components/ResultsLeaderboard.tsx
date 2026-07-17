import { PixelCard, PixelTable, PixelButton, PixelBadge } from '@pxlkit/ui-kit'
import { PxlKitIcon } from '@pxlkit/core'
import { Home } from '@pxlkit/ui'
import type { MultiplayerParticipant } from '../lib/types'

interface ResultsLeaderboardProps {
  participants: MultiplayerParticipant[]
  onHome: () => void
}

export default function ResultsLeaderboard({ participants, onHome }: ResultsLeaderboardProps) {
  const ranked = [...participants]
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ ...p, rank: i + 1 }))

  return (
    <PixelCard title="Results" tone="neutral" className="w-full max-w-lg">
      <PixelTable
        data={ranked}
        columns={[
          { key: 'rank', header: '#', align: 'left' },
          { key: 'name', header: 'Runner' },
          {
            key: 'alive',
            header: 'Status',
            render: (row) =>
              row.alive ? (
                <PixelBadge tone="green">alive</PixelBadge>
              ) : (
                <PixelBadge tone="red">eliminated</PixelBadge>
              ),
          },
          {
            key: 'score',
            header: 'Score',
            align: 'right',
            render: (row) => <span className="font-mono text-retro-green">{row.score}</span>,
          },
        ]}
      />
      <div className="mt-4 flex justify-end">
        <PixelButton
          tone="neutral"
          variant="outline"
          iconLeft={<PxlKitIcon icon={Home} size={16} />}
          onClick={onHome}
        >
          Main Menu
        </PixelButton>
      </div>
    </PixelCard>
  )
}
