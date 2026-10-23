/**
 * src/__tests__/layout_nav.test.jsx
 * Tests:
 *  - PRIMARY_NAV exported constant has all 5 routes
 *  - BottomNav renders nav links with the ROUTES paths
 *  - ServerStatus shows 5 display states (mock, online, older, offline, checking)
 */
import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { MemoryRouter } from 'react-router-dom'

import { ROUTES } from '../routes.js'

// ── Hoist mocks before any component imports ─────────────────────────────
vi.mock('../context/ServerContext.jsx', () => ({
  useServer: vi.fn(() => ({
    online: true, mock: false, apiVersion: 2,
    modelVersion: null, checkedAt: null,
  })),
}))
vi.mock('../context/PrivateModeContext.jsx', () => ({
  usePrivateMode: vi.fn(() => ({ privateMode: false, setPrivateMode: vi.fn() })),
}))
vi.mock('../lib/session.js', () => ({
  getRole: vi.fn(() => 'user'),
  clearSession: vi.fn(),
}))
vi.mock('../context/LanguageContext.jsx', () => ({
  useLanguage: vi.fn(() => ({ lang: 'en', setLang: vi.fn(), toggleLang: vi.fn() })),
  LanguageProvider: ({ children }) => children,
}))

// ── Eager static imports (after vi.mock hoisting) ─────────────────────────
import { useServer } from '../context/ServerContext.jsx'
import { PRIMARY_NAV } from '../components/Header.jsx'
import BottomNavComp from '../components/BottomNav.jsx'
import ServerStatusComp from '../components/ServerStatus.jsx'

// ── Helper ───────────────────────────────────────────────────────────────

function renderInRouter(element, { initialEntries = ['/dashboard'] } = {}) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  let root
  act(() => {
    root = createRoot(container)
    root.render(createElement(MemoryRouter, { initialEntries }, element))
  })
  return {
    container,
    unmount() {
      act(() => root.unmount())
      container.remove()
    },
  }
}

// ────────────────────────────────────────────────────────────────────────
// 1. PRIMARY_NAV constant
// ────────────────────────────────────────────────────────────────────────
describe('PRIMARY_NAV constant', () => {
  const expectedRoutes = [
    ROUTES.dashboard,
    ROUTES.check,
    ROUTES.history,
    ROUTES.radar,
    ROUTES.settings,
  ]

  it('contains all 5 primary route paths', () => {
    const paths = PRIMARY_NAV.map((n) => n.to)
    for (const r of expectedRoutes) {
      expect(paths).toContain(r)
    }
  })

  it('every item has a labelKey and icon', () => {
    for (const item of PRIMARY_NAV) {
      expect(item.labelKey).toBeTruthy()
      expect(item.icon).toBeTruthy()
    }
  })
})

// ────────────────────────────────────────────────────────────────────────
// 2. BottomNav – renders links for all 5 routes
// ────────────────────────────────────────────────────────────────────────
describe('BottomNav', () => {
  it('renders a NavLink for each primary route', () => {
    const { container, unmount } = renderInRouter(createElement(BottomNavComp))
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(hrefs).toContain(ROUTES.dashboard)
    expect(hrefs).toContain(ROUTES.check)
    expect(hrefs).toContain(ROUTES.history)
    expect(hrefs).toContain(ROUTES.radar)
    expect(hrefs).toContain(ROUTES.settings)
    unmount()
  })
})

// ────────────────────────────────────────────────────────────────────────
// 3. ServerStatus – display states
// ────────────────────────────────────────────────────────────────────────
describe('ServerStatus', () => {
  function renderStatus() {
    const { container, unmount } = renderInRouter(createElement(ServerStatusComp))
    return { text: container.textContent, container, unmount }
  }

  it('shows "Mock Mode" when mock=true', () => {
    useServer.mockReturnValue({ online: true, mock: true, apiVersion: 2, modelVersion: null, checkedAt: null })
    const { text, unmount } = renderStatus()
    expect(text).toMatch(/mock/i)
    unmount()
  })

  it('shows "Server connected" when online + apiVersion >= 2', () => {
    useServer.mockReturnValue({ online: true, mock: false, apiVersion: 2, modelVersion: null, checkedAt: null })
    const { text, unmount } = renderStatus()
    expect(text).toMatch(/server connected|online/i)
    unmount()
  })

  it('shows "older server" when online + apiVersion < 2', () => {
    useServer.mockReturnValue({ online: true, mock: false, apiVersion: 1, modelVersion: null, checkedAt: null })
    const { text, unmount } = renderStatus()
    expect(text).toMatch(/older server/i)
    unmount()
  })

  it('shows "Offline" when online=false', () => {
    useServer.mockReturnValue({ online: false, mock: false, apiVersion: null, modelVersion: null, checkedAt: null })
    const { text, unmount } = renderStatus()
    expect(text).toMatch(/offline/i)
    unmount()
  })

  it('shows checking state when online=null', () => {
    useServer.mockReturnValue({ online: null, mock: false, apiVersion: null, modelVersion: null, checkedAt: null })
    const { text, unmount } = renderStatus()
    expect(text).toMatch(/checking|backend/i)
    unmount()
  })
})
