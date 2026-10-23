const ROLE_KEY = 'cc_role'
const ADMIN_TOKEN_KEY = 'cc_admin_token'

/**
 * Retrieves the current session role ('user' | 'admin' | null).
 */
export function getRole() {
  try {
    return sessionStorage.getItem(ROLE_KEY)
  } catch {
    return null
  }
}

/**
 * Sets the current session role.
 */
export function setRole(role) {
  try {
    if (role) {
      sessionStorage.setItem(ROLE_KEY, role)
    } else {
      sessionStorage.removeItem(ROLE_KEY)
    }
    return true
  } catch {
    return false
  }
}

/**
 * Retrieves the current admin token from session storage.
 */
export function getAdminToken() {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY)
  } catch {
    return null
  }
}

/**
 * Sets the admin token in session storage.
 */
export function setAdminToken(token) {
  try {
    if (token) {
      sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
    } else {
      sessionStorage.removeItem(ADMIN_TOKEN_KEY)
    }
    return true
  } catch {
    return false
  }
}

/**
 * Clears the user session role and admin token.
 */
export function clearSession() {
  try {
    sessionStorage.removeItem(ROLE_KEY)
    sessionStorage.removeItem(ADMIN_TOKEN_KEY)
    return true
  } catch {
    return false
  }
}
