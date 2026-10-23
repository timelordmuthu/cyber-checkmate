import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import RubberSegment from '@/components/reactbits/RubberSegment.jsx'
import LatticeLoader from '@/components/reactbits/LatticeLoader.jsx'
import DotGrid from '@/components/reactbits/DotGrid.jsx'
import FxGate from '@/components/FxGate.jsx'
import { analyze, isMockMode } from '@/api/index.js'
import { FeatureUnavailableError } from '@/api/errors.js'
import { saveSummary } from '@/history.js'
import { useAnalysis } from '@/context/AnalysisContext.jsx'
import { useLanguage } from '@/context/LanguageContext.jsx'
import { useServer } from '@/context/ServerContext.jsx'
import { usePrivateMode } from '@/context/PrivateModeContext.jsx'
import MicButton from '@/components/MicButton.jsx'
import { ROUTES } from '@/routes.js'

const MODES = [
  { value: 'message', label: 'Message' },
  { value: 'link', label: 'Link' },
  { value: 'image', label: 'Screenshot' },
]

const SAMPLE_MESSAGES = [
  {
    label: 'Fake bank KYC',
    text: 'Dear customer, your SBI account KYC has expired. Update within 24 hours at http://sbi-kyc-update.xyz/login or your account will be blocked. Pay Rs 10 verification fee to sbi.kyc@ybl. Helpline 98XXXXXX12',
  },
  {
    label: 'Real bank OTP',
    text: '123456 is your OTP for transaction of Rs 1,500.00 at AMAZON on card ending 4321. OTP valid for 5 mins. Do not share with anyone. - SBI',
  },
  {
    label: 'Digital arrest',
    text: 'CBI NOTICE: Your Aadhaar has been linked to 16 money laundering bank accounts in Mumbai. Digital arrest warrant issued. Contact Cyber Crime DCP immediately on WhatsApp 98XXXXXX34 or face police raid within 2 hours.',
  },
  {
    label: 'Job offer',
    text: 'Congratulations! You have been selected for Part-time YouTube Video Liking Job. Earn Rs 3,000 to Rs 8,000 daily from home. No experience needed. Join Telegram: t.me/easy-job-98XXXXXX56',
  },
  {
    label: 'Friend texting',
    text: "Hey, are you free this weekend? Let's grab dinner at the new cafe near the metro station around 7pm.",
  },
]

const SAMPLE_LINKS = [
  {
    label: 'Official SBI link',
    url: 'https://www.onlinesbi.sbi/',
  },
  {
    label: 'Fake SBI link',
    url: 'http://sbi-kyc-update.xyz/login',
  },
]

export default function CheckPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setResult } = useAnalysis()
  const { lang } = useLanguage()
  const { online, ocr, apiVersion } = useServer()
  const { privateMode } = usePrivateMode()

  const [mode, setMode] = useState('message')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loaderStatus, setLoaderStatus] = useState('working')
  const [generalError, setGeneralError] = useState('')

  const errorBoxRef = useRef(null)
  const fileInputRef = useRef(null)

  // Navigation state prefill & PWA share intake (FE PRD §7, PWA share_target)
  useEffect(() => {
    try {
      const prefill = sessionStorage.getItem('cc_prefill')
      if (prefill) {
        setText(prefill)
        setMode('message')
        sessionStorage.removeItem('cc_prefill')
      }
    } catch {
      // ignore storage access errors in private browsing/sandboxes
    }

    if (location.state?.text) {
      setText(location.state.text)
      setMode('message')
    }
    if (location.state?.error) {
      setGeneralError(location.state.error)
    }
  }, [location.state])

  const previewUrl = useMemo(() => {
    if (!file) return null
    return URL.createObjectURL(file)
  }, [file])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    if (generalError && errorBoxRef.current) {
      errorBoxRef.current.focus()
    }
  }, [generalError])

  // Screenshot disabled condition & reason (FE PRD §7, §8.3)
  const screenshotDisabledReason = useMemo(() => {
    if (privateMode) {
      return 'Screenshots need the server. Turn off private mode in Settings.'
    }
    if (online === false) {
      return 'Screenshots need the server, which is offline.'
    }
    if (!ocr && apiVersion >= 2) {
      return "Screenshot reading isn't available on this server."
    }
    return null
  }, [privateMode, online, ocr, apiVersion])

  const handleFileChange = (e) => {
    const chosen = e.target.files?.[0] || null
    if (!chosen) {
      setFile(null)
      return
    }

    if (chosen.type && !chosen.type.startsWith('image/')) {
      setGeneralError('Please select a valid image file (PNG, JPEG, WebP).')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // Over 5 MB -> "This image is larger than 5 MB." and clear the input
    const MAX_SIZE = 5 * 1024 * 1024
    if (chosen.size > MAX_SIZE) {
      setGeneralError('This image is larger than 5 MB.')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setGeneralError('')
    setFile(chosen)
  }

  const handleRemoveFile = () => {
    setFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Check button disabled state
  const isInputEmpty = useMemo(() => {
    if (mode === 'message') return !text.trim()
    if (mode === 'link') return !url.trim()
    if (mode === 'image') return !file || Boolean(screenshotDisabledReason)
    return true
  }, [mode, text, url, file, screenshotDisabledReason])

  const handleCheck = async (e) => {
    if (e) e.preventDefault()

    const trimmedText = mode === 'message' ? text.trim() : ''
    const trimmedUrl = mode === 'link' ? url.trim() : ''
    const currentFile = mode === 'image' ? file : null

    if (mode === 'message' && !trimmedText) {
      setGeneralError('Please enter a message to check.')
      return
    }

    if (mode === 'link' && !trimmedUrl) {
      setGeneralError('Please enter a link to check.')
      return
    }

    if (mode === 'image') {
      if (screenshotDisabledReason) {
        setGeneralError(screenshotDisabledReason)
        return
      }
      if (!currentFile) {
        setGeneralError('Please select a screenshot image to check.')
        return
      }
    }

    setGeneralError('')
    setLoading(true)
    setLoaderStatus('working')

    try {
      const result = await analyze({
        text: trimmedText,
        url: trimmedUrl,
        image: currentFile,
        lang: lang || 'en',
      })

      const summary = saveSummary(result, {
        checked_on_device: result.explanation_source === 'on-device',
        lang: lang || 'en',
      })

      setResult(result, {
        text: trimmedText,
        url: trimmedUrl,
        image: currentFile,
        summaryId: summary && summary.id,
      })

      navigate(ROUTES.result)
    } catch (err) {
      setLoaderStatus('error')
      await new Promise((r) => setTimeout(r, 600))

      let msg = err?.message || 'An unexpected error occurred while checking.'
      if (err instanceof FeatureUnavailableError || err?.name === 'FeatureUnavailableError') {
        msg = "This server can't check messages right now."
      }
      setGeneralError(msg)
    } finally {
      setLoading(false)
      setLoaderStatus('working')
    }
  }

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      if (!loading && !isInputEmpty) {
        handleCheck()
      }
    }
  }

  const mockActive = isMockMode()

  return (
    <div
      onKeyDown={handleKeyDown}
      className="relative min-h-[75dvh] flex flex-col justify-center max-w-2xl mx-auto py-4"
    >
      {/* ── Background Dot Grid inside FxGate (FE PRD §7, lite and full only) ── */}
      <FxGate
        need="lite"
        fallback={
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,#163832,#051F20_80%)] pointer-events-none" />
        }
      >
        <div className="absolute inset-0 -z-10 rounded-3xl overflow-hidden opacity-30 pointer-events-none">
          <DotGrid
            baseColor="#163832"
            activeColor="#8EB698"
            dotSize={3}
            gap={24}
            opacity={0.35}
          />
        </div>
      </FxGate>

      {/* ── LatticeLoader Full-screen Overlay ── */}
      {loading && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-50 bg-cc-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4"
        >
          <div className="bg-cc-deep border border-cc-juniper/70 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <LatticeLoader
              label="Checking…"
              status={loaderStatus}
              color="#8EB698"
              errorColor="#EF4444"
              gap={3}
              cellSize={7}
            />
          </div>
        </div>
      )}

      <div className="space-y-6 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-cc-mint font-heading">
              Check a Message
            </h1>
            <p className="text-sm text-cc-glow mt-1 leading-relaxed">
              Scan suspicious SMS, WhatsApp forwards, payment requests, or links before you click.
            </p>
          </div>
          {mockActive && (
            <span className="self-start sm:self-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-cc-pine text-cc-glow border border-cc-glow/30">
              Demo data
            </span>
          )}
        </div>

        {/* ── RubberSegment Mode Selector ── */}
        <div className="flex justify-center sm:justify-start">
          <RubberSegment
            items={MODES}
            value={mode}
            onChange={(val) => {
              setMode(val)
              setGeneralError('')
            }}
            trackColor="#0B2B26"
            thumbColor="#235347"
            textColor="#8EB698"
            activeTextColor="#DAF1DE"
            size="md"
            aria-label="What do you want to check?"
          />
        </div>

        <form onSubmit={handleCheck} className="space-y-5">
          <div className="bg-cc-deep/90 backdrop-blur-md border border-cc-juniper/70 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
            {/* ── Mode 1: Message ── */}
            {mode === 'message' && (
              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <label htmlFor="message-input" className="block text-sm font-semibold text-cc-mint">
                      Paste the message
                    </label>
                    {/* Mic slot for FE3-17 */}
                    <div id="mic-slot">
                      <MicButton
                        lang={lang}
                        onText={(transcript) => {
                          setText((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript))
                          const el = document.getElementById('message-input')
                          if (el) el.focus()
                        }}
                      />
                    </div>
                  </div>
                </div>
                <textarea
                  id="message-input"
                  rows={6}
                  maxLength={5000}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste an SMS, WhatsApp or email message…"
                  className="w-full bg-cc-black/90 border border-cc-juniper text-cc-mint placeholder-cc-glow/40 rounded-xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-cc-glow focus:border-transparent transition-all leading-relaxed"
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span
                    className={`text-xs font-mono ${
                      text.length > 4900 ? 'text-risk-amber' : 'text-cc-glow/70'
                    }`}
                    aria-live="polite"
                  >
                    {text.length} / 5000
                  </span>
                </div>

                {/* Sample Pills for Message */}
                <div className="flex flex-wrap items-center gap-1.5 pt-3">
                  <span className="text-[11px] text-cc-glow/60 mr-1 select-none font-mono">Sample:</span>
                  {SAMPLE_MESSAGES.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => {
                        setText(s.text)
                        setGeneralError('')
                      }}
                      className="text-xs px-2.5 py-1 rounded-lg bg-cc-pine/60 hover:bg-cc-juniper text-cc-mint border border-cc-juniper/40 transition-colors cursor-pointer"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Mode 2: Link ── */}
            {mode === 'link' && (
              <div>
                <label htmlFor="link-input" className="block text-sm font-semibold text-cc-mint mb-1.5">
                  Paste the link
                </label>
                <input
                  id="link-input"
                  type="text"
                  inputMode="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="e.g. sbi-kyc-update.xyz/login or https://..."
                  className="w-full bg-cc-black/90 border border-cc-juniper text-cc-mint placeholder-cc-glow/40 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cc-glow focus:border-transparent transition-all font-mono"
                />
                <p className="text-xs text-cc-glow/70 mt-1.5 leading-relaxed">
                  We never open the link. We only read its address.
                </p>

                {/* Sample Pills for Link */}
                <div className="flex flex-wrap items-center gap-1.5 pt-3">
                  <span className="text-[11px] text-cc-glow/60 mr-1 select-none font-mono">Sample:</span>
                  {SAMPLE_LINKS.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => {
                        setUrl(s.url)
                        setGeneralError('')
                      }}
                      className="text-xs px-2.5 py-1 rounded-lg bg-cc-pine/60 hover:bg-cc-juniper text-cc-mint border border-cc-juniper/40 transition-colors cursor-pointer"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Mode 3: Screenshot ── */}
            {mode === 'image' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="screenshot-input" className="block text-sm font-semibold text-cc-mint">
                    Add a screenshot
                  </label>
                  <span className="text-xs text-cc-glow/60 font-mono">Max 5 MB</span>
                </div>

                {screenshotDisabledReason ? (
                  <div className="p-4 rounded-xl bg-cc-black/60 border border-risk-amber/40 text-xs text-risk-amber space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <span>⚠️</span> Screenshot reading unavailable
                    </p>
                    <p className="text-cc-glow leading-relaxed">{screenshotDisabledReason}</p>
                  </div>
                ) : (
                  <div>
                    <input
                      id="screenshot-input"
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-cc-glow file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cc-pine file:text-cc-mint hover:file:bg-cc-juniper file:cursor-pointer cursor-pointer border border-dashed border-cc-juniper rounded-xl p-3 bg-cc-black/40"
                    />

                    {file && previewUrl && (
                      <div className="mt-3 p-3 rounded-xl bg-cc-black/80 border border-cc-pine flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <img
                            src={previewUrl}
                            alt="Screenshot preview"
                            className="w-12 h-12 object-cover rounded-lg border border-cc-juniper flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-cc-mint truncate">
                              {file.name}
                            </p>
                            <p className="text-[11px] text-cc-glow font-mono">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="text-xs font-semibold text-risk-red hover:underline px-2 py-1 rounded hover:bg-cc-deep transition-colors flex-shrink-0 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Error Banner with Retry ── */}
          {generalError && (
            <div
              ref={errorBoxRef}
              tabIndex={-1}
              className="text-sm font-medium text-risk-red bg-risk-red/10 border border-risk-red/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 outline-none"
              role="alert"
            >
              <div className="flex items-start gap-2">
                <span className="text-base select-none">⚠️</span>
                <span className="leading-relaxed">{generalError}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCheck()}
                disabled={loading}
                className="self-end sm:self-auto text-xs font-bold text-cc-mint bg-cc-pine hover:bg-cc-juniper px-3 py-1.5 rounded-lg transition-colors border border-cc-juniper flex-shrink-0 cursor-pointer"
              >
                Try again
              </button>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || isInputEmpty}
              className="w-full bg-cc-juniper hover:bg-cc-juniper/90 active:bg-cc-pine text-cc-mint font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base flex items-center justify-center gap-2 cursor-pointer font-heading"
            >
              <span>🔍</span>
              <span>Check</span>
            </button>
            <p className="text-[11px] text-center text-cc-glow/60 mt-2 font-mono">
              Press Ctrl + Enter to submit
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
