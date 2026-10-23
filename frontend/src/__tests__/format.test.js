import { describe, it, expect } from 'vitest'
import { formatRelative, formatDateTime } from '../lib/format.js'

describe('formatRelative in lib/format.js', () => {
  const baseNow = new Date('2026-10-23T12:00:00Z').getTime()

  it('returns empty string for null, undefined, or invalid date', () => {
    expect(formatRelative(null)).toBe('')
    expect(formatRelative(undefined)).toBe('')
    expect(formatRelative('invalid-date')).toBe('')
  })

  it('formats "just now" for dates within 45 seconds', () => {
    const d = new Date(baseNow - 20 * 1000)
    expect(formatRelative(d, baseNow)).toBe('just now')
  })

  it('formats "1 min ago" for dates around 60-89 seconds', () => {
    const d = new Date(baseNow - 70 * 1000)
    expect(formatRelative(d, baseNow)).toBe('1 min ago')
  })

  it('formats minutes ago accurately (e.g. "5 min ago")', () => {
    const d = new Date(baseNow - 5 * 60 * 1000)
    expect(formatRelative(d, baseNow)).toBe('5 min ago')
  })

  it('formats hours ago accurately', () => {
    const d1 = new Date(baseNow - 3600 * 1000)
    expect(formatRelative(d1, baseNow)).toBe('1 hour ago')

    const d3 = new Date(baseNow - 3 * 3600 * 1000)
    expect(formatRelative(d3, baseNow)).toBe('3 hours ago')
  })

  it('formats "yesterday" and days ago', () => {
    const d1 = new Date(baseNow - 86400 * 1000)
    expect(formatRelative(d1, baseNow)).toBe('yesterday')

    const d5 = new Date(baseNow - 5 * 86400 * 1000)
    expect(formatRelative(d5, baseNow)).toBe('5 days ago')
  })
})

describe('formatDateTime in lib/format.js', () => {
  it('returns empty string for null, undefined, or invalid dates', () => {
    expect(formatDateTime(null)).toBe('')
    expect(formatDateTime(undefined)).toBe('')
    expect(formatDateTime('invalid-date')).toBe('')
  })

  it('formats valid ISO date string with locale', () => {
    const formatted = formatDateTime('2026-10-23T12:30:00Z', 'en-IN')
    expect(formatted).toBeTruthy()
    expect(formatted).toContain('2026')
  })
})

