/**
 * src/__tests__/dashboard.test.jsx
 * Tests for DashboardPage:
 *  - Empty state rendering
 *  - Stats numbers and recent activity rendering from seeded history
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

import DashboardPage from '../pages/DashboardPage.jsx'
import { ROUTES } from '../routes.js'
import * as history from '../history.js'

// Mock fx tier so SplitFlapText renders consistently in jsdom
vi.mock('../lib/fx.js', () => ({
  useFxTier: vi.fn(() => 'full'),
  detectFxTier: vi.fn(() => 'full'),
  usePageVisible: vi.fn(() => true),
  useOnlyOneWebGL: vi.fn(() => true),
}))

vi.mock('../context/LanguageContext.jsx', () => ({
  useLanguage: vi.fn(() => ({ lang: 'en', setLang: vi.fn(), toggleLang: vi.fn() })),
  LanguageProvider: ({ children }) => children,
}))

vi.mock('../context/PrivateModeContext.jsx', () => ({
  usePrivateMode: vi.fn(() => ({ privateMode: false, setPrivateMode: vi.fn() })),
  PrivateModeProvider: ({ children }) => children,
}))

// Mock history methods
vi.mock('../history.js', async () => {
  const actual = await vi.importActual('../history.js')
  return {
    ...actual,
    stats: vi.fn(),
    listSummaries: vi.fn(),
  }
})

describe('DashboardPage', () => {
  let container = null
  let root = null

  beforeEach(() => {
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

  function renderDashboard() {
    act(() => {
      root.render(
        <MemoryRouter initialEntries={[ROUTES.dashboard]}>
          <Routes>
            <Route path={ROUTES.dashboard} element={<DashboardPage />} />
            <Route path={ROUTES.check} element={<div data-testid="page-check">Check Page</div>} />
            <Route path={ROUTES.history} element={<div data-testid="page-history">History Page</div>} />
          </Routes>
        </MemoryRouter>
      )
    })
    return { container }
  }

  it('renders empty state when history has no entries', async () => {
    history.stats.mockReturnValue({ total: 0, red: 0, amber: 0, green: 0, last7days: 0 })
    history.listSummaries.mockReturnValue([])

    renderDashboard()

    // Assert empty state text
    expect(container.textContent).toContain(
      'No checks yet. Your recent checks will appear here (only on this device).'
    )

    // Verify Check a message CTA is present
    const checkBtns = Array.from(container.querySelectorAll('button')).filter((b) =>
      b.textContent.includes('Check a message')
    )
    expect(checkBtns.length).toBeGreaterThan(0)
  })

  it('renders stats numbers from seeded history', async () => {
    const seededStats = {
      total: 14,
      red: 5,
      amber: 6,
      green: 3,
      last7days: 10,
    }

    const seededSummaries = [
      {
        id: 's1',
        created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        level: 'red',
        risk_score: 92,
        input_type: 'text',
        checked_on_device: true,
        reported: true,
      },
      {
        id: 's2',
        created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
        level: 'green',
        risk_score: 8,
        input_type: 'url',
        checked_on_device: false,
        reported: false,
      },
    ]

    history.stats.mockReturnValue(seededStats)
    history.listSummaries.mockReturnValue(seededSummaries)

    renderDashboard()

    // Text content should include stat numbers
    expect(container.textContent).toContain('14')
    expect(container.textContent).toContain('5')

    // Recent activity should display verdicts
    expect(container.textContent).toContain('Checkmate')
    expect(container.textContent).toContain('Safe')
    expect(container.textContent).toContain('Score: 92/100')
    expect(container.textContent).toContain('Score: 8/100')

    // Tags should render
    expect(container.textContent).toContain('On device')
    expect(container.textContent).toContain('Reported')

    // Relative times should render
    expect(container.textContent).toContain('5 min ago')
    expect(container.textContent).toContain('1 hour ago')
  })
})
