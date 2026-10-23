/**
 * src/lib/speech.js
 * Speech synthesis (read-aloud) and Speech recognition (voice input).
 * FE PRD §8.2.
 */

export const BCP47_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  bn: 'bn-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
  or: 'or-IN',
}

/**
 * Returns true if Web Speech Synthesis is available in the current browser.
 */
export function canSpeak() {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'
  )
}

/**
 * Picks a voice matching bcp47 code:
 * 1. Exact match (case-insensitive, normalizing _ to -)
 * 2. Same 2-letter prefix (e.g. 'en', 'hi')
 * 3. Otherwise null
 */
export function pickVoice(bcp47) {
  if (!canSpeak()) return null
  const voices = window.speechSynthesis.getVoices() || []
  if (!voices.length) return null

  const target = (bcp47 || 'en-IN').toLowerCase().replace(/_/g, '-')
  const targetPrefix = target.slice(0, 2)

  // 1. Exact match
  const exact = voices.find(
    (v) => v.lang && v.lang.toLowerCase().replace(/_/g, '-') === target
  )
  if (exact) return exact

  // 2. Same 2-letter language prefix
  const prefixMatch = voices.find(
    (v) => v.lang && v.lang.toLowerCase().replace(/_/g, '-').slice(0, 2) === targetPrefix
  )
  if (prefixMatch) return prefixMatch

  return null
}

/**
 * Cancels current speech, selects a voice, and speaks text with rate 0.95.
 * If voices list is empty, waits once for 'voiceschanged' up to 1 s.
 * Returns { voiceFound: boolean, utterance?: SpeechSynthesisUtterance }.
 */
export async function speak(text, code = 'en') {
  if (!canSpeak() || !text) {
    return { voiceFound: false }
  }

  stopSpeaking()

  let voices = window.speechSynthesis.getVoices() || []
  if (voices.length === 0) {
    await new Promise((resolve) => {
      let resolved = false
      const done = () => {
        if (!resolved) {
          resolved = true
          if (typeof window.speechSynthesis.removeEventListener === 'function') {
            window.speechSynthesis.removeEventListener('voiceschanged', done)
          }
          resolve()
        }
      }
      if (typeof window.speechSynthesis.addEventListener === 'function') {
        window.speechSynthesis.addEventListener('voiceschanged', done)
      }
      setTimeout(done, 1000)
    })
    voices = window.speechSynthesis.getVoices() || []
  }

  const bcp47 = BCP47_MAP[code] || (code?.includes('-') ? code : `${code}-IN`) || 'en-IN'
  const voice = pickVoice(bcp47)
  const voiceFound = Boolean(voice)

  const utterance = new window.SpeechSynthesisUtterance(text)
  if (voice) {
    utterance.voice = voice
    utterance.lang = voice.lang
  } else {
    utterance.lang = bcp47 || 'en-IN'
  }
  utterance.rate = 0.95

  window.speechSynthesis.speak(utterance)
  return { voiceFound, utterance }
}

/**
 * Stops any speech currently in progress.
 */
export function stopSpeaking() {
  if (canSpeak()) {
    try {
      window.speechSynthesis.cancel()
    } catch {
      // Ignore cancel errors
    }
  }
}

/**
 * Returns true if Web Speech Recognition is supported.
 */
export function canListen() {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  )
}

/**
 * Starts listening for voice input.
 * Never auto-starts without being explicitly called.
 * Returns a stop function.
 */
export function startListening(code = 'en', { onResult, onError, onEnd } = {}) {
  if (!canListen()) return () => {}

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
  const recognition = new SpeechRec()
  const bcp47 = BCP47_MAP[code] || (code?.includes('-') ? code : `${code}-IN`) || 'en-IN'

  recognition.lang = bcp47
  recognition.interimResults = false
  recognition.maxAlternatives = 1
  recognition.continuous = false

  recognition.onresult = (event) => {
    const transcript = event?.results?.[0]?.[0]?.transcript || ''
    if (transcript && onResult) {
      onResult(transcript)
    }
  }

  recognition.onerror = (err) => {
    if (onError) onError(err)
  }

  recognition.onend = () => {
    if (onEnd) onEnd()
  }

  try {
    recognition.start()
  } catch (err) {
    if (onError) onError(err)
  }

  return () => {
    try {
      if (typeof recognition.abort === 'function') {
        recognition.abort()
      } else if (typeof recognition.stop === 'function') {
        recognition.stop()
      }
    } catch {
      // Ignore stop errors
    }
  }
}
