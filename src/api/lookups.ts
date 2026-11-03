import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { Branch, Competitor } from './types'

export function useBranches(enabled = true) {
  return useQuery({
    queryKey: ['branches'],
    queryFn: async () => (await api.get<Branch[]>('/branches')).data,
    enabled,
    staleTime: 5 * 60_000,
  })
}

export function useCompetitors(watch = false) {
  return useQuery({
    queryKey: ['competitors'],
    queryFn: async () => (await api.get<Competitor[]>('/competitors')).data,
    staleTime: 60_000,
    // While a shop is being read, look again every 10 s so its row updates by itself.
    refetchInterval: watch ? (q) => (q.state.data?.some((c) => c.running) ? 10_000 : false) : false,
  })
}

export const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super admin',
  branch_manager: 'Branch manager',
  marketing_manager: 'Marketing manager',
  price_checker: 'Price checker',
}

export const LEVEL_LABEL: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  long: 'Every 2 months',
}

export const POSITION: Record<string, { label: string; color: string }> = {
  cheaper: { label: 'We are cheaper', color: 'green' },
  equal: { label: 'Same price', color: 'blue' },
  dearer: { label: 'We are dearer', color: 'red' },
  unknown: { label: 'No data', color: 'default' },
}

export const STATUS_COLOR: Record<string, string> = {
  ok: 'green',
  failing: 'orange',
  blocked: 'red',
  pending: 'default',
  running: 'blue',
  failed: 'red',
  applied: 'green',
  rejected: 'default',
  superseded: 'default',
  accepted: 'blue',
}

export function statusLabel(status: string): string {
  const s = status.replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}
