import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { noteServerDate } from './time'
import type { Tokens } from './types'

// The access token lives only in memory. The refresh token is an httpOnly cookie
// the browser sends to /api/auth/refresh; JavaScript never sees it.
let accessToken: string | null = null
let onSignedOut: () => void = () => {}

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function setSignedOutHandler(handler: () => void) {
  onSignedOut = handler
}

export const api = axios.create({ baseURL: '/api', withCredentials: true })

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

let refreshing: Promise<string | null> | null = null

/** One refresh at a time, however many requests hit a 401 together. */
export function refreshAccessToken(): Promise<string | null> {
  refreshing ??= axios
    .post<Tokens>('/api/auth/refresh', null, { withCredentials: true })
    .then((r) => {
      setAccessToken(r.data.access_token)
      return r.data.access_token
    })
    .catch(() => {
      setAccessToken(null)
      return null
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

api.interceptors.response.use((response) => {
  noteServerDate(response.headers['date'] as string | undefined)
  return response
}, async (error: AxiosError) => {
  const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
  const isAuthCall = original?.url?.startsWith('/auth/')
  if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
    original._retried = true
    const token = await refreshAccessToken()
    if (token) return api(original)
    onSignedOut()
  }
  return Promise.reject(error)
})

/** The API's `detail` message, or a plain fallback. */
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg)
    if (!error.response) return 'Cannot reach the server. Check the connection.'
  }
  return 'Something went wrong.'
}
