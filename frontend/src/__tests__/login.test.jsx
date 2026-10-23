/**
 * src/__tests__/login.test.jsx
 * Tests for LoginPage (FE PRD §7):
 *  - User button sets role 'user' and navigates to next or ROUTES.dashboard
 *  - Admin 401/503/404/network errors render the exact PRD messages
 *  - Successful admin login sets role 'admin' and navigates to ROUTES.console
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

import LoginPage from '../pages/LoginPage.jsx'
import { ROUTES } from '../routes.js'
import { getRole, getAdminToken, clearSession } from '../lib/session.js'
import { ApiError, NetworkError, FeatureUnavailableError } from '../api/errors.js'
import * as api from '../api/index.js'

// Mock admin.ping
vi.mock('../api/index.js', async () => {
  const actual = await vi.importActual('../api/index.js')
  return {
    ...actual,
    admin: {
      ...actual.admin,
      ping: vi.fn(),
    },
    isMockMode: vi.fn(() => false),
  }
})

describe('LoginPage', () => {
  let container = null
  let root = null

  beforeEach(() => {
    clearSession()
    vi.restoreAllMocks()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    if (root) {
      act(() => root.unmount())
    }
    if (container) {
      container.remove()
    }
  })

  function changeInput(input, value) {
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set
    if (nativeSetter) {
      nativeSetter.call(input, value)
    } else {
      input.value = value
    }
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }

  function renderLoginPage(initialEntry = ROUTES.login) {
    let currentPath = initialEntry
    function PathTracker() {
      return null
    }

    act(() => {
      root.render(
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path={ROUTES.login} element={<LoginPage />} />
            <Route
              path={ROUTES.dashboard}
              element={<div data-testid="page-dashboard">Dashboard</div>}
            />
            <Route
              path={ROUTES.console}
              element={<div data-testid="page-console">Console</div>}
            />
            <Route
              path="/check"
              element={<div data-testid="page-check">Check</div>}
            />
          </Routes>
        </MemoryRouter>
      )
    })

    return {
      container,
      getUserButton: () =>
        Array.from(container.querySelectorAll('button')).find((b) =>
          b.textContent.includes('Continue as User')
        ),
      getAdminButton: () =>
        Array.from(container.querySelectorAll('button')).find((b) =>
          b.textContent.includes('Sign in')
        ),
      getTokenInput: () => container.querySelector('#admin-token'),
      getAlert: () => container.querySelector('[role="alert"]'),
    }
  }

  describe('User login flow', () => {
    it('sets role to user and navigates to dashboard when no next query parameter', async () => {
      const { getUserButton } = renderLoginPage(ROUTES.login)
      const userBtn = getUserButton()
      expect(userBtn).toBeTruthy()

      await act(async () => {
        userBtn.click()
      })

      expect(getRole()).toBe('user')
      expect(container.querySelector('[data-testid="page-dashboard"]')).toBeTruthy()
    })

    it('navigates to next destination when next is a valid non-reserved path', async () => {
      const { getUserButton } = renderLoginPage(`${ROUTES.login}?next=%2Fcheck`)
      const userBtn = getUserButton()

      await act(async () => {
        userBtn.click()
      })

      expect(getRole()).toBe('user')
      expect(container.querySelector('[data-testid="page-check"]')).toBeTruthy()
    })

    it('falls back to dashboard when next points to a reserved prefix', async () => {
      const { getUserButton } = renderLoginPage(`${ROUTES.login}?next=%2Fadmin%2Freports`)
      const userBtn = getUserButton()

      await act(async () => {
        userBtn.click()
      })

      expect(getRole()).toBe('user')
      expect(container.querySelector('[data-testid="page-dashboard"]')).toBeTruthy()
    })
  })

  describe('Admin login flow & error states', () => {
    it('successfully signs in admin, sets session, and navigates to console', async () => {
      api.admin.ping.mockResolvedValueOnce({ status: 'ok' })

      const { getAdminButton, getTokenInput } = renderLoginPage(ROUTES.login)
      const input = getTokenInput()
      const btn = getAdminButton()

      await act(async () => {
        changeInput(input, 'secret-admin-pass')
      })

      await act(async () => {
        btn.click()
      })

      expect(api.admin.ping).toHaveBeenCalledWith('secret-admin-pass')
      expect(getRole()).toBe('admin')
      expect(getAdminToken()).toBe('secret-admin-pass')
      expect(container.querySelector('[data-testid="page-console"]')).toBeTruthy()
    })

    it('renders "That token isn\'t right." on 401 ApiError and clears token', async () => {
      api.admin.ping.mockRejectedValueOnce(new ApiError('Unauthorized', 401))

      const { getAdminButton, getTokenInput, getAlert } = renderLoginPage(ROUTES.login)
      const input = getTokenInput()
      const btn = getAdminButton()

      await act(async () => {
        changeInput(input, 'wrong-token')
      })

      await act(async () => {
        btn.click()
      })

      expect(getAlert()?.textContent).toBe("That token isn't right.")
      expect(getAdminToken()).toBeNull()
      expect(getRole()).toBeNull()
    })

    it('renders "Admin is turned off on this server." on 503 ApiError', async () => {
      api.admin.ping.mockRejectedValueOnce(new ApiError('Service Unavailable', 503))

      const { getAdminButton, getTokenInput, getAlert } = renderLoginPage(ROUTES.login)
      const input = getTokenInput()
      const btn = getAdminButton()

      await act(async () => {
        changeInput(input, 'any-token')
      })

      await act(async () => {
        btn.click()
      })

      expect(getAlert()?.textContent).toBe('Admin is turned off on this server.')
      expect(getAdminToken()).toBeNull()
    })

    it('renders "Admin tools aren\'t available on this server yet." on 404 FeatureUnavailableError', async () => {
      api.admin.ping.mockRejectedValueOnce(new FeatureUnavailableError())

      const { getAdminButton, getTokenInput, getAlert } = renderLoginPage(ROUTES.login)
      const input = getTokenInput()
      const btn = getAdminButton()

      await act(async () => {
        changeInput(input, 'any-token')
      })

      await act(async () => {
        btn.click()
      })

      expect(getAlert()?.textContent).toBe("Admin tools aren't available on this server yet.")
      expect(getAdminToken()).toBeNull()
    })

    it('renders "Can\'t reach the server." on NetworkError', async () => {
      api.admin.ping.mockRejectedValueOnce(new NetworkError())

      const { getAdminButton, getTokenInput, getAlert } = renderLoginPage(ROUTES.login)
      const input = getTokenInput()
      const btn = getAdminButton()

      await act(async () => {
        changeInput(input, 'any-token')
      })

      await act(async () => {
        btn.click()
      })

      expect(getAlert()?.textContent).toBe("Can't reach the server.")
      expect(getAdminToken()).toBeNull()
    })
  })
})
