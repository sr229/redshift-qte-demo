import { useState } from 'react'
import {
  PixelHeroSection,
  PixelButton,
  PixelSegmented,
  PixelCard,
  PixelAvatar,
  PixelBadge,
} from '@pxlkit/ui-kit'
import { PxlKitIcon } from '@pxlkit/core'
import { Play, Clock, SparkleSmall, Home as HomeIcon, ArrowRight } from '@pxlkit/ui'
import type { GameMode } from '../lib/types'
import { useSingleplayerState } from '../hooks/useSingleplayerState'
import { useMultiplayerState } from '../hooks/useMultiplayerState'
import GameplayWindow from '../components/GameplayWindow'
import GameOverScreen from '../components/GameOverScreen'
import PrestartLobby from '../components/PrestartLobby'
import ResultsLeaderboard from '../components/ResultsLeaderboard'
import type { MultiplayerParticipant } from '../lib/types'
import MultiplayerGameplay from '../components/multiplayer/MultiplayerGameplay'

type Screen = 'menu' | 'single' | 'multi'

const MODE_OPTIONS = [
  { value: 'timer', label: 'TIMER' },
  { value: 'endless', label: 'ENDLESS' },
]

const WINDOW_OPTIONS = [
  { value: '5', label: '5s' },
  { value: '10', label: '10s' },
  { value: '15', label: '15s' },
]

const DEMO_NAME_POOL = [
  'Nice Nature',
  'Nova Rust',
  'Turbo Finch',
  'Axel Moon',
  'Riven Byte',
  'Cinder Vale',
]

export default function Home() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [mode, setMode] = useState<GameMode>('timer')
  const [lobbyWindowSeconds, setLobbyWindowSeconds] = useState('5')

  const single = useSingleplayerState()
  const multi = useMultiplayerState()

  if (screen === 'single') {
    if (single.state.phase === 'gameover') {
      return (
        <GameOverScreen
          state={single.state}
          onRestart={() => single.start(mode)}
          onHome={() => setScreen('menu')}
        />
      )
    }
    return (
      <div className="flex flex-col items-center gap-6">
        <GameplayWindow state={single.state} />
        <PixelButton
          tone="neutral"
          variant="ghost"
          iconLeft={<PxlKitIcon icon={HomeIcon} size={16} />}
          onClick={() => setScreen('menu')}
        >
          Quit to menu
        </PixelButton>
      </div>
    )
  }

  if (screen === 'multi') {
    if (multi.lobby && multi.lobby.phase === 'gameover') {
      return (
        <ResultsLeaderboard
          participants={multi.lobby.participants}
          onHome={() => {
            multi.leaveLobby()
            setScreen('menu')
          }}
        />
      )
    }
    if (multi.lobby && multi.lobby.phase === 'playing') {
      return (
        <MultiplayerGameplay
          lobby={multi.lobby}
          onLeave={() => {
            multi.leaveLobby()
            setScreen('menu')
          }}
        />
      )
    }
    if (multi.lobby) {
      const minRows = 6
      const cols = 3
      const requiredSlots = minRows * cols
      const baseParticipants = [...multi.lobby.participants]
      const slots: Array<MultiplayerParticipant & { isGhost?: boolean }> = [...baseParticipants]

      while (slots.length < requiredSlots) {
        const i = slots.length
        slots.push({
          id: `ghost-${i}`,
          name: DEMO_NAME_POOL[i % DEMO_NAME_POOL.length],
          score: 0,
          alive: i % 4 !== 0,
          sequence: null,
          progress: 0,
          isGhost: true,
        })
      }

      return (
        <main className="w-full px-4 py-8 md:py-12">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4">
            <PxlKitIcon icon={SparkleSmall} size={28} />
            <h1 className="font-['Bitcount_Grid_Single',monospace] text-center text-3xl text-retro-text md:text-4xl">
              Lobby {multi.lobby.code}
            </h1>

            <section className="w-full rounded-3xl border-2 border-retro-border bg-retro-card/70 p-4 md:p-8">
              <div className="mx-auto mb-3 max-w-xl">
                <PixelSegmented
                  value={mode}
                  options={MODE_OPTIONS}
                  onChange={(v) => setMode(v as GameMode)}
                />
              </div>
              <div className="mx-auto mb-6 max-w-xl">
                <PixelSegmented
                  value={lobbyWindowSeconds}
                  options={WINDOW_OPTIONS}
                  onChange={setLobbyWindowSeconds}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {slots.map((participant, i) => {
                  const isReady = participant.alive && i % 3 !== 0
                  return (
                    <div
                      key={participant.id}
                      className={[
                        'flex items-center justify-between rounded-full border border-retro-border bg-retro-surface/40 px-3 py-2',
                        participant.isGhost ? 'opacity-70' : '',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-2">
                        <PixelAvatar
                          name={participant.name}
                          size="sm"
                          tone={isReady ? 'green' : 'neutral'}
                        />
                        <span className="text-sm text-retro-text md:text-base">{participant.name}</span>
                      </div>
                      <PixelBadge tone={isReady ? 'green' : 'neutral'}>
                        {isReady ? 'READY' : 'NOT READY'}
                      </PixelBadge>
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <PixelButton
                  tone="green"
                  size="lg"
                  iconLeft={<PxlKitIcon icon={Play} size={16} />}
                  onClick={multi.startGame}
                >
                  START
                </PixelButton>
                <PixelButton
                  tone="neutral"
                  variant="ghost"
                  iconLeft={<PxlKitIcon icon={HomeIcon} size={16} />}
                  onClick={() => {
                    multi.leaveLobby()
                    setScreen('menu')
                  }}
                >
                  Leave Lobby
                </PixelButton>
              </div>
            </section>
          </div>
        </main>
      )
    }
    return (
      <PrestartLobby
        enabled={multi.enabled}
        onCreate={(v, name) => void multi.createLobby(v, name)}
        onJoin={(code, name) => void multi.joinLobby(code, name)}
      />
    )
  }

  return (
    <PixelHeroSection
      headline="Redshift QTE Demo"
      subline="A browser-based reference implementation of the QTE Gate start mechanic."
      tone="green"
      primaryCta={
        <PixelButton
          tone="green"
          size="lg"
          iconLeft={<PxlKitIcon icon={Play} size={18} />}
          onClick={() => {
            setScreen('single')
            single.start(mode)
          }}
        >
          Play {mode === 'timer' ? 'Timer' : 'Endless'}
        </PixelButton>
      }
      secondaryCta={
        <PixelButton
          tone="neutral"
          variant="outline"
          size="lg"
          iconRight={<PxlKitIcon icon={ArrowRight} size={18} />}
          onClick={() => setScreen('multi')}
        >
          Multiplayer
        </PixelButton>
      }
    >
      <PixelCard tone="neutral" className="mx-auto mt-8 w-full max-w-md">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-retro-text">
            <PxlKitIcon icon={SparkleSmall} size={18} />
            <span className="font-semibold">Singleplayer</span>
          </div>
          <PixelSegmented
            label="Mode"
            value={mode}
            options={MODE_OPTIONS}
            onChange={(v) => setMode(v as GameMode)}
          />
          <div className="flex items-center gap-2 text-sm text-retro-muted">
            <PxlKitIcon icon={Clock} size={16} />
            {mode === 'timer'
              ? 'Complete as many sequences as you can before time runs out.'
              : 'Survive as the timer shrinks with every sequence.'}
          </div>
        </div>
      </PixelCard>
    </PixelHeroSection>
  )
}
