import { formatTime, noteServerDate, serverNow } from './time'

describe('time', () => {
  it('shows UTC instants in Sri Lanka time whatever the device zone', () => {
    expect(formatTime('2026-10-27T00:00:00Z')).toBe('2026-10-27 05:30')
    expect(formatTime(null)).toBe('—')
  })

  it('takes "now" from the server Date header', () => {
    noteServerDate('Tue, 27 Oct 2026 10:00:00 GMT')
    expect(Math.abs(serverNow().valueOf() - Date.parse('2026-10-27T10:00:00Z'))).toBeLessThan(2000)
    noteServerDate('not a date')
    expect(Math.abs(serverNow().valueOf() - Date.parse('2026-10-27T10:00:00Z'))).toBeLessThan(2000)
  })
})
