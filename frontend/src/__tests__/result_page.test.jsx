import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ResultPage from '../pages/ResultPage.jsx'
import { AnalysisContext } from '../context/AnalysisContext.jsx'
import { LanguageContext } from '../context/LanguageContext.jsx'
import { ToastContext } from '../context/ToastContext.jsx'
import { ROUTES } from '../routes.js'

import redKycFixture from '@contracts/fixtures/analyze_red_kyc_en.json'
import greenOtpFixture from '@contracts/fixtures/analyze_green_otp.json'
import urlOnlyFixture from '@contracts/fixtures/analyze_url_only_official.json'
import taTranslatedFixture from '@contracts/fixtures/analyze_ta_translated.json'
import taFailedFixture from '@contracts/fixtures/analyze_ta_translation_failed.json'
import v1LegacyFixture from '@contracts/fixtures/analyze_v1_legacy.json'

// Mock FxGate to render children directly for predictable testing
vi.mock('../components/FxGate.jsx', () => ({
  default: ({ children, fallback }) => children || fallback,
}))

describe('ResultPage (FE3-12)', () => {
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

  function renderPage(result, lang = 'en') {
    const analysisValue = {
      result,
      setResult: vi.fn(),
      clearResult: vi.fn(),
      lastInput: null,
      fallback: false,
    }
    const langValue = {
      lang,
      setLang: vi.fn(),
    }

    act(() => {
      root.render(
        <ToastContext.Provider value={{ show: vi.fn(), removeToast: vi.fn(), toasts: [] }}>
          <LanguageContext.Provider value={langValue}>
            <AnalysisContext.Provider value={analysisValue}>
              <MemoryRouter initialEntries={[ROUTES.result]}>
                <Routes>
                  <Route path={ROUTES.result} element={<ResultPage />} />
                </Routes>
              </MemoryRouter>
            </AnalysisContext.Provider>
          </LanguageContext.Provider>
        </ToastContext.Provider>
      )
    })
  }

  it('1. analyze_red_kyc_en fixture shows Checkmate, score, and Golden Hour link', () => {
    renderPage(redKycFixture)
    expect(container.textContent).toContain('Checkmate')
    expect(container.textContent).toContain('91')
    expect(container.textContent).toContain('Paid a scammer? Golden Hour Help')
    expect(container.textContent).toContain('Pretends to be an official or company')
  })

  it('2. analyze_green_otp fixture shows Safe and does not show Golden Hour button', () => {
    renderPage(greenOtpFixture)
    expect(container.textContent).toContain('Safe')
    expect(container.textContent).not.toContain('Paid a scammer? Golden Hour Help')
    expect(container.textContent).toContain('No warning signs found.')
  })

  it('3. analyze_url_only_official fixture shows "Not used (link only)" in TechnicalDetails', () => {
    renderPage(urlOnlyFixture)
    expect(container.textContent).toContain('Safe')
    expect(container.textContent).toContain('Not used (link only)')
  })

  it('4. analyze_ta_translated fixture with lang="ta" shows advice and translation box', () => {
    renderPage(taTranslatedFixture, 'ta')
    expect(container.textContent).toContain('Checkmate')
    expect(container.textContent).toContain('What we understood')
    expect(container.textContent).toContain(taTranslatedFixture.language.translation)
  })

  it('5. analyze_ta_translation_failed fixture shows limited accuracy warning', () => {
    renderPage(taFailedFixture, 'ta')
    expect(container.textContent).toContain('Limited accuracy warning')
  })

  it('6. analyze_v1_legacy fixture renders cleanly without crashing', () => {
    renderPage(v1LegacyFixture)
    expect(container.textContent).toContain('Checkmate')
    expect(container.textContent).toContain('Do not click the link or reply.')
  })
})
