// Money arrives from the API as strings ("1500.00") and is summed here as integer
// cents, so no floating-point rounding ever touches an amount.

export function toCents(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0
  const text = String(value).trim().replace(/,/g, '')
  const match = /^(-)?(\d*)(?:\.(\d{0,2}))?$/.exec(text)
  if (!match) return NaN
  const [, sign, whole, frac = ''] = match
  const cents = Number(whole || '0') * 100 + Number(frac.padEnd(2, '0'))
  return sign ? -cents : cents
}

export function fromCents(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

export function formatMoney(value: string | number | null | undefined): string {
  const cents = typeof value === 'number' ? value : toCents(value)
  if (Number.isNaN(cents)) return '—'
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const whole = Math.floor(abs / 100).toLocaleString('en-LK')
  return `${sign}${whole}.${String(abs % 100).padStart(2, '0')}`
}

export function isValidAmount(value: string): boolean {
  return /^\d{1,12}(\.\d{1,2})?$/.test(value.trim().replace(/,/g, ''))
}
