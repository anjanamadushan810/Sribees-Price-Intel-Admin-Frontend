import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, refreshAccessToken, setAccessToken, setSignedOutHandler } from '../api/client'
import type { Me, Step, Tokens } from '../api/types'

type LoginResult = { done: true } | { done: false; step: Step }

interface AuthState {
  me: Me | null
  ready: boolean
  can: (permission: string) => boolean
  login: (email: string, password: string) => Promise<LoginResult>
  verifyTotp: (ticket: string, code: string) => Promise<void>
  startTotpSetup: (ticket: string) => Promise<{ secret: string; otpauth_uri: string }>
  enableTotp: (ticket: string, code: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [me, setMe] = useState<Me | null>(null)
  const [ready, setReady] = useState(false)

  const loadMe = useCallback(async () => {
    const r = await api.get<Me>('/auth/me')
    setMe(r.data)
  }, [])

  const signedOut = useCallback(() => {
    setAccessToken(null)
    setMe(null)
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    setSignedOutHandler(signedOut)
    // A reload keeps the session through the refresh cookie.
    refreshAccessToken()
      .then((token) => (token ? loadMe() : undefined))
      .catch(() => undefined)
      .finally(() => setReady(true))
  }, [loadMe, signedOut])

  const finish = useCallback(
    async (tokens: Tokens) => {
      setAccessToken(tokens.access_token)
      await loadMe()
    },
    [loadMe],
  )

  const value = useMemo<AuthState>(
    () => ({
      me,
      ready,
      can: (permission) => !!me?.permissions.includes(permission),
      login: async (email, password) => {
        const r = await api.post<Tokens | Step>('/auth/login', { email, password })
        if (r.data.status === 'ok') {
          await finish(r.data)
          return { done: true }
        }
        return { done: false, step: r.data }
      },
      verifyTotp: async (ticket, code) => {
        await finish((await api.post<Tokens>('/auth/totp', { ticket, code })).data)
      },
      startTotpSetup: async (ticket) => (await api.post('/auth/totp/setup', { ticket })).data,
      enableTotp: async (ticket, code) => {
        await finish((await api.post<Tokens>('/auth/totp/enable', { ticket, code })).data)
      },
      logout: async () => {
        try {
          await api.post('/auth/logout')
        } finally {
          signedOut()
        }
      },
    }),
    [me, ready, finish, signedOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
