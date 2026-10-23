import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import ReportPanel from '../components/ReportPanel.jsx'
import { AnalysisContext } from '../context/AnalysisContext.jsx'
import { ToastContext } from '../context/ToastContext.jsx'
import * as apiModule from '../api.js'
import * as historyModule from '../history.js'
import reportRequestSchema from '@contracts/schemas/report-request.schema.json'
import redKycFixture from '@contracts/fixtures/analyze_red_kyc_en.json'

describe('ReportPanel (FE3-14)', () => {
  let container
  let root
  let mockToastShow
  let ajvValidate

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    mockToastShow = vi.fn()

    const ajv = new Ajv2020({ allErrors: true })
    addFormats(ajv)
    ajvValidate = ajv.compile(reportRequestSchema)

    // Mock HTMLDialogElement in JSDOM
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

    vi.spyOn(historyModule, 'markReported').mockImplementation(() => true)
    vi.spyOn(historyModule, 'listSummaries').mockReturnValue([{ id: 'test-summary-1' }])
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

  function renderPanel(result = redKycFixture, lastInput = { text: 'Fake KYC message', url: '' }) {
    const analysisValue = {
      result,
      lastInput,
      fallback: false,
      setResult: vi.fn(),
      clearResult: vi.fn(),
    }
    const toastValue = {
      show: mockToastShow,
      removeToast: vi.fn(),
      toasts: [],
    }

    act(() => {
      root.render(
        <ToastContext.Provider value={toastValue}>
          <AnalysisContext.Provider value={analysisValue}>
            <ReportPanel />
          </AnalysisContext.Provider>
        </ToastContext.Provider>
      )
    })
  }

  it('renders report buttons and triggers confirmation dialog', () => {
    renderPanel()
    expect(container.textContent).toContain('Was this right?')

    const scamBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes("It's a scam")
    )
    expect(scamBtn).toBeTruthy()

    act(() => {
      scamBtn.click()
    })

    const dialog = container.querySelector('dialog')
    expect(dialog).toBeTruthy()
    expect(dialog.textContent).toContain('Send this message for review?')
    expect(dialog.textContent).toContain('To improve CyberCheckmate, the message text and links will be sent to our team and stored for review.')
  })

  it('cancels report dialog and sends nothing', () => {
    const sendSpy = vi.spyOn(apiModule, 'sendReport')
    renderPanel()

    const scamBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes("It's a scam")
    )
    act(() => {
      scamBtn.click()
    })

    const cancelBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Cancel')
    )
    expect(cancelBtn).toBeTruthy()

    act(() => {
      cancelBtn.click()
    })

    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('confirm calls sendReport with exactly the 6 contract fields validated via Ajv', async () => {
    let capturedPayload = null
    const sendSpy = vi.spyOn(apiModule, 'sendReport').mockImplementation(async (payload) => {
      capturedPayload = payload
      return { status: 'ok', id: 'rep_123' }
    })

    renderPanel()

    const scamBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes("It's a scam")
    )
    act(() => {
      scamBtn.click()
    })

    const confirmBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Send for review')
    )
    expect(confirmBtn).toBeTruthy()

    await act(async () => {
      confirmBtn.click()
    })

    expect(sendSpy).toHaveBeenCalledTimes(1)
    expect(capturedPayload).toBeTruthy()

    // Verify all 6 required fields exist
    expect(capturedPayload).toHaveProperty('text')
    expect(capturedPayload).toHaveProperty('urls')
    expect(capturedPayload).toHaveProperty('user_label')
    expect(capturedPayload).toHaveProperty('predicted_level')
    expect(capturedPayload).toHaveProperty('predicted_score')
    expect(capturedPayload).toHaveProperty('model_version')

    // Validate strictly against JSON schema
    const isValid = ajvValidate(capturedPayload)
    expect(isValid, JSON.stringify(ajvValidate.errors)).toBe(true)

    // Verify success toast and UI state
    expect(mockToastShow).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: 'Thanks! Sent for review.' })
    )
    expect(historyModule.markReported).toHaveBeenCalled()
    expect(container.textContent).toContain('Reported')
  })

  it('uses URL as text when text is empty (link-only report)', async () => {
    let capturedPayload = null
    vi.spyOn(apiModule, 'sendReport').mockImplementation(async (payload) => {
      capturedPayload = payload
      return { status: 'ok' }
    })

    const urlOnlyFixture = {
      ...redKycFixture,
      extracted_text: '',
      urls_found: ['https://example.com/login'],
    }
    renderPanel(urlOnlyFixture, { text: '', url: 'https://example.com/login' })

    const legitBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes("It's safe")
    )
    act(() => {
      legitBtn.click()
    })

    const confirmBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Send for review')
    )
    await act(async () => {
      confirmBtn.click()
    })

    expect(capturedPayload.text).toBe('https://example.com/login')
    expect(capturedPayload.user_label).toBe('legit')
    const isValid = ajvValidate(capturedPayload)
    expect(isValid, JSON.stringify(ajvValidate.errors)).toBe(true)
  })

  it('handles 429 rate limit error and shows toast with server message', async () => {
    const error429 = new Error('You have sent too many reports. Please wait 15 minutes.')
    error429.status = 429
    vi.spyOn(apiModule, 'sendReport').mockRejectedValue(error429)

    renderPanel()

    const scamBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes("It's a scam")
    )
    act(() => {
      scamBtn.click()
    })

    const confirmBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Send for review')
    )
    await act(async () => {
      confirmBtn.click()
    })

    expect(mockToastShow).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        title: 'You have sent too many reports. Please wait 15 minutes.',
      })
    )
  })
})
