import { formatMoney, fromCents, isValidAmount, toCents } from './money'

describe('money', () => {
  it('parses to integer cents without float error', () => {
    expect(toCents('0.10') + toCents('0.20')).toBe(30)
    expect(toCents('1,500.5')).toBe(150050)
    expect(toCents('')).toBe(0)
    expect(toCents('-12.34')).toBe(-1234)
    expect(Number.isNaN(toCents('12.345'))).toBe(true)
    expect(Number.isNaN(toCents('abc'))).toBe(true)
  })

  it('formats', () => {
    expect(fromCents(150050)).toBe('1500.50')
    expect(fromCents(-5)).toBe('-0.05')
    expect(formatMoney('1234567.8')).toBe('1,234,567.80')
    expect(formatMoney(-150)).toBe('-1.50')
  })

  it('validates amounts', () => {
    expect(isValidAmount('100')).toBe(true)
    expect(isValidAmount('100.25')).toBe(true)
    expect(isValidAmount('100.255')).toBe(false)
    expect(isValidAmount('-1')).toBe(false)
  })
})
