import { PixelAvatar, PixelBadge, PixelCard } from '@pxlkit/ui-kit'
import { PxlKitIcon } from '@pxlkit/core'
import { Clock, SparkleSmall } from '@pxlkit/ui'
import type { Lobby, MultiplayerParticipant, QteDirection } from '../../lib/types'

interface MultiplayerGameplayProps {
  lobby: Lobby
  onLeave: () => void
}

const ARROW: Record<QteDirection, string> = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
}

const DEFAULT_STEPS: QteDirection[] = ['up', 'right', 'down', 'down', 'down']

function fillParticipants(participants: MultiplayerParticipant[]): MultiplayerParticipant[] {
  const target = 10
  const pool = ['Nova Rust', 'Turbo Finch', 'Axel Moon', 'Riven Byte', 'Cinder Vale']
  const list = [...participants]
  while (list.length < target) {
    const i = list.length
    list.push({
      id: `placeholder-${i}`,
      name: pool[i % pool.length],
      score: 12500,
      alive: i < 7,
      sequence: null,
      progress: 0,
    })
  }
  return list
}

function ParticipantRow({ participant }: { participant: MultiplayerParticipant }) {
  const steps = participant.sequence?.steps ?? DEFAULT_STEPS
  return (
    <div className="rounded-xl border border-black/20 bg-[#d9d9d9] p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <PixelAvatar name={participant.name} size="sm" tone={participant.alive ? 'green' : 'neutral'} />
        <PixelBadge tone="neutral" className="border border-black text-black">
          {participant.alive ? participant.progress + 344 : 'DEAD'}
        </PixelBadge>
        <PixelBadge tone="neutral" className="border border-black text-black">
          {Math.max(12_500, participant.score)}
        </PixelBadge>
      </div>
      <div className="flex gap-1">
        {steps.slice(0, 5).map((step, i) => (
          <span
            key={`${participant.id}-${i}`}
            className={[
              'flex h-7 w-7 items-center justify-center border-2 text-sm',
              i === participant.progress && participant.alive
                ? 'border-black bg-white text-black'
                : 'border-black/20 bg-[#ececec] text-black/40',
            ].join(' ')}
          >
            {ARROW[step]}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function MultiplayerGameplay({ lobby, onLeave }: MultiplayerGameplayProps) {
  const list = fillParticipants(lobby.participants)
  const local = list[0]
  const activeSequence = local?.sequence?.steps ?? DEFAULT_STEPS
  const playersRemaining = list.filter((p) => p.alive).length

  return (
    <main className="min-h-[72vh] w-full bg-[#eee]">
      <div className="grid min-h-[72vh] grid-cols-1 md:grid-cols-[340px_1fr]">
        <aside className="border-r-2 border-black bg-[#d9d9d9] p-4">
          <div className="max-h-[70vh] space-y-3 overflow-auto pr-1">
            {list.map((participant) => (
              <ParticipantRow key={participant.id} participant={participant} />
            ))}
          </div>
          <div className="mt-4 rounded-md bg-[#747272] p-3 text-center text-sm text-white">
            Live Multiplayer Feed
          </div>
        </aside>

        <section className="flex flex-col items-center justify-center gap-4 px-4 py-8">
          <div className="w-full max-w-md rounded-full border-2 border-black bg-[#d9d9d9] px-4 py-1 text-center text-sm text-black">
            {playersRemaining} players remaining!
          </div>

          <PixelCard tone="neutral" className="w-full max-w-md border-2 border-black bg-[#d9d9d9]">
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-2">
                {activeSequence.slice(0, 5).map((step, i) => (
                  <span
                    key={`active-${i}`}
                    className={[
                      'flex h-12 w-12 items-center justify-center border-2 text-2xl',
                      i === (local?.progress ?? 0)
                        ? 'border-black bg-white text-black'
                        : 'border-black/20 bg-[#ececec] text-black/40',
                    ].join(' ')}
                  >
                    {ARROW[step]}
                  </span>
                ))}
              </div>

              <div className="h-2 w-40 rounded-full border border-black bg-[#9c9c9c]" />

              <p className="text-center text-xs text-black">
                Use the directional keys or W/A/S/D on your keyboard!
              </p>
            </div>
          </PixelCard>

          <div className="flex items-center gap-2 rounded-full border-2 border-black bg-[#d9d9d9] px-5 py-1 text-lg text-black">
            <PxlKitIcon icon={Clock} size={16} />
            00:03.1
          </div>

          <button
            type="button"
            onClick={onLeave}
            className="rounded-full border-2 border-black bg-[#d9d9d9] px-5 py-1 text-sm text-black hover:bg-[#e4e4e4]"
          >
            Leave Lobby
          </button>

          <div className="flex items-center gap-2 text-sm text-black/70">
            <PxlKitIcon icon={SparkleSmall} size={14} />
            Syncing match state
          </div>
        </section>
      </div>
    </main>
  )
}
