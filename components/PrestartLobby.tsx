import { useState } from 'react'
import { PixelCard, PixelInput, PixelSelect, PixelButton, PixelAlert } from '@pxlkit/ui-kit'
import type { MultiplayerVariant } from '../lib/types'

import { Home as HomeIcon } from '@pxlkit/ui'
import { PxlKitIcon } from '@pxlkit/core'

interface PrestartLobbyProps {
  enabled: boolean
  onCreate: (variant: MultiplayerVariant, name: string) => void
  onJoin: (code: string, name: string) => void
  onBack: () => void
}

const VARIANT_OPTIONS = [
  { value: 'score', label: 'Timer (Score)' },
  { value: 'elimination', label: 'Endless (Elimination)' },
  { value: 'reaction', label: 'Timer (Reaction)' },
]

const VARIANT_LABEL: Record<MultiplayerVariant, string> = {
  score: 'NORMAL',
  elimination: 'HARD',
  reaction: 'HARD',
}

const VARIANT_MODE: Record<MultiplayerVariant, string> = {
  score: 'TIMER',
  elimination: 'ENDLESS',
  reaction: 'REACTION',
}

const VARIANT_HINT: Record<MultiplayerVariant, string> = {
  score: 'Timer mode rewards consistency under pressure.',
  elimination: 'Endless mode decreases the time between codes!',
  reaction: 'Reaction mode favors fast, precise inputs.',
}

export default function PrestartLobby({ enabled, onCreate, onJoin, onBack }: PrestartLobbyProps) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [variant, setVariant] = useState<MultiplayerVariant>('score')

  if (!enabled) {
    return (
      <div className="flex flex-col items-center gap-4">
        <PixelCard tone="red" className="max-w-md">
          <PixelAlert
            tone="red"
            label="Multiplayer unavailable"
            message="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable it."
          />
        </PixelCard>
        <PixelButton
          tone="neutral"
          variant="ghost"
          iconLeft={<PxlKitIcon icon={HomeIcon} size={16} />}
          onClick={onBack}
        >
          Back to Solo Mode
        </PixelButton>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="rounded-full border-2 border-black bg-[#d9d9d9] px-5 py-1 text-lg text-black">
        00:09.0
      </div>

      <PixelCard tone="neutral" className="w-full max-w-2xl border-2 border-black bg-[#d9d9d9]">
        <div className="flex flex-col items-center gap-4">
          <p className="font-['Bitcount_Grid_Single',monospace] text-3xl tracking-wide text-black">GET READY</p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="rounded-full border-2 border-black bg-[#d9d9d9] px-4 py-1 text-lg text-black">
              {VARIANT_LABEL[variant]}
            </span>
            <span className="rounded-full border-2 border-black bg-[#d9d9d9] px-4 py-1 text-lg text-black">
              {VARIANT_MODE[variant]}
            </span>
            <span className="rounded-full border-2 border-black bg-[#d9d9d9] px-4 py-1 text-lg text-black">
              12 PLAYERS
            </span>
          </div>

          <div className="w-full max-w-md">
            <PixelInput
              label="Display name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Runner"
            />
          </div>

          <div className="w-full max-w-md">
            <PixelSelect
              label="Variant"
              options={VARIANT_OPTIONS}
              value={variant}
              onChange={(v) => setVariant(v as MultiplayerVariant)}
            />
          </div>

          <div className="flex w-full max-w-md gap-2">
            <PixelButton
              tone="green"
              className="flex-1"
              disabled={!name}
              onClick={() => onCreate(variant, name)}
            >
              Create Lobby
            </PixelButton>
            <PixelInput
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CODE"
              maxLength={6}
              className="flex-1"
            />
            <PixelButton
              tone="neutral"
              variant="outline"
              disabled={!name || !code}
              onClick={() => onJoin(code, name)}
            >
              Join
            </PixelButton>
          </div>

          <div className="mt-2 w-full max-w-md flex justify-center">
            <PixelButton
              tone="neutral"
              variant="ghost"
              iconLeft={<PxlKitIcon icon={HomeIcon} size={16} />}
              onClick={onBack}
            >
              Back to Solo Mode
            </PixelButton>
          </div>
        </div>
      </PixelCard>

      <div className="w-full max-w-2xl rounded-full border-2 border-black bg-[#d9d9d9] px-4 py-1 text-center text-sm text-black">
        {VARIANT_HINT[variant]}
      </div>
    </div>
  )
}
