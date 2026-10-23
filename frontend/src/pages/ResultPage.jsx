/**
 * src/pages/ResultPage.jsx
 * Analysis Result Page according to FE PRD §7 Result.
 *
 * Uses React Bits: SloshGauge, ElectricBorder (red only), CountUp, SpotlightCard, AnimatedContent, ShinyText.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SpotlightCard from '@/components/reactbits/SpotlightCard.jsx'
import ElectricBorder from '@/components/reactbits/ElectricBorder.jsx'
import SloshGauge from '@/components/reactbits/SloshGauge.jsx'
import CountUp from '@/components/reactbits/CountUp.jsx'
import AnimatedContent from '@/components/reactbits/AnimatedContent.jsx'
import ShinyText from '@/components/reactbits/ShinyText.jsx'
import FxGate from '@/components/FxGate.jsx'
import VerdictBadge from '@/components/VerdictBadge.jsx'
import FlagList from '@/components/FlagList.jsx'
import NextSteps from '@/components/NextSteps.jsx'
import TranslationBox from '@/components/TranslationBox.jsx'
import ReputationCard from '@/components/ReputationCard.jsx'
import TechnicalDetails from '@/components/TechnicalDetails.jsx'
import ReportPanel from '@/components/ReportPanel.jsx'
import SpeakButton from '@/components/SpeakButton.jsx'
import { verdictFor, flagLabel } from '@/lib/labels.js'
import { t } from '@/i18n.js'
import { useAnalysis } from '@/context/AnalysisContext.jsx'
import { useLanguage } from '@/context/LanguageContext.jsx'
import { useFxTier } from '@/lib/fx.js'
import { analyze } from '@/api/index.js'
import { saveSummary } from '@/history.js'
import { ROUTES } from '@/routes.js'

import redFixture from '@contracts/fixtures/analyze_red_kyc_en.json'
import greenFixture from '@contracts/fixtures/analyze_green_otp.json'
import urlOnlyFixture from '@contracts/fixtures/analyze_url_only_official.json'

const DEV_FIXTURES = {
  red: redFixture,
  green: greenFixture,
  'url-only': urlOnlyFixture,
}

export default function ResultPage() {
  const { result: ctxResult, setResult, clearResult } = useAnalysis()
  const { lang } = useLanguage()
  const fxTier = useFxTier()
  const navigate = useNavigate()

  const devFixtureParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('devFixture') : null
  const result = ctxResult || (devFixtureParam ? DEV_FIXTURES[devFixtureParam] : null)

  // State for editable OCR text
  const [editedText, setEditedText] = useState(() => result?.extracted_text || '')
  const [rechecking, setRechecking] = useState(false)
  const [recheckError, setRecheckError] = useState('')

  if (!result) {
    return (
      <div className="max-w-xl mx-auto py-8">
        <div className="bg-cc-deep/90 border border-cc-pine rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-xl">
          <div className="text-4xl select-none" aria-hidden="true">📋</div>
          <h2 className="text-xl sm:text-2xl font-bold text-cc-mint">
            No result to show
          </h2>
          <p className="text-sm text-cc-glow max-w-sm mx-auto leading-relaxed">
            For your privacy, analysis results are held strictly in temporary memory and are never persisted in browser storage.
          </p>
          <div className="pt-2">
            <Link
              to={ROUTES.check}
              className="inline-flex items-center gap-2 bg-cc-juniper hover:bg-cc-juniper text-cc-mint font-bold px-5 py-2.5 rounded-xl shadow transition-colors text-sm"
            >
              <span>🔍</span> Check a message
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const score = typeof result.risk_score === 'number' ? result.risk_score : 0
  const level = result.level === 'red' || result.level === 'amber' ? result.level : 'green'
  const verdict = verdictFor(level)

  // Language advice picking
  let advice = ''
  let showEnglishFallbackNote = false
  if (lang !== 'en' && lang !== 'hi') {
    if (result.advice_local) {
      advice = result.advice_local
    } else {
      advice = result.advice_en || result.advice || ''
      showEnglishFallbackNote = true
    }
  } else if (lang === 'hi') {
    advice = result.advice_hi || result.advice_en || result.advice || ''
  } else {
    advice = result.advice_en || result.advice || ''
  }

  // Next steps picking
  const nextSteps =
    (lang !== 'en' && lang !== 'hi' && result.next_steps_local) ||
    (lang === 'hi' && result.next_steps_hi) ||
    result.next_steps_en ||
    result.next_steps ||
    []

  // Entities summary for golden hour
  const entities = result.entities || {}
  const entitySummary = []
  if (entities.phones?.length) {
    entitySummary.push(`${entities.phones.length} phone number${entities.phones.length > 1 ? 's' : ''}`)
  }
  if (entities.upi_ids?.length) {
    entitySummary.push(`${entities.upi_ids.length} UPI ID${entities.upi_ids.length > 1 ? 's' : ''}`)
  }
  const linkCount = (entities.urls?.length || 0) + (entities.links?.length || 0)
  if (linkCount > 0) {
    entitySummary.push(`${linkCount} link${linkCount > 1 ? 's' : ''}`)
  }

  // Language warning check
  const showLangWarning =
    result.language?.code &&
    !['en', 'hi'].includes(result.language.code) &&
    result.language.translated === false

  // Re-check handler for image mode
  const handleRecheck = async () => {
    if (!editedText.trim()) return
    setRechecking(true)
    setRecheckError('')
    try {
      const newResponse = await analyze({
        text: editedText.trim(),
        lang: 'both',
      })
      saveSummary(newResponse, {
        checked_on_device: newResponse.explanation_source === 'on-device',
        lang,
      })
      setResult(newResponse, { text: editedText.trim() })
    } catch (err) {
      setRecheckError(err?.message || 'Failed to re-check edited text.')
    } finally {
      setRechecking(false)
    }
  }

  const handleCheckAnother = () => {
    clearResult()
    navigate(ROUTES.check)
  }

  // Read-aloud text for FE3-17: verdict sentence + advice + first 3 warning-sign labels + next steps
  const getSpeakText = (targetLang) => {
    const chosenLang = targetLang || lang
    const vKey =
      level === 'red'
        ? 'verdictCheckmate'
        : level === 'amber'
        ? 'verdictCheck'
        : 'verdictSafe'
    const vSentence = t(vKey, chosenLang)

    const adv =
      chosenLang === 'hi' && result.advice_hi
        ? result.advice_hi
        : (result.advice_en || result.advice || '')

    const flags = (result.red_flags || [])
      .slice(0, 3)
      .map(flagLabel)
      .join('. ')

    const steps =
      chosenLang === 'hi' && result.next_steps_hi
        ? result.next_steps_hi
        : (result.next_steps_en || result.next_steps || [])
    const stepsText = Array.isArray(steps) ? steps.join('. ') : steps

    return [vSentence, adv, flags, stepsText].filter(Boolean).join('. ')
  }

  // Inner verdict card content
  const verdictCardInner = (
    <SpotlightCard
      spotlightColor={verdict.spotlightColor}
      className="border border-cc-juniper bg-cc-deep/90 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-2xl relative overflow-hidden"
    >
      <div className="flex flex-col items-center gap-4">
        <VerdictBadge level={level} />

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-2">
          {/* SloshGauge visualization */}
          <div className="shrink-0 flex items-center justify-center">
            <SloshGauge
              value={score}
              liquidColor={verdict.liquidColor}
              glassColor="#163832"
              width={76}
              height={140}
              ticks={4}
              viscosity={0.15}
              showValue={false}
              ariaLabel={`Risk score ${score} out of 100`}
            />
          </div>

          <div className="text-center sm:text-left">
            <div className={`text-4xl sm:text-5xl font-black tracking-tight ${verdict.colorClass}`}>
              {verdict.word}
            </div>

            <div className="text-sm text-cc-glow mt-2 flex items-center justify-center sm:justify-start gap-1.5 font-mono">
              <span>Risk score:</span>
              <span className="font-bold text-cc-mint text-2xl">
                <CountUp to={score} duration={1.2} />
              </span>
              <span className="text-cc-glow/70">/ 100</span>
            </div>
          </div>
        </div>

        {/* Accessibility live region */}
        <div role="status" aria-live="polite" className="sr-only">
          Verdict: {verdict.word}, Risk score: {score} out of 100
        </div>
      </div>
    </SpotlightCard>
  )

  const content = (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ── Top Header Bar ────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-cc-mint">
          Analysis Result
        </h1>
        <button
          type="button"
          onClick={handleCheckAnother}
          className="text-xs sm:text-sm font-semibold text-cc-glow hover:text-cc-mint underline decoration-cc-glow/60 transition-colors"
        >
          Check another
        </button>
      </div>

      {/* ── 1. Verdict Card (ElectricBorder on red) ───────────────── */}
      {level === 'red' ? (
        <FxGate
          need="full"
          webgl
          id="result-electric"
          fallback={
            <div className="rounded-2xl ring-2 ring-risk-red">
              {verdictCardInner}
            </div>
          }
        >
          <ElectricBorder color="#EF4444" borderRadius={16}>
            {verdictCardInner}
          </ElectricBorder>
        </FxGate>
      ) : (
        verdictCardInner
      )}

      {/* ── Golden Hour CTA (Red or Amber) ────────────────────────── */}
      {(level === 'red' || level === 'amber') && (
        <button
          type="button"
          onClick={() => navigate(ROUTES.GOLDEN_HOUR || ROUTES.goldenHour, { state: { result } })}
          className="bg-cc-amber text-cc-base font-semibold px-6 py-3 rounded-lg w-full mt-4 transition-transform active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:brightness-110"
        >
          <span>⏱</span>
          <span>Golden Hour — Act Now</span>
        </button>
      )}

      {/* ── 2. On-device & Translation Badges ─────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {result.explanation_source === 'on-device' && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cc-black/80 border border-cc-pine">
            <span aria-hidden="true">⚡</span>
            <ShinyText
              text={`Checked on this device${result._fallback ? ' (server unreachable)' : ''}`}
              color="#8EB698"
              shineColor="#DAF1DE"
              speed={2}
            />
          </div>
        )}

        {result.local_reviewed === false && (
          <span className="text-xs text-risk-amber bg-risk-amber-bg border border-risk-amber-border rounded-md px-2.5 py-1">
            Automated translation: not reviewed by a human
          </span>
        )}
      </div>

      {/* ── 3. Advice Section ──────────────────────────────────────── */}
      {advice && (
        <div className="rounded-2xl border border-cc-pine bg-cc-deep/90 p-5 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-cc-glow">
              What you should do
            </h2>
            <div id="speak-slot">
              <SpeakButton getText={getSpeakText} />
            </div>
          </div>

          <p className="text-sm sm:text-base text-cc-mint leading-relaxed">
            {advice}
          </p>

          {showEnglishFallbackNote && (
            <p className="text-[11px] text-cc-glow/70 italic">
              (Showing English: translation not yet available for this language)
            </p>
          )}

          {result.explanation_source === 'llm' && (
            <p className="text-[11px] text-cc-glow/70 italic mt-1">
              Explanation written by AI from the detected warning signs
            </p>
          )}
        </div>
      )}

      {/* ── 4. Language Warnings & What We Understood ─────────────── */}
      {showLangWarning && (
        <div className="rounded-xl border border-risk-amber-border bg-risk-amber-bg p-3.5 text-xs text-risk-amber space-y-1">
          <div className="font-bold">Limited accuracy warning</div>
          <div>
            Our server translation was unavailable for language &ldquo;{result.language.code}&rdquo;.
            Checks may be based primarily on URLs, numbers and known keywords.
          </div>
        </div>
      )}

      {result.language?.translated && (
        <TranslationBox language={result.language} />
      )}

      {/* ── 5. Warning Signs ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-cc-pine bg-cc-deep/90 p-5 sm:p-6 space-y-3 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-cc-glow">
          Warning Signs Detected
        </h2>

        {result.red_flags && result.red_flags.length > 0 ? (
          <div className="space-y-1">
            {result.red_flags.map((flag, idx) => {
              const type = (flag?.type || '').toUpperCase()
              return (
                <div
                  key={idx}
                  className="bg-cc-surface border border-amber-500/30 rounded-lg p-3 mb-2 flex items-start gap-2"
                  style={{
                    borderLeft: `3px solid ${
                      type === 'URL'
                        ? '#3b82f6'
                        : type === 'KEYWORD'
                        ? '#f59e0b'
                        : type === 'TACTIC'
                        ? '#ef4444'
                        : '#6b7280'
                    }`,
                  }}
                >
                  <span className="mt-0.5 shrink-0 inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-cc-pine text-cc-glow">
                    {flag.type || 'flag'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-cc-mint leading-snug font-medium">
                      {flagLabel(flag)}
                    </p>
                    {flag.evidence && (
                      <p className="text-[11px] text-cc-glow/70 mt-1 font-mono break-all">
                        {flag.evidence}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-cc-glow/80 italic">
            No warning signs found.
          </p>
        )}
      </div>

      {/* ── 6. Next Steps ─────────────────────────────────────────── */}
      {nextSteps.length > 0 && (
        <div className="rounded-2xl border border-cc-pine bg-cc-deep/90 p-5 sm:p-6 space-y-3 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-cc-glow">
            Next Steps
          </h2>
          <NextSteps steps={nextSteps} />
        </div>
      )}

      {/* ── 7. Reputation Card ────────────────────────────────────── */}
      {result.reputation && result.reputation.length > 0 && (
        <ReputationCard reputation={result.reputation} />
      )}

      {/* ── 8. Golden Hour Help (Red & Amber) ─────────────────────── */}
      {(level === 'red' || level === 'amber') && (
        <div className="rounded-2xl border border-risk-amber-border/70 bg-gradient-to-r from-cc-deep to-cc-black p-5 sm:p-6 space-y-3 shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-risk-amber flex items-center gap-2">
                <span aria-hidden="true">⏱</span>
                Paid a scammer? Golden Hour Help
              </h2>
              <p className="text-xs text-cc-mint/90 mt-1 leading-relaxed">
                Call 1930 within the first hour of a fraudulent transaction to increase chances of freezing the funds.
              </p>
              {entitySummary.length > 0 && (
                <p className="text-xs text-cc-glow mt-1.5 font-mono">
                  We found: {entitySummary.join(', ')}
                </p>
              )}
            </div>
          </div>

          <div className="pt-1 flex flex-wrap gap-2.5">
            <Link
              to={ROUTES.goldenHour}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-risk-amber hover:bg-amber-400 text-cc-black font-bold text-xs rounded-xl shadow transition-colors"
            >
              Open Golden Hour Guide
            </Link>
            <a
              href="tel:1930"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-cc-pine hover:bg-cc-juniper text-cc-mint font-semibold text-xs rounded-xl border border-cc-juniper transition-colors"
            >
              <span>📞</span> Call 1930
            </a>
          </div>
        </div>
      )}

      {/* ── 9. Extracted Screenshot Text (Image mode) ─────────────── */}
      {(result.input_type === 'image' || result.extracted_text) && (
        <div className="rounded-2xl border border-cc-pine bg-cc-deep/90 p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <label
              htmlFor="extracted-ocr-text"
              className="text-xs font-bold uppercase tracking-wider text-cc-glow"
            >
              Extracted Screenshot Text
            </label>
            <span className="text-[11px] text-cc-glow/60 font-mono">Editable OCR</span>
          </div>
          <textarea
            id="extracted-ocr-text"
            rows={4}
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full bg-cc-black border border-cc-pine rounded-xl p-3 text-xs text-cc-mint font-mono focus:outline-none focus:ring-1 focus:ring-cc-glow"
          />
          {recheckError && (
            <p className="text-xs text-risk-red">{recheckError}</p>
          )}
          <button
            type="button"
            onClick={handleRecheck}
            disabled={rechecking || !editedText.trim()}
            className="text-xs font-bold bg-cc-pine hover:bg-cc-juniper active:bg-cc-deep text-cc-mint px-4 py-2 rounded-xl border border-cc-juniper transition-colors disabled:opacity-50 cursor-pointer"
          >
            {rechecking ? 'Re-checking…' : 'Check again with this text'}
          </button>
        </div>
      )}

      {/* ── 10. Report Panel Slot (FE3-14) ────────────────────────── */}
      <div id="report-panel-slot">
        <ReportPanel />
      </div>

      {/* ── 11. Technical Details ─────────────────────────────────── */}
      <TechnicalDetails result={result} />

      {/* ── 12. Actions ───────────────────────────────────────────── */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-cc-pine/60">
        <button
          type="button"
          onClick={handleCheckAnother}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cc-juniper hover:bg-cc-juniper text-cc-mint text-xs font-bold shadow transition-colors"
        >
          <span>🔍</span> Check another message
        </button>

        <Link
          to={ROUTES.history}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-cc-pine hover:bg-cc-juniper text-cc-mint text-xs font-semibold border border-cc-juniper transition-colors"
        >
          <span>📜</span> View History
        </Link>
      </div>
    </div>
  )

  if (fxTier === 'off') {
    return content
  }

  return (
    <AnimatedContent
      distance={20}
      direction="vertical"
      duration={0.4}
      ease="power2.out"
      trigger="load"
    >
      {content}
    </AnimatedContent>
  )
}
