import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import GoldenHourPage from './GoldenHourPage.jsx'
import { AnalysisContext } from '../context/AnalysisContext.jsx'
import { LanguageContext } from '../context/LanguageContext.jsx'
import { ToastContext } from '../context/ToastContext.jsx'
import { ROUTES } from '../routes.js'

describe('GoldenHourPage', () => {
  let container
  let root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    container = null
    root = null
  })

  function renderGoldenHour(result) {
    const analysisValue = {
      result,
      setResult: vi.fn(),
      clearResult: vi.fn(),
      lastInput: null,
      fallback: false,
    }
    const langValue = {
      lang: 'en',
      setLang: vi.fn(),
    }

    act(() => {
      root.render(
        <ToastContext.Provider value={{ show: vi.fn(), removeToast: vi.fn(), toasts: [] }}>
          <LanguageContext.Provider value={langValue}>
            <AnalysisContext.Provider value={analysisValue}>
              <MemoryRouter
                initialEntries={[
                  {
                    pathname: ROUTES.GOLDEN_HOUR || '/golden-hour',
                    state: { result },
                  },
                ]}
              >
                <Routes>
                  <Route
                    path={ROUTES.GOLDEN_HOUR || '/golden-hour'}
                    element={<GoldenHourPage />}
                  />
                  <Route path={ROUTES.CHECK || '/check'} element={<div>Check Page</div>} />
                </Routes>
              </MemoryRouter>
            </AnalysisContext.Provider>
          </LanguageContext.Provider>
        </ToastContext.Provider>
      )
    })
  }

  const sampleResult = {
    level: 'red',
    risk_score: 92,
    checked_at: new Date().toISOString(),
    entities: {
      upi_ids: ['fraudster1@ybl', 'fraudster2@okhdfcbank'],
      phones: ['9876543210'],
      urls: ['https://fraud-link.xyz'],
    },
    flag_categories: ['KYC scam', 'Urgency'],
  }

  it('renders without crashing when location.state.result has level "red" and entities', () => {
    renderGoldenHour(sampleResult)
    expect(container.textContent).toContain('Golden Hour')
    expect(container.textContent).toContain('Stop the bleeding')
    expect(container.textContent).toContain('Report it')
  })

  it('countdown shows "59:" within the string (started just now, almost 60 min left)', () => {
    renderGoldenHour(sampleResult)
    expect(container.textContent).toContain('59:')
  })

  it('checklist renders one item per upi_id in entities', () => {
    renderGoldenHour(sampleResult)
    expect(container.textContent).toContain(
      'Block UPI ID fraudster1@ybl in your payments app immediately'
    )
    expect(container.textContent).toContain(
      'Block UPI ID fraudster2@okhdfcbank in your payments app immediately'
    )
  })

  it('"Check another message" button exists', () => {
    renderGoldenHour(sampleResult)
    const buttons = Array.from(container.querySelectorAll('button'))
    const checkBtn = buttons.find((b) => b.textContent.includes('Check another message'))
    expect(checkBtn).toBeTruthy()
  })
})
