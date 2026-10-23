import { safeGet, safeSet, safeRemove } from './lib/storage.js'

export const STORAGE_KEY = 'cc_history_v1'
export const MAX_HISTORY_ENTRIES = 200

/**
 * Checks whether localStorage is actually accessible in this browser session.
 * @returns {boolean}
 */
export function isStorageAvailable() {
  const testKey = '__cc_test__'
  const ok = safeSet(testKey, '1')
  if (ok) safeRemove(testKey)
  return ok
}

/**
 * Safely reads raw history list from localStorage.
 * Always returns an array, never throws.
 */
function readStorage() {
  try {
    const raw = safeGet(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Safely writes history list to localStorage.
 * Never throws.
 */
function writeStorage(entries) {
  try {
    return safeSet(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    return false
  }
}

/**
 * Saves a privacy-preserving summary of an analysis response.
 *
 * HARD RULE (PRD 16.14):
 * NEVER store message text, extracted text, URLs, evidence snippets, entities, or translation.
 *
 * @param {Object} response - The analysis response
 * @param {Object} [extra] - Additional metadata: { checked_on_device, lang }
 * @returns {Object|null} The stored summary object, or null if skipped/failed
 */
export function saveSummary(response, extra = {}) {
  if (!response || typeof response !== 'object') return null

  // Extract unique flag categories only (never flag evidence or text)
  const flags = response.red_flags || response.flags || []
  const categories = Array.from(
    new Set(
      flags
        .map((f) => {
          if (f && typeof f.category === 'string') return f.category.trim()
          if (typeof f === 'string') return f.trim()
          return ''
        })
        .filter(Boolean)
    )
  )

  const summary = {
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'cc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    created_at: new Date().toISOString(),
    level: response.level === 'red' || response.level === 'amber' ? response.level : 'green',
    risk_score: typeof response.risk_score === 'number' ? response.risk_score : 0,
    input_type: response.input_type || 'text',
    flag_categories: categories,
    explanation_source: response.explanation_source || 'template',
    model_version: response.model_version || 'v1',
    reported: false,
    checked_on_device: !!extra.checked_on_device,
    lang: extra.lang || 'en',
  }

  const existing = readStorage()
  const updated = [summary, ...existing].slice(0, MAX_HISTORY_ENTRIES)
  writeStorage(updated)

  return summary
}

/**
 * Returns all saved summaries, ordered newest first.
 * @returns {Array<Object>}
 */
export function listSummaries() {
  return readStorage()
}

/**
 * Calculates aggregate stats across stored summaries:
 * { total, red, amber, green, last7days }
 * @returns {Object}
 */
export function stats() {
  const items = readStorage()
  const now = Date.now()
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000

  let red = 0
  let amber = 0
  let green = 0
  let last7days = 0

  for (const item of items) {
    if (item.level === 'red') red++
    else if (item.level === 'amber') amber++
    else if (item.level === 'green') green++

    if (item.created_at) {
      const itemTime = new Date(item.created_at).getTime()
      if (!isNaN(itemTime) && now - itemTime <= sevenDaysMs) {
        last7days++
      }
    }
  }

  return {
    total: items.length,
    red,
    amber,
    green,
    last7days,
  }
}

/**
 * Marks a specific summary as reported (FR10.1).
 * @param {string} id
 * @returns {boolean} whether the item was found and updated
 */
export function markReported(id) {
  if (!id) return false
  const items = readStorage()
  let found = false

  const updated = items.map((item) => {
    if (item.id === id) {
      found = true
      return { ...item, reported: true }
    }
    return item
  })

  if (found) {
    writeStorage(updated)
  }
  return found
}

/**
 * Clears all on-device history.
 */
export function clearHistory() {
  safeRemove(STORAGE_KEY)
}
