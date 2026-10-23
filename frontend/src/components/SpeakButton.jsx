import { useState, useEffect } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { VolumeHighIcon } from '@hugeicons/core-free-icons'
import { canSpeak, speak, stopSpeaking } from '@/lib/speech.js'
import { useLanguage } from '@/context/LanguageContext.jsx'

export default function SpeakButton({ getText, text, className = '', label = 'Read aloud' }) {
  const [speaking, setSpeaking] = useState(false)
  const [fallbackNote, setFallbackNote] = useState(false)
  const { lang = 'en' } = useLanguage() || {}

  if (!canSpeak()) {
    return null
  }

  const handleToggle = async () => {
    if (speaking) {
      stopSpeaking()
      setSpeaking(false)
      setFallbackNote(false)
      return
    }

    setFallbackNote(false)
    const contentToSpeak = getText ? getText(lang) : text
    if (!contentToSpeak) return

    setSpeaking(true)
    const res = await speak(contentToSpeak, lang)

    if (res?.utterance) {
      res.utterance.onend = () => setSpeaking(false)
      res.utterance.onerror = () => setSpeaking(false)
    }

    if (!res.voiceFound && lang !== 'en') {
      setFallbackNote(true)
      const enText = getText ? getText('en') : text
      if (enText) {
        const enRes = await speak(enText, 'en')
        if (enRes?.utterance) {
          enRes.utterance.onend = () => setSpeaking(false)
          enRes.utterance.onerror = () => setSpeaking(false)
        }
      }
    }
  }

  useEffect(() => {
    return () => {
      stopSpeaking()
    }
  }, [])

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={speaking}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-cc-pine bg-cc-deep hover:bg-cc-pine text-cc-mint transition-colors cursor-pointer ${
          speaking ? 'ring-1 ring-cc-glow border-cc-glow/50 text-cc-glow' : ''
        } ${className}`}
        aria-label={speaking ? 'Stop' : label}
      >
        <HugeiconsIcon icon={VolumeHighIcon} size={16} className={speaking ? 'text-risk-amber' : 'text-cc-glow'} />
        <span>{speaking ? 'Stop' : 'Read aloud'}</span>
      </button>

      {fallbackNote && (
        <span className="text-[11px] text-risk-amber leading-tight">
          No voice for this language on this device, reading in English.
        </span>
      )}
    </div>
  )
}
