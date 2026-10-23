import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import HistoryPage from '../pages/HistoryPage.jsx'
import { LanguageContext } from '../context/LanguageContext.jsx'
import { ToastContext } from '../context/ToastContext.jsx'
import { ROUTES } from '../routes.js'
import * as historyModule from '../history.js'

describe('HistoryPage (FE3-13)', () => {
  let container
  let root
  let mockToastShow

  const sampleSummaries = [
    {
      id: 'item-1',
      created_at: '2026-10-23T10:00:00Z',
      level: 'red',
      risk_score: 91,
      input_type: 'text',
      flag_categories: ['brand_lookalike', 'fear'],
      explanation_source: 'template',
      model_version: 'v2',
      reported: false,
      checked_on_device: true,
      lang: 'en',
    },
    {
      id: 'item-2',
      created_at: '2026-10-23T09:00:00Z',
      level: 'amber',
      risk_score: 55,
      input_type: 'url',
      flag_categories: ['urgency'],
      explanation_source: 'template',
      model_version: 'v2',
      reported: true,
      checked_on_device: false,
      lang: 'en',
    },
    {
      id: 'item-3',
      created_at: '2026-10-23T08:00:00Z',
      level: 'green',
      risk_score: 4,
      input_type: 'text',
      flag_categories: [],
      explanation_source: 'template',
      model_version: 'v2',
      reported: false,
      checked_on_device: false,
      lang: 'en',
    },
  ]

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    mockToastShow = vi.fn()

    // Mock HTMLDialogElement methods in JSDOM
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function () {
        this.setAttribute('open', '')
      }
    }
    if (!HTMLDialogElement.prototype.close) {
      HTMLDialogElement.prototype.close = function () {
        this.removeAttribute('open')
      }
    }

    vi.spyOn(historyModule, 'isStorageAvailable').mockReturnValue(true)
    vi.spyOn(historyModule, 'listSummaries').mockReturnValue([...sampleSummaries])
    vi.spyOn(historyModule, 'clearHistory').mockImplementation(() => {})
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    container = null
    root = null
    vi.restoreAllMocks()
  })

  function renderPage(lang = 'en') {
    const langValue = { lang, setLang: vi.fn() }
    const toastValue = { show: mockToastShow, removeToast: vi.fn(), toasts: [] }

    act(() => {
      root.render(
        <ToastContext.Provider value={toastValue}>
          <LanguageContext.Provider value={langValue}>
            <MemoryRouter initialEntries={[ROUTES.history]}>
              <Routes>
                <Route path={ROUTES.history} element={<HistoryPage />} />
              </Routes>
            </MemoryRouter>
          </LanguageContext.Provider>
        </ToastContext.Provider>
      )
    })
  }

  it('renders history items with scores, badges, tags, and device note', () => {
    renderPage()
    expect(container.textContent).toContain('Event History')
    expect(container.textContent).toContain('History stays on this device. It never includes your messages.')
    expect(container.textContent).toContain('Score: 91 / 100')
    expect(container.textContent).toContain('Score: 55 / 100')
    expect(container.textContent).toContain('Score: 4 / 100')
    expect(container.textContent).toContain('On device')
    expect(container.textContent).toContain('Reported')
  })

  it('filters items correctly via RubberSegment radio buttons', () => {
    renderPage()

    // Find the radio button for 'Checkmate'
    const checkmateRadio = container.querySelector('button[role="radio"][aria-checked="false"][tabindex="-1"]')
    const allRadios = Array.from(container.querySelectorAll('button[role="radio"]'))
    const redRadio = allRadios.find(r => r.textContent.includes('Checkmate'))
    expect(redRadio).toBeTruthy()

    // Switch to Checkmate filter
    act(() => {
      redRadio.click()
    })

    expect(container.textContent).toContain('Score: 91 / 100')
    expect(container.textContent).not.toContain('Score: 55 / 100')
    expect(container.textContent).not.toContain('Score: 4 / 100')

    // Switch to Safe filter
    const safeRadio = allRadios.find(r => r.textContent.includes('Safe'))
    act(() => {
      safeRadio.click()
    })
    expect(container.textContent).toContain('Score: 4 / 100')
    expect(container.textContent).not.toContain('Score: 91 / 100')

    // Switch to Reported filter
    const reportedRadio = allRadios.find(r => r.textContent.includes('Reported'))
    act(() => {
      reportedRadio.click()
    })
    expect(container.textContent).toContain('Score: 55 / 100')
    expect(container.textContent).not.toContain('Score: 91 / 100')
  })

  it('shows appropriate empty states per filter when no matches exist', () => {
    // Only safe items in history
    vi.spyOn(historyModule, 'listSummaries').mockReturnValue([sampleSummaries[2]])
    renderPage()

    const allRadios = Array.from(container.querySelectorAll('button[role="radio"]'))
    const redRadio = allRadios.find(r => r.textContent.includes('Checkmate'))

    act(() => {
      redRadio.click()
    })

    expect(container.textContent).toContain('No Checkmate results yet.')
  })

  it('clears history via confirm dialog and shows success toast', () => {
    renderPage()

    // Click "Clear history…" button
    const clearBtn = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent.includes('Clear history…')
    )
    expect(clearBtn).toBeTruthy()

    act(() => {
      clearBtn.click()
    })

    // Dialog should be open
    const dialog = container.querySelector('dialog')
    expect(dialog).toBeTruthy()

    // Click "Clear history" confirm button inside the dialog
    const confirmBtn = Array.from(dialog.querySelectorAll('button')).find(
      b => b.textContent === 'Clear history'
    )
    expect(confirmBtn).toBeTruthy()

    act(() => {
      confirmBtn.click()
    })

    expect(historyModule.clearHistory).toHaveBeenCalled()
    expect(mockToastShow).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: 'History cleared' })
    )
    expect(container.textContent).toContain('No checks yet.')
  })
})
