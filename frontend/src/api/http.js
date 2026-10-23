import { ApiError, NetworkError, FeatureUnavailableError } from './errors.js'
import { getAdminToken, clearSession } from '../lib/session.js'

function messageFrom(data) {
  if (!data) return null
  if (typeof data.error === 'string') return data.error
  if (typeof data.detail === 'string') return data.detail
  if (Array.isArray(data.detail)) return 'Some fields are invalid.'
  return null
}

export async function requestJson(path, { method = 'GET', body, form, headers = {}, timeoutMs = 8000, admin = false } = {}) {
  if (!path || !path.startsWith('/')) {
    throw new Error('path must start with "/"')
  }

  const reqHeaders = { ...headers }
  if (admin) {
    const token = getAdminToken()
    if (!token) {
      throw new ApiError('Admin session expired.', 401)
    }
    reqHeaders['X-Admin-Token'] = token
  }

  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  let res
  try {
    const init = {
      method,
      headers: reqHeaders,
      signal: controller.signal
    }

    if (form) {
      init.body = form
    } else if (body !== undefined) {
      init.body = JSON.stringify(body)
      reqHeaders['Content-Type'] = 'application/json'
    }

    res = await fetch(path, init)
  } catch (err) {
    clearTimeout(timer)
    if (timedOut) {
      throw new NetworkError('The server took too long to answer.')
    }
    throw new NetworkError("Can't reach the CyberCheckmate server.")
  } finally {
    clearTimeout(timer)
  }

  const text = await res.text()
  let data = null
  try {
    data = JSON.parse(text)
  } catch {
    data = null
  }

  const status = res.status
  if (!res.ok) {
    if (status === 404) {
      throw new FeatureUnavailableError(messageFrom(data) || 'Not available on this server yet.')
    }
    if (admin && status === 401) {
      clearSession()
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('cc:admin-expired'))
      }
    }
    throw new ApiError(messageFrom(data) || `Server error (${status})`, status)
  }

  return data
}
