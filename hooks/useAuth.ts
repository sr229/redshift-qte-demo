import { useCallback, useEffect, useState } from 'react'
import { isMultiplayerEnabled, supabase } from '../lib/supabase'

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated'

export interface AuthUser {
  id: string
  name: string
  email?: string
  avatarUrl?: string
}

export type OAuthProvider = 'github' | 'discord'

function deriveName(meta: Record<string, unknown> | undefined, email?: string): string {
  if (!meta) return email?.split('@')[0] ?? 'Player'
  const full = (meta.full_name as string) || (meta.name as string)
  if (full) return full
  if (meta.preferred_username) return meta.preferred_username as string
  return email?.split('@')[0] ?? 'Player'
}

export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    if (!isMultiplayerEnabled || !supabase) {
      setStatus('anonymous')
      return
    }

    const applySession = (session: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null) => {
      if (session?.user) {
        const u = session.user
        setUser({
          id: u.id,
          name: deriveName(u.user_metadata, u.email),
          email: u.email,
          avatarUrl: u.user_metadata?.avatar_url as string | undefined,
        })
        setStatus('authenticated')
      } else {
        setUser(null)
        setStatus('anonymous')
      }
    }

    supabase.auth.getSession().then(({ data }) => applySession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) =>
      applySession(session),
    )
    return () => sub.subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (provider: OAuthProvider = 'github') => {
    if (!supabase) return
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.href },
    })
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }, [])

  return { status, user, signIn, signOut }
}
