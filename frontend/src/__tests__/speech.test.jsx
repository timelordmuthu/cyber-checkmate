import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { pickVoice } from '@/lib/speech.js'
import SpeakButton from '@/components/SpeakButton.jsx'
import MicButton from '@/components/MicButton.jsx'
import { LanguageProvider } from '@/context/LanguageContext.jsx'

describe('Speech & Voice Input (FE3-17)', () => {
  const originalSpeechSynthesis = window.speechSynthesis
  const originalSpeechRecognition = window.SpeechRecognition
  const originalWebkitSpeechRecognition = window.webkitSpeechRecognition

  let container = null
  let root = null

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    sessionStorage.clear()
  })

  afterEach(() => {
    if (root) {
      act(() => root.unmount())
    }
    if (container) {
      container.remove()
    }
    window.speechSynthesis = originalSpeechSynthesis
    window.SpeechRecognition = originalSpeechRecognition
    window.webkitSpeechRecognition = originalWebkitSpeechRecognition
    vi.restoreAllMocks()
  })

  describe('pickVoice logic', () => {
    beforeEach(() => {
      window.speechSynthesis = {
        getVoices: vi.fn(() => [
          { name: 'Google हिन्दी', lang: 'hi-IN' },
          { name: 'Google UK English Female', lang: 'en-GB' },
          { name: 'Microsoft David Desktop', lang: 'en-US' },
          { name: 'Google Tamil', lang: 'ta-IN' },
        ]),
        speak: vi.fn(),
        cancel: vi.fn(),
      }
      window.SpeechSynthesisUtterance = function (text) {
        this.text = text
        this.lang = ''
        this.rate = 1
      }
    })

    it('finds an exact match (case-insensitive and normalising _ to -)', () => {
      const voice = pickVoice('hi-IN')
      expect(voice).toBeDefined()
      expect(voice.lang).toBe('hi-IN')

      const underscoreVoice = pickVoice('hi_in')
      expect(underscoreVoice).toBeDefined()
      expect(underscoreVoice.lang).toBe('hi-IN')
    })

    it('falls back to 2-letter language prefix match when exact match is missing', () => {
      // Requested 'en-IN', but available voices only have 'en-GB' and 'en-US'
      const voice = pickVoice('en-IN')
      expect(voice).toBeDefined()
      expect(voice.lang.startsWith('en')).toBe(true)
    })

    it('returns null when no matching voice or prefix exists', () => {
      const voice = pickVoice('fr-FR')
      expect(voice).toBeNull()
    })

    it('returns null if voice list is empty', () => {
      window.speechSynthesis.getVoices = vi.fn(() => [])
      expect(pickVoice('en-IN')).toBeNull()
    })
  })

  describe('SpeakButton', () => {
    it('is hidden when canSpeak() is false', async () => {
      // Remove speechSynthesis
      delete window.speechSynthesis

      await act(async () => {
        root.render(
          <LanguageProvider>
            <SpeakButton text="Hello world" />
          </LanguageProvider>
        )
      })

      expect(container.innerHTML).toBe('')
      expect(container.querySelector('button')).toBeNull()
    })

    it('renders and toggles reading state when supported', async () => {
      const cancelMock = vi.fn()
      const speakMock = vi.fn()
      window.speechSynthesis = {
        getVoices: vi.fn(() => [{ name: 'Test English', lang: 'en-IN' }]),
        speak: speakMock,
        cancel: cancelMock,
      }
      window.SpeechSynthesisUtterance = function (text) {
        this.text = text
      }

      await act(async () => {
        root.render(
          <LanguageProvider>
            <SpeakButton getText={() => 'Checkmate: likely scam. Do not pay.'} />
          </LanguageProvider>
        )
      })

      const btn = container.querySelector('button')
      expect(btn).not.toBeNull()
      expect(btn.getAttribute('aria-pressed')).toBe('false')

      await act(async () => {
        btn.click()
      })

      expect(speakMock).toHaveBeenCalled()
      expect(btn.getAttribute('aria-pressed')).toBe('true')
      expect(container.textContent).toContain('Stop')

      // Clicking again stops speech
      await act(async () => {
        btn.click()
      })
      expect(cancelMock).toHaveBeenCalled()
      expect(btn.getAttribute('aria-pressed')).toBe('false')
    })
  })

  describe('MicButton', () => {
    it('is hidden when canListen() is false', async () => {
      delete window.SpeechRecognition
      delete window.webkitSpeechRecognition

      await act(async () => {
        root.render(<MicButton onText={() => {}} />)
      })

      expect(container.innerHTML).toBe('')
      expect(container.querySelector('button')).toBeNull()
    })

    it('appends text and invokes onText callback', async () => {
      let recognitionInstance = null

      class MockSpeechRecognition {
        constructor() {
          recognitionInstance = this
          this.lang = ''
          this.interimResults = false
          this.maxAlternatives = 1
          this.continuous = false
          this.start = vi.fn()
          this.stop = vi.fn()
          this.abort = vi.fn()
        }
      }

      window.SpeechRecognition = MockSpeechRecognition

      let currentText = 'Initial warning'
      const handleText = (transcript) => {
        currentText = currentText.trim() ? `${currentText.trim()} ${transcript}` : transcript
      }

      await act(async () => {
        root.render(<MicButton onText={handleText} />)
      })

      const btn = container.querySelector('button')
      expect(btn).not.toBeNull()
      expect(btn.getAttribute('aria-label')).toBe('Start voice input')

      // Start listening
      await act(async () => {
        btn.click()
      })

      expect(recognitionInstance).not.toBeNull()
      expect(recognitionInstance.start).toHaveBeenCalled()
      expect(container.textContent).toContain('Listening… tap to stop')

      // Simulate recognition event
      act(() => {
        recognitionInstance.onresult({
          results: [[{ transcript: 'urgent KYC update required' }]],
        })
      })

      expect(currentText).toBe('Initial warning urgent KYC update required')
    })
  })
})
