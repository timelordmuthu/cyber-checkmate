import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useAnalysis } from '@/context/AnalysisContext.jsx'
import { ROUTES } from '@/routes.js'
import VerdictBadge from '@/components/VerdictBadge.jsx'
import SpeakButton from '@/components/SpeakButton.jsx'

const TIPS_MAP = {
  kyc_scam: 'Banks never ask for Aadhaar or PAN over WhatsApp.',
  payment_scam: 'Scan QR codes only on official bank apps.',
  job_scam: 'Legitimate employers never charge a registration fee.',
  lottery_scam: 'You cannot win a lottery you never entered.',
  phishing: 'Check the URL bar before entering any password.',
  impersonation: 'Call back on the official number, never the one given to you.',
}

export default function GoldenHourPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { result: contextResult } = useAnalysis()

  // Prioritize location.state.result per specification
  const result = location.state?.result || contextResult || {}
  const level = result.level || 'red'
  const entities = result.entities || {}

  // ── Section 0: 60-Minute Countdown ───────────────────────────────
  const initialStart = useRef(
    result.checked_at ? new Date(result.checked_at).getTime() : Date.now()
  ).current

  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const deadline = initialStart + 60 * 60 * 1000
  const remainingMs = Math.max(0, deadline - now)

  let countdownText = ''
  if (remainingMs <= 0) {
    countdownText = 'Window closed — still take action'
  } else {
    const totalSeconds = Math.floor(remainingMs / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    countdownText = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  // ── Section 1: Checklist items from entities ─────────────────────
  const checklistItems = []

  // UPI IDs
  const upiIds = entities.upi_ids || []
  upiIds.forEach((id) => {
    checklistItems.push(`Block UPI ID ${id} in your payments app immediately`)
  })

  // Phone numbers
  const phones = entities.phone_numbers || entities.phones || []
  phones.forEach((num) => {
    checklistItems.push(`Do not call ${num} back. Block it.`)
  })

  // URLs
  const urls = entities.urls || entities.links || []
  if (urls.length > 0) {
    checklistItems.push('Do not visit the link again. Clear your browser history.')
  }

  // Bank accounts
  const bankAccounts = entities.bank_accounts || entities.account_like || []
  bankAccounts.forEach((acc) => {
    checklistItems.push(`Call your bank to freeze transfers to ${acc}`)
  })

  // Always show
  checklistItems.push('Screenshot this conversation as evidence.')
  checklistItems.push('Do not share any OTP, even if caller claims to be from your bank.')

  // Checkbox state (purely local, never stored)
  const [checkedState, setCheckedState] = useState({})

  const toggleCheck = (idx) => {
    setCheckedState((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }))
  }

  // ── Section 2: Flag categories ──────────────────────────────────
  const flagCategories =
    Array.isArray(result.flag_categories) && result.flag_categories.length > 0
      ? result.flag_categories
      : Array.isArray(result.red_flags)
      ? Array.from(new Set(result.red_flags.map((f) => f.category).filter(Boolean)))
      : []

  // ── Section 3: Tips relevant to flag categories ──────────────────
  const catsLower = flagCategories.map((c) => String(c).toLowerCase())
  const relevantTips = []

  if (catsLower.some((c) => c.includes('kyc'))) {
    relevantTips.push(TIPS_MAP.kyc_scam)
  }
  if (catsLower.some((c) => c.includes('payment') || c.includes('upi') || c.includes('transfer'))) {
    relevantTips.push(TIPS_MAP.payment_scam)
  }
  if (catsLower.some((c) => c.includes('job') || c.includes('employment') || c.includes('fee'))) {
    relevantTips.push(TIPS_MAP.job_scam)
  }
  if (catsLower.some((c) => c.includes('lottery') || c.includes('prize') || c.includes('win'))) {
    relevantTips.push(TIPS_MAP.lottery_scam)
  }
  if (catsLower.some((c) => c.includes('phishing') || c.includes('url') || c.includes('lookalike') || c.includes('link'))) {
    relevantTips.push(TIPS_MAP.phishing)
  }
  if (catsLower.some((c) => c.includes('impersonat') || c.includes('authority') || c.includes('police'))) {
    relevantTips.push(TIPS_MAP.impersonation)
  }

  // Check exact keys as well
  Object.keys(TIPS_MAP).forEach((k) => {
    if (catsLower.includes(k) && !relevantTips.includes(TIPS_MAP[k])) {
      relevantTips.push(TIPS_MAP[k])
    }
  })

  const tipsList = [
    ...relevantTips,
    'Save the national cyber helpline: 1930',
    'Share this with one family member who might be targeted.',
  ]

  // Speak text for Section 1 checklist
  const speakChecklistText = `Immediate actions needed: ${checklistItems.join('. ')}`

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-8">
      {/* ── Section 0: Time is critical ───────────────────────────── */}
      <section className="bg-cc-deep border border-cc-pine rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">⏱</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-cc-mint tracking-tight">
                Golden Hour
              </h1>
            </div>
            <p className="text-sm text-cc-glow">
              Act within 60 minutes of being scammed. Every minute counts.
            </p>
          </div>
          <VerdictBadge level={level} />
        </div>

        {/* Countdown display */}
        <div className="mt-4 p-4 rounded-xl bg-cc-black/80 border border-cc-pine text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-cc-glow mb-1">
            Time Remaining
          </div>
          <div
            className={`font-mono text-3xl sm:text-4xl font-extrabold tracking-wider ${
              remainingMs > 0 ? 'text-risk-amber' : 'text-risk-red'
            }`}
            role="timer"
            aria-live="polite"
          >
            {countdownText}
          </div>
        </div>
      </section>

      {/* ── Section 1: Stop the bleeding ─────────────────────────── */}
      <section className="bg-cc-deep border border-cc-pine rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-risk-amber text-cc-base font-bold text-sm shrink-0">
              1
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-cc-mint">
              Stop the bleeding
            </h2>
          </div>
          <SpeakButton getText={() => speakChecklistText} text={speakChecklistText} label="Read checklist" />
        </div>

        <p className="text-xs text-cc-glow">
          Complete these steps within 60 minutes: Tick off each action as you take it. These checkmarks remain on your device only.
        </p>

        <ul className="space-y-3 pt-2" role="list">
          {checklistItems.map((item, idx) => {
            const isChecked = Boolean(checkedState[idx])
            return (
              <li
                key={idx}
                className="flex items-start gap-3 p-3 rounded-xl bg-cc-black/50 border border-cc-pine/80 hover:border-cc-pine transition-colors"
              >
                <input
                  type="checkbox"
                  id={`chk-${idx}`}
                  checked={isChecked}
                  onChange={() => toggleCheck(idx)}
                  className="mt-1 h-4 w-4 rounded border-cc-pine bg-cc-black text-cc-juniper focus:ring-cc-glow focus:ring-offset-cc-deep cursor-pointer"
                />
                <label
                  htmlFor={`chk-${idx}`}
                  className={`text-sm cursor-pointer select-none leading-relaxed transition-all ${
                    isChecked
                      ? 'line-through text-cc-glow/60'
                      : 'text-cc-mint font-medium'
                  }`}
                >
                  {item}
                </label>
              </li>
            )
          })}
        </ul>
      </section>

      {/* ── Section 2: Report it ──────────────────────────────────── */}
      <section className="bg-cc-deep border border-cc-pine rounded-2xl p-6 sm:p-8 space-y-5 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-cc-juniper text-cc-mint font-bold text-sm shrink-0">
            2
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-cc-mint">
            Report it
          </h2>
        </div>

        {flagCategories.length > 0 && (
          <div className="p-3 rounded-xl bg-cc-black/60 border border-cc-pine/80 space-y-1.5">
            <div className="text-xs font-semibold text-cc-glow">
              Why we flagged this:
            </div>
            <div className="flex flex-wrap gap-2">
              {flagCategories.map((cat, i) => (
                <span
                  key={i}
                  className="px-2.5 py-0.5 rounded-full bg-cc-pine border border-cc-juniper text-xs font-medium text-cc-mint"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-cc-juniper/40 border border-cc-juniper hover:bg-cc-juniper text-cc-mint font-semibold text-center text-sm transition-all shadow-md group"
          >
            <span>Report to Cyber Crime</span>
            <span className="text-[11px] text-cc-glow group-hover:text-cc-mint/80 mt-1">
              cybercrime.gov.in ↗
            </span>
          </a>

          <a
            href="https://sancharsaathi.gov.in/sfc/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-cc-juniper/40 border border-cc-juniper hover:bg-cc-juniper text-cc-mint font-semibold text-center text-sm transition-all shadow-md group"
          >
            <span>Report to TRAI (calls/SMS)</span>
            <span className="text-[11px] text-cc-glow group-hover:text-cc-mint/80 mt-1">
              sancharsaathi.gov.in ↗
            </span>
          </a>

          <a
            href="tel:1800111109"
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-cc-juniper/40 border border-cc-juniper hover:bg-cc-juniper text-cc-mint font-semibold text-center text-sm transition-all shadow-md group"
          >
            <span>File with your bank</span>
            <span className="text-[11px] text-cc-glow group-hover:text-cc-mint/80 mt-1">
              Call 1800-11-1109 (RBI helpline)
            </span>
          </a>
        </div>
      </section>

      {/* ── Section 3: Protect yourself next time ─────────────────── */}
      <section className="bg-cc-deep border border-cc-pine rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-cc-juniper text-cc-mint font-bold text-sm shrink-0">
            3
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-cc-mint">
            Protect yourself next time
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {tipsList.map((tip, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-cc-black/60 border border-cc-pine/80 text-sm text-cc-mint leading-relaxed flex items-start gap-2.5"
            >
              <span className="text-cc-glow shrink-0 font-bold" aria-hidden="true">
                •
              </span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 4: Next check CTA ─────────────────────────────── */}
      <section className="bg-cc-deep border border-cc-pine rounded-2xl p-6 sm:p-8 space-y-4 text-center shadow-xl">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => navigate(ROUTES.CHECK || ROUTES.check)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-cc-juniper hover:bg-cc-juniper/90 text-cc-mint font-bold text-sm sm:text-base shadow-lg transition-colors cursor-pointer"
          >
            Check another message
          </button>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-xs sm:text-sm font-semibold text-cc-glow hover:text-cc-mint underline decoration-cc-glow/60 transition-colors cursor-pointer"
          >
            Back to result
          </button>
        </div>
      </section>
    </div>
  )
}
