import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

import CheckPage from '../pages/CheckPage.jsx'
import { AnalysisProvider } from '../context/AnalysisContext.jsx'
import { LanguageProvider } from '../context/LanguageContext.jsx'
import { ServerProvider } from '../context/ServerContext.jsx'
import { PrivateModeProvider } from '../context/PrivateModeContext.jsx'
import { ROUTES } from '../routes.js'
import * as api from '../api/index.js'
import * as history from '../history.js'
import { FeatureUnavailableError } from '../api/errors.js'

vi.mock('../api/index.js', async () => {
  const actual = await vi.importActual('../api/index.js')
  return {
    ...actual,
    analyze: vi.fn(),
    getHealth: vi.fn().mockResolvedValue({
      online: true,
      apiVersion: 2,
      ocr: true,
      translator: 'ready',
    }),
    getLanguages: vi.fn().mockResolvedValue({ languages: [] }),
    isMockMode: vi.fn(() => false),
  }
})

function changeValue(element, value) {
  const proto =
    element instanceof window.HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (setter) {
    setter.call(element, value)
  } else {
    element.value = value
  }
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('CheckPage (FE3-11)', () => {
  let container = null
  let root = null

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    history.clearHistory()
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

  async function renderCheck({ initialPath = ROUTES.check, initialEntries } = {}) {
    const entries = initialEntries || [initialPath]
    await act(async () => {
      root.render(
        createElement(
          MemoryRouter,
          { initialEntries: entries },
          createElement(
            LanguageProvider,
            null,
            createElement(
              ServerProvider,
              null,
              createElement(
                PrivateModeProvider,
                null,
                createElement(
                  AnalysisProvider,
                  null,
                  createElement(
                    Routes,
                    null,
                    createElement(Route, { path: ROUTES.check, element: createElement(CheckPage) }),
                    createElement(Route, {
                      path: ROUTES.result,
                      element: createElement('div', { id: 'result-target' }, 'Result Page'),
                    })
                  )
                )
              )
            )
          )
        )
      )
    })
  }

  it('Check is disabled on an empty textarea; typing enables it', async () => {
    await renderCheck()

    const submitBtn = container.querySelector('button[type="submit"]')
    expect(submitBtn).not.toBeNull()
    expect(submitBtn.disabled).toBe(true)

    // Empty mic slot exists beside the label
    const micSlot = container.querySelector('#mic-slot')
    expect(micSlot).not.toBeNull()

    const textarea = container.querySelector('textarea#message-input')
    expect(textarea).not.toBeNull()

    await act(async () => {
      changeValue(textarea, 'Urgent KYC update required')
    })

    expect(submitBtn.disabled).toBe(false)
    expect(container.textContent).toContain('26 / 5000')

    // Clearing textarea disables Check button again
    await act(async () => {
      changeValue(textarea, '   ')
    })
    expect(submitBtn.disabled).toBe(true)
  })

  it('sample pills fill the textarea and enable Check button', async () => {
    await renderCheck()

    const kycPill = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Fake bank KYC')
    )
    expect(kycPill).toBeDefined()

    await act(async () => {
      kycPill.click()
    })

    const textarea = container.querySelector('textarea#message-input')
    expect(textarea.value).toContain('SBI account KYC has expired')

    const submitBtn = container.querySelector('button[type="submit"]')
    expect(submitBtn.disabled).toBe(false)
  })

  it('a 6 MB file shows the size error and clears file input', async () => {
    await renderCheck()

    // Switch to Screenshot mode (value: 'image')
    const radios = container.querySelectorAll('[role="radio"]')
    await act(async () => {
      radios[2].click()
    })

    const fileInput = container.querySelector('input#screenshot-input')
    expect(fileInput).not.toBeNull()

    // File over 5 MB (6 MB)
    const largeFile = new File([new Uint8Array(6 * 1024 * 1024)], 'huge-screenshot.png', {
      type: 'image/png',
    })

    await act(async () => {
      Object.defineProperty(fileInput, 'files', {
        value: [largeFile],
        writable: true,
      })
      fileInput.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(container.textContent).toContain('This image is larger than 5 MB.')
    expect(container.textContent).not.toContain('huge-screenshot.png')

    const submitBtn = container.querySelector('button[type="submit"]')
    expect(submitBtn.disabled).toBe(true)
  })

  it('in mock mode, submitting navigates to /result and adds one history entry', async () => {
    vi.mocked(api.isMockMode).mockReturnValue(true)
    api.analyze.mockResolvedValueOnce({
      risk_score: 91,
      level: 'red',
      verdict: 'Checkmate',
      explanation_source: 'mock',
      flags: ['kyc', 'urgency'],
    })

    await renderCheck()

    const textarea = container.querySelector('textarea#message-input')
    await act(async () => {
      changeValue(textarea, 'Dear customer SBI KYC expired')
    })

    const submitBtn = container.querySelector('button[type="submit"]')
    expect(submitBtn.disabled).toBe(false)

    await act(async () => {
      submitBtn.click()
    })

    // Navigates to /result
    expect(container.querySelector('#result-target')).not.toBeNull()

    // Exactly one history entry added
    const entries = history.listSummaries()
    expect(entries.length).toBe(1)
    expect(entries[0].level).toBe('red')
    expect(entries[0].risk_score).toBe(91)
  })

  it('handles FeatureUnavailableError with specific message', async () => {
    api.analyze.mockRejectedValueOnce(new FeatureUnavailableError('/analyze'))

    await renderCheck()

    const textarea = container.querySelector('textarea#message-input')
    await act(async () => {
      changeValue(textarea, 'Some message text')
    })

    const submitBtn = container.querySelector('button[type="submit"]')
    await act(async () => {
      submitBtn.click()
    })

    // Wait for the ~600ms error display delay
    await act(async () => {
      await new Promise((r) => setTimeout(r, 700))
    })

    expect(container.textContent).toContain("This server can't check messages right now.")
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
  })

  it('pre-fills textarea and error from location.state', async () => {
    await renderCheck({
      initialEntries: [
        {
          pathname: ROUTES.check,
          state: {
            text: 'Pre-filled suspicious message from share',
            error: 'Failed to share message',
          },
        },
      ],
    })

    const textarea = container.querySelector('textarea#message-input')
    expect(textarea.value).toBe('Pre-filled suspicious message from share')
    expect(container.textContent).toContain('Failed to share message')
  })
})
