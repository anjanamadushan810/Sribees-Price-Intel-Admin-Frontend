import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)

// Times are stored in UTC and always shown in Sri Lanka time, whatever zone the
// device is set to. "Now" comes from the server's Date header, never the device clock.
export const ZONE = 'Asia/Colombo'
let serverOffsetMs = 0

export function noteServerDate(header: string | undefined | null) {
  if (!header) return
  const server = Date.parse(header)
  if (!Number.isNaN(server)) serverOffsetMs = server - Date.now()
}

export function serverNow(): dayjs.Dayjs {
  return dayjs(Date.now() + serverOffsetMs)
}

export function formatTime(value: string | null | undefined, pattern = 'YYYY-MM-DD HH:mm'): string {
  return value ? dayjs(value).tz(ZONE).format(pattern) : '—'
}

/** "3 hours ago", measured against the server's clock. */
export function ago(value: string | null | undefined): string {
  return value ? dayjs(value).from(serverNow()) : 'never'
}
