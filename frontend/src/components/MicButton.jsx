import { useState, useRef, useEffect } from 'react'
import { Mic } from '@/lib/icons.js'
import { canListen, startListening } from '@/lib/speech.js'

export default function MicButton({
  onText,
  onTranscript,
  lang = 'en',
  disabled = false,
  className = '',
}) {
  const [isListening, setIsListening] = useState(false)
  const [showNotice, setShowNotice] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const stopFnRef = useRef(null)

  useEffect(() => {
    return () => {
      if (stopFnRef.current) {
        stopFnRef.current()
      }
    }
  }, [])

  if (!canListen()) {
    return null
  }

  const handleToggle = () => {
    if (disabled) return

    if (isListening) {
      if (stopFnRef.current) {
        stopFnRef.current()
        stopFnRef.current = null
      }
      setIsListening(false)
      return
    }

    // First click check per session
    try {
      const seen = sessionStorage.getItem('cc_mic_notice_seen')
      if (!seen) {
        setShowNotice(true)
        sessionStorage.setItem('cc_mic_notice_seen', '1')
      }
    } catch {
      // Storage access error fallback
    }

    setErrorMsg('')
    setIsListening(true)

    const stop = startListening(lang, {
      onResult: (transcript) => {
        if (onText) onText(transcript)
        if (onTranscript) onTranscript(transcript)
      },
      onError: (err) => {
        setIsListening(false)
        if (err?.error === 'not-allowed') {
          setErrorMsg('Microphone permission was denied.')
        } else {
          setErrorMsg("Couldn't hear that. Try again.")
        }
      },
      onEnd: () => {
        setIsListening(false)
      },
    })

    stopFnRef.current = stop
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        aria-label={isListening ? 'Stop listening' : 'Start voice input'}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer border ${
          isListening
            ? 'bg-risk-red/20 text-risk-red border-risk-red/50 shadow-sm'
            : 'bg-cc-pine hover:bg-cc-juniper text-cc-mint border-cc-juniper/50'
        } ${className}`}
      >
        {isListening ? (
          <>
            <span
              className="inline-block w-2 h-2 rounded-full bg-risk-red animate-ping mr-0.5"
              aria-hidden="true"
            />
            <span>Listening… tap to stop</span>
          </>
        ) : (
          <>
            <Mic className="w-3.5 h-3.5 text-cc-glow" />
            <span>Voice input</span>
          </>
        )}
      </button>

      {showNotice && (
        <span className="text-[11px] text-cc-glow/80 leading-tight">
          Your browser&apos;s speech service may process the audio.
        </span>
      )}

      {errorMsg && (
        <span className="text-[11px] text-risk-red leading-tight font-medium" role="alert">
          {errorMsg}
        </span>
      )}
    </div>
  )
}
