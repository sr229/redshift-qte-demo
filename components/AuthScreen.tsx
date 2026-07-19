import { PixelButton, PixelCard, PixelAlert } from '@pxlkit/ui-kit'
import { PxlKitIcon } from '@pxlkit/core'
import { SparkleSmall } from '@pxlkit/ui'
import type { OAuthProvider } from '../hooks/useAuth'

interface AuthScreenProps {
  onSignIn: (provider: OAuthProvider) => void
  disabled?: boolean
}

const PROVIDERS: Array<{ id: OAuthProvider; label: string }> = [
  { id: 'github', label: 'Continue with GitHub' },
  { id: 'discord', label: 'Continue with Discord' },
]

export default function AuthScreen({ onSignIn, disabled }: AuthScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-12 bg-retro-bg">
      <div className="flex flex-col items-center gap-3 text-center">
        <PxlKitIcon icon={SparkleSmall} size={32} className="text-retro-text" />
        <h1 className="font-pixel text-2xl text-retro-text md:text-3xl leading-snug">
          Multiplayer
        </h1>
        <p className="font-pixel max-w-xs text-center text-[10px] leading-loose text-retro-muted">
          Sign in to create or join a lobby. Your profile is used as your runner name.
        </p>
      </div>

      <PixelCard tone="neutral" className="w-full max-w-sm">
        <div className="flex flex-col gap-3">
          {PROVIDERS.map((p) => (
            <PixelButton
              key={p.id}
              tone="neutral"
              size="lg"
              className="w-full"
              disabled={disabled}
              onClick={() => onSignIn(p.id)}
            >
              {p.label}
            </PixelButton>
          ))}
        </div>
      </PixelCard>

      <PixelAlert
        tone="neutral"
        label="Why sign in?"
        message="Multiplayer lobbies are invite-only and tied to your account so hosts can manage their lobby."
      />
    </div>
  )
}
