import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'

import { ServerProvider, useServer } from '../context/ServerContext.jsx'
import { PrivateModeProvider, usePrivateMode } from '../context/PrivateModeContext.jsx'
import { ToastProvider, useToast } from '../context/ToastContext.jsx'
import { AnalysisProvider, useAnalysis } from '../context/AnalysisContext.jsx'
import * as api from '../api/index.js'

// SwipeToast uses requestAnimationFrame + Web Animations API which don't
// work under vi.useFakeTimers() in jsdom. Replace it with a trivial stub
// that renders the title text so ToastContext tests can assert on text content.
vi.mock('../components/reactbits/SwipeToast.jsx', () => ({
  default: function SwipeToastStub({ open, title, description }) {
    if (!open) return null
    const text = title + (description ? ' ' + description : '')
    return text
  },
}))

vi.mock('../api/index.js', async () => {
  const actual = await vi.importActual('../api/index.js')
  return {
    ...actual,
    getHealth: vi.fn(),
    getLanguages: vi.fn(),
    isMockMode: vi.fn(() => false),
  }
})

describe('ServerContext', () => {
  let container = null
  let root = null

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    vi.useRealTimers()
  })

  function ServerConsumer() {
    const { online, apiVersion, ocr, translator, serverLanguages, legacy, refresh } = useServer()
    return (
      <div>
        <div data-testid="online">{String(online)}</div>
        <div data-testid="version">{apiVersion || 'null'}</div>
        <div data-testid="ocr">{String(ocr)}</div>
        <div data-testid="translator">{translator}</div>
        <div data-testid="languages">{serverLanguages.map((l) => l.code).join(',')}</div>
        <div data-testid="legacy">{String(legacy)}</div>
        <button id="refresh-btn" onClick={refresh}>Refresh</button>
      </div>
    )
  }

  it('populates initial health and languages on mount', async () => {
    vi.mocked(api.getHealth).mockResolvedValue({
      online: true,
      apiVersion: 2,
      ocr: true,
      translator: 'ready',
      translatorEngine: 'indictrans2',
      modelVersion: 'v2',
    })
    vi.mocked(api.getLanguages).mockResolvedValue({
      languages: [{ code: 'en' }, { code: 'hi' }, { code: 'ta' }],
      translator: 'ready',
      legacy: false,
    })

    await act(async () => {
      root.render(
        <ServerProvider>
          <ServerConsumer />
        </ServerProvider>
      )
    })

    // Allow promise resolution
    await act(async () => {
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="online"]').textContent).toBe('true')
    expect(container.querySelector('[data-testid="version"]').textContent).toBe('2')
    expect(container.querySelector('[data-testid="ocr"]').textContent).toBe('true')
    expect(container.querySelector('[data-testid="translator"]').textContent).toBe('ready')
    expect(container.querySelector('[data-testid="languages"]').textContent).toBe('en,hi,ta')
    expect(container.querySelector('[data-testid="legacy"]').textContent).toBe('false')
  })

  it('polls health every 30s while document is visible', async () => {
    vi.mocked(api.getHealth).mockResolvedValue({
      online: true,
      apiVersion: 2,
      ocr: true,
      translator: 'ready',
    })
    vi.mocked(api.getLanguages).mockResolvedValue({ languages: [], legacy: false })

    await act(async () => {
      root.render(
        <ServerProvider>
          <ServerConsumer />
        </ServerProvider>
      )
    })

    await act(async () => {
      await Promise.resolve()
    })
    expect(api.getHealth).toHaveBeenCalledTimes(1)

    // Advance 30s
    await act(async () => {
      vi.advanceTimersByTime(30000)
    })
    expect(api.getHealth).toHaveBeenCalledTimes(2)

    // Advance another 30s
    await act(async () => {
      vi.advanceTimersByTime(30000)
    })
    expect(api.getHealth).toHaveBeenCalledTimes(3)
  })

  it('stops polling when document.visibilityState is hidden', async () => {
    vi.mocked(api.getHealth).mockResolvedValue({
      online: true,
      apiVersion: 2,
      ocr: true,
      translator: 'ready',
    })
    vi.mocked(api.getLanguages).mockResolvedValue({ languages: [], legacy: false })

    await act(async () => {
      root.render(
        <ServerProvider>
          <ServerConsumer />
        </ServerProvider>
      )
    })

    await act(async () => {
      await Promise.resolve()
    })
    expect(api.getHealth).toHaveBeenCalledTimes(1)

    // Switch to hidden
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
      configurable: true,
    })

    // Advance 30s while hidden
    await act(async () => {
      vi.advanceTimersByTime(30000)
    })
    // Health should not have been called while hidden
    expect(api.getHealth).toHaveBeenCalledTimes(1)

    // Advance another 60s while hidden
    await act(async () => {
      vi.advanceTimersByTime(60000)
    })
    expect(api.getHealth).toHaveBeenCalledTimes(1)

    // Switch back to visible and fire event
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(api.getHealth).toHaveBeenCalledTimes(2)
  })

  it('refetches languages when server transitions from offline to online', async () => {
    vi.mocked(api.getHealth).mockResolvedValueOnce({
      online: false,
      apiVersion: null,
      ocr: false,
      translator: 'not_loaded',
    })
    vi.mocked(api.getLanguages).mockResolvedValue({ languages: [{ code: 'en' }], legacy: true })

    await act(async () => {
      root.render(
        <ServerProvider>
          <ServerConsumer />
        </ServerProvider>
      )
    })

    await act(async () => {
      await Promise.resolve()
    })
    expect(container.querySelector('[data-testid="online"]').textContent).toBe('false')
    expect(api.getLanguages).toHaveBeenCalledTimes(1)

    // Next poll brings it online
    vi.mocked(api.getHealth).mockResolvedValueOnce({
      online: true,
      apiVersion: 2,
      ocr: true,
      translator: 'ready',
    })

    await act(async () => {
      vi.advanceTimersByTime(30000)
    })

    expect(container.querySelector('[data-testid="online"]').textContent).toBe('true')
    // getLanguages should have been re-invoked on recovery
    expect(api.getLanguages).toHaveBeenCalledTimes(2)
  })
})

describe('PrivateModeContext', () => {
  let container = null
  let root = null

  beforeEach(() => {
    localStorage.clear()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  function PrivateModeConsumer() {
    const { privateMode, setPrivateMode } = usePrivateMode()
    return (
      <div>
        <div data-testid="mode">{String(privateMode)}</div>
        <button id="enable-btn" onClick={() => setPrivateMode(true)}>Enable</button>
        <button id="disable-btn" onClick={() => setPrivateMode(false)}>Disable</button>
      </div>
    )
  }

  it('defaults to false and toggles state with localStorage persistence', async () => {
    await act(async () => {
      root.render(
        <PrivateModeProvider>
          <PrivateModeConsumer />
        </PrivateModeProvider>
      )
    })

    expect(container.querySelector('[data-testid="mode"]').textContent).toBe('false')
    expect(localStorage.getItem('cc_private_mode')).toBeNull()

    // Enable
    await act(async () => {
      container.querySelector('#enable-btn').click()
    })
    expect(container.querySelector('[data-testid="mode"]').textContent).toBe('true')
    expect(localStorage.getItem('cc_private_mode')).toBe('1')

    // Disable
    await act(async () => {
      container.querySelector('#disable-btn').click()
    })
    expect(container.querySelector('[data-testid="mode"]').textContent).toBe('false')
    expect(localStorage.getItem('cc_private_mode')).toBe('0')
  })

  it('initializes to true if stored in localStorage', async () => {
    localStorage.setItem('cc_private_mode', '1')
    await act(async () => {
      root.render(
        <PrivateModeProvider>
          <PrivateModeConsumer />
        </PrivateModeProvider>
      )
    })
    expect(container.querySelector('[data-testid="mode"]').textContent).toBe('true')
  })
})

describe('ToastContext & Admin Expiry Listener', () => {
  let container = null
  let root = null

  beforeEach(() => {
    // Fake only timers needed by ToastContext (setTimeout/clearTimeout).
    // Exclude requestAnimationFrame so SwipeToast's rAF-based mount path
    // resolves without hanging under jsdom.
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    vi.useRealTimers()
  })

  function ToastConsumer() {
    const { show } = useToast()
    return (
      <button
        id="toast-btn"
        onClick={() => show({ type: 'success', title: 'Operation Successful' })}
      >
        Trigger Toast
      </button>
    )
  }

  it('shows toast and removes after timeout', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <ToastProvider>
            <ToastConsumer />
          </ToastProvider>
        </MemoryRouter>
      )
    })

    await act(async () => {
      container.querySelector('#toast-btn').click()
    })

    expect(container.textContent).toContain('Operation Successful')

    // Advance 4000ms
    await act(async () => {
      vi.advanceTimersByTime(4000)
    })

    expect(container.textContent).not.toContain('Operation Successful')
  })

  it('listens for cc:admin-expired event and shows error toast', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/console']}>
          <ToastProvider>
            <div>Console Content</div>
          </ToastProvider>
        </MemoryRouter>
      )
    })

    await act(async () => {
      window.dispatchEvent(new CustomEvent('cc:admin-expired'))
    })

    expect(container.textContent).toContain('Admin session expired.')
  })
})

describe('AnalysisContext: Zero Storage Leakage Guardrail', () => {
  let container = null
  let root = null

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  function AnalysisConsumer() {
    const { result, lastInput, setResult } = useAnalysis()
    return (
      <div>
        <div data-testid="score">{result ? result.risk_score : 'none'}</div>
        <div data-testid="text">{lastInput.text}</div>
        <button
          id="set-btn"
          onClick={() =>
            setResult(
              { risk_score: 95, level: 'red' },
              { text: 'SENSITIVE_CONFIDENTIAL_OTP_BANK_MESSAGE_7788' }
            )
          }
        >
          Set Result
        </button>
      </div>
    )
  }

  it('holds analysis result in memory and NEVER writes message text to storage', async () => {
    await act(async () => {
      root.render(
        <AnalysisProvider>
          <AnalysisConsumer />
        </AnalysisProvider>
      )
    })

    expect(container.querySelector('[data-testid="score"]').textContent).toBe('none')

    await act(async () => {
      container.querySelector('#set-btn').click()
    })

    expect(container.querySelector('[data-testid="score"]').textContent).toBe('95')
    expect(container.querySelector('[data-testid="text"]').textContent).toBe('SENSITIVE_CONFIDENTIAL_OTP_BANK_MESSAGE_7788')

    // Comprehensive audit of localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      const val = localStorage.getItem(key)
      expect(key).not.toContain('SENSITIVE_CONFIDENTIAL_OTP_BANK_MESSAGE_7788')
      expect(val).not.toContain('SENSITIVE_CONFIDENTIAL_OTP_BANK_MESSAGE_7788')
    }

    // Comprehensive audit of sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      const val = sessionStorage.getItem(key)
      expect(key).not.toContain('SENSITIVE_CONFIDENTIAL_OTP_BANK_MESSAGE_7788')
      expect(val).not.toContain('SENSITIVE_CONFIDENTIAL_OTP_BANK_MESSAGE_7788')
    }
  })
})
