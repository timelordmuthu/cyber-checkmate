/**
 * Safely retrieves an item from localStorage.
 * Returns null on failure or if not found.
 */
export function safeGet(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * Safely stores a value in localStorage.
 * Returns true on success, false on failure.
 */
export function safeSet(key, value) {
  try {
    localStorage.setItem(key, String(value))
    return true
  } catch {
    return false
  }
}

/**
 * Safely removes an item from localStorage.
 * Returns true on success, false on failure.
 */
export function safeRemove(key) {
  try {
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}
