/**
 * src/lib/format.js
 * Formatting helpers for UI representation.
 */

/**
 * Formats a date or timestamp into a compact relative time string.
 * Examples: "just now", "5 min ago", "1 hour ago", "2 hours ago", "yesterday", "3 days ago".
 *
 * @param {string|number|Date} date - Date representation
 * @param {number|Date} [baseNow=Date.now()] - Reference time (useful for deterministic tests)
 * @returns {string} Relative time string
 */
export function formatRelative(date, baseNow = Date.now()) {
  if (!date) return ''
  const time = new Date(date).getTime()
  if (Number.isNaN(time)) return ''

  const now = new Date(baseNow).getTime()
  const diffSec = Math.max(0, Math.floor((now - time) / 1000))

  if (diffSec < 45) return 'just now'
  if (diffSec < 90) return '1 min ago'

  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} min ago`

  const diffHours = Math.floor(diffSec / 3600)
  if (diffHours === 1) return '1 hour ago'
  if (diffHours < 24) return `${diffHours} hours ago`

  const diffDays = Math.floor(diffSec / 86400)
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 30) return `${diffDays} days ago`

  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths === 1) return '1 month ago'
  if (diffMonths < 12) return `${diffMonths} months ago`

  const diffYears = Math.floor(diffDays / 365)
  if (diffYears === 1) return '1 year ago'
  return `${diffYears} years ago`
}

/**
 * Formats a date or timestamp into a localized date & time string.
 * Example: "Oct 23, 2026, 12:30 PM"
 *
 * @param {string|number|Date} date - Date representation
 * @param {string} [locale='en-IN'] - BCP-47 locale tag
 * @returns {string} Formatted date/time string
 */
export function formatDateTime(date, locale = 'en-IN') {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  try {
    return new Intl.DateTimeFormat(locale || 'en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return d.toLocaleString()
  }
}

