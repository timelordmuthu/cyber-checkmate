/**
 * src/pages/DashboardPage.jsx
 * FE PRD §7 Dashboard.
 * Integrates React Bits: SplitFlapText, MagicBento, AnimatedList, CountUp, DecryptedText.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/routes.js'
import { stats, listSummaries } from '@/history.js'
import { formatRelative } from '@/lib/format.js'
import { useLanguage } from '@/context/LanguageContext.jsx'
import { usePrivateMode } from '@/context/PrivateModeContext.jsx'
import { useFxTier } from '@/lib/fx.js'

// React Bits components
import SplitFlapText from '@/components/reactbits/SplitFlapText.jsx'
import MagicBento from '@/components/reactbits/MagicBento.jsx'
import AnimatedList from '@/components/reactbits/AnimatedList.jsx'
import CountUp from '@/components/reactbits/CountUp.jsx'
import DecryptedText from '@/components/reactbits/DecryptedText.jsx'

import ScrollBand from '../components/ScrollBand';

// Icons
import {
  Message,
  Clock,
  Alert,
  Radar,
  Shield,
  Lock,
  CheckmarkCircle,
} from '@/lib/icons.js'

const SPLIT_WORDS = ['CHECK FIRST', 'STAY ALERT', 'DIAL 1930']
const LONGEST_WORD_LEN = Math.max(...SPLIT_WORDS.map((w) => w.length))

export default function DashboardPage() {
  const navigate = useNavigate()
  const { lang } = useLanguage()
  const { privateMode } = usePrivateMode()
  const tier = useFxTier()

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )

  const [metrics, setMetrics] = useState({
    total: 0,
    red: 0,
    amber: 0,
    green: 0,
    last7days: 0,
  })
  const [recent, setRecent] = useState([])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const s = stats()
    setMetrics(s)

    const all = listSummaries()
    setRecent(all.slice(0, 5))
  }, [])

  // 6 Bento items per PRD §7
  const bentoItems = [
    {
      id: 'check',
      title: 'Check a message',
      description: 'Scan SMS, WhatsApp forwards, links, or screenshots',
      route: ROUTES.check,
      content: (
        <div className="flex flex-col h-full justify-between p-1">
          <div className="flex items-center gap-2 text-cc-glow">
            <Message size={20} className="text-cc-mint" />
            <span className="text-xs uppercase font-semibold tracking-wider font-heading">
              Quick Scan
            </span>
          </div>
          <div className="my-auto py-2">
            <h3 className="text-base sm:text-lg font-bold font-heading text-cc-mint">
              Check a message
            </h3>
            <p className="text-xs text-cc-glow mt-1 leading-relaxed">
              Scan SMS, WhatsApp forwards, links, or screenshots
            </p>
          </div>
          <span className="text-[11px] font-medium text-cc-glow/70 group-hover:text-cc-mint">
            Start check &rarr;
          </span>
        </div>
      ),
    },
    {
      id: 'checks-count',
      title: 'Checks on this device',
      description: 'Total message and link scans stored locally',
      route: ROUTES.history,
      content: (
        <div className="flex flex-col h-full justify-between p-1">
          <div className="flex items-center gap-2 text-cc-glow">
            <Clock size={20} className="text-cc-glow" />
            <span className="text-xs uppercase font-semibold tracking-wider font-heading">
              Device Checks
            </span>
          </div>
          <div className="my-auto py-2">
            <div className="text-3xl sm:text-4xl font-extrabold font-heading text-cc-mint">
              <CountUp to={metrics.total} trigger="load" duration={0.8} />
            </div>
            <p className="text-xs text-cc-glow mt-1 font-medium">
              Checks on this device
            </p>
          </div>
          <span className="text-[11px] font-medium text-cc-glow/70">
            View history &rarr;
          </span>
        </div>
      ),
    },
    {
      id: 'scams-caught',
      title: 'Scams caught',
      description: 'High-risk threats identified on this device',
      route: ROUTES.history,
      content: (
        <div className="flex flex-col h-full justify-between p-1">
          <div className="flex items-center gap-2 text-risk-red">
            <Alert size={20} className="text-risk-red" />
            <span className="text-xs uppercase font-semibold tracking-wider font-heading">
              Flagged Scams
            </span>
          </div>
          <div className="my-auto py-2">
            <div className="text-3xl sm:text-4xl font-extrabold font-heading text-risk-red">
              <CountUp to={metrics.red} trigger="load" duration={0.8} />
            </div>
            <p className="text-xs text-cc-glow mt-1 font-medium">
              Scams caught
            </p>
          </div>
          <span className="text-[11px] font-medium text-cc-glow/70">
            View history &rarr;
          </span>
        </div>
      ),
    },
    {
      id: 'radar',
      title: 'Open Scam Radar',
      description: 'Explore live fraud patterns, keywords, and threat trends',
      route: ROUTES.radar,
      content: (
        <div className="flex flex-col h-full justify-between p-1">
          <div className="flex items-center gap-2 text-cc-glow">
            <Radar size={20} className="text-cc-mint" />
            <span className="text-xs uppercase font-semibold tracking-wider font-heading">
              Threat Map
            </span>
          </div>
          <div className="my-auto py-2">
            <h3 className="text-base sm:text-lg font-bold font-heading text-cc-mint">
              Open Scam Radar
            </h3>
            <p className="text-xs text-cc-glow mt-1 leading-relaxed">
              Explore live fraud patterns, keywords, and threat trends
            </p>
          </div>
          <span className="text-[11px] font-medium text-cc-glow/70">
            Explore radar &rarr;
          </span>
        </div>
      ),
    },
    {
      id: 'golden-hour',
      title: 'Paid a scammer? Golden Hour help',
      description: "Call 1930 within the first hour. We'll guide you.",
      route: ROUTES.goldenHour,
      content: (
        <div className="flex flex-col h-full justify-between p-1">
          <div className="flex items-center gap-2 text-risk-amber">
            <Shield size={20} className="text-risk-amber" />
            <span className="text-xs uppercase font-semibold tracking-wider font-heading">
              Urgent Help
            </span>
          </div>
          <div className="my-auto py-2">
            <h3 className="text-base sm:text-lg font-bold font-heading text-cc-mint">
              Paid a scammer? Golden Hour help
            </h3>
            <p className="text-xs text-risk-amber/90 mt-1 leading-relaxed">
              Call 1930 within the first hour. We'll guide you.
            </p>
          </div>
          <span className="text-[11px] font-medium text-cc-glow/70">
            Get emergency steps &rarr;
          </span>
        </div>
      ),
    },
    {
      id: 'private-mode',
      title: `Private mode: ${privateMode ? 'On' : 'Off'}`,
      description: 'Zero message data sent beyond this device',
      route: ROUTES.settings,
      content: (
        <div className="flex flex-col h-full justify-between p-1">
          <div className="flex items-center gap-2 text-cc-glow">
            <Lock size={20} className={privateMode ? 'text-cc-mint' : 'text-cc-glow'} />
            <span className="text-xs uppercase font-semibold tracking-wider font-heading">
              Privacy
            </span>
          </div>
          <div className="my-auto py-2">
            <h3 className="text-base sm:text-lg font-bold font-heading text-cc-mint">
              Private mode: {privateMode ? 'On' : 'Off'}
            </h3>
            <p className="text-xs text-cc-glow mt-1 leading-relaxed">
              {privateMode
                ? 'On-device analysis active. Zero cloud telemetry.'
                : 'Standard hybrid analysis active.'}
            </p>
          </div>
          <span className="text-[11px] font-medium text-cc-glow/70">
            Adjust settings &rarr;
          </span>
        </div>
      ),
    },
  ]

  const getVerdictMeta = (level) => {
    if (level === 'red') {
      return {
        word: 'Checkmate',
        dotColor: 'bg-risk-red',
        textColor: 'text-risk-red',
        borderColor: 'border-risk-red/40',
        bgColor: 'bg-risk-red/10',
        Icon: Alert,
      }
    }
    if (level === 'amber') {
      return {
        word: 'Check',
        dotColor: 'bg-risk-amber',
        textColor: 'text-risk-amber',
        borderColor: 'border-risk-amber/40',
        bgColor: 'bg-risk-amber/10',
        Icon: Alert,
      }
    }
    return {
      word: 'Safe',
      dotColor: 'bg-risk-green',
      textColor: 'text-risk-green',
      borderColor: 'border-risk-green/40',
      bgColor: 'bg-risk-green/10',
      Icon: CheckmarkCircle,
    }
  }

  return (
    <div className="space-y-8">
      {/* ── Slot: Install Banner (PWA FE3-23) ────────────────────────── */}
      <div id="pwa-install-banner-slot" />

      {/* ── Top Header with SplitFlapText & DecryptedText Greeting ──── */}
      <div className="flex flex-col items-center sm:items-start space-y-3">
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-cc-mint tracking-wider">
          <SplitFlapText
            words={SPLIT_WORDS}
            fontSize={typeof window !== 'undefined' && window.innerWidth < 640 ? 28 : 36}
            tileColor="#0B2B26"
            textColor="#DAF1DE"
            gap={4}
            tileRadius={6}
            cycleDelay={2800}
            stagger={0.055}
            flipsPerChar={10}
            padTo={LONGEST_WORD_LEN}
            loop
            depth={0.6}
            glare={0.18}
          />
        </h1>

        <div className="text-sm sm:text-base text-cc-glow font-medium">
          <DecryptedText
            text="Welcome. Check any message before you trust it."
            animateOn={tier === 'off' ? 'none' : 'view'}
            speed={35}
            maxIterations={12}
            className="text-cc-glow"
            parentClassName="inline-block"
          />
        </div>
      </div>

      <ScrollBand items={['FAKE KYC', 'UPI FRAUD', 'DIGITAL ARREST', 'INVESTMENT SCAM', 'OTP THEFT', 'PHISHING LINK', 'FAKE OFFER', 'COURIER SCAM', 'BANK IMPERSONATION']} />

      {/* ── MagicBento Grid (6 Items) ──────────────────────────────── */}
      <div className="w-full">
        <MagicBento
          items={bentoItems}
          columns={isMobile ? 1 : 3}
          rowHeight={170}
          gap={12}
          radius={16}
          theme="dark"
          glowColor="142, 182, 152"
          enableBorderGlow={true}
          enableSpotlight={true}
          disableAnimations={tier === 'off'}
          enableTilt={!isMobile && tier === 'full'}
          onItemClick={(item) => {
            if (item.route) navigate(item.route)
          }}
          className="w-full"
        />
      </div>

      {/* ── Recent Activity Section ─────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-heading font-bold text-cc-mint">
            Recent activity
          </h2>
          {recent.length > 0 && (
            <button
              type="button"
              onClick={() => navigate(ROUTES.history)}
              className="text-xs font-semibold text-cc-glow hover:text-cc-mint transition-colors cursor-pointer"
            >
              View all history &rarr;
            </button>
          )}
        </div>

        {recent.length === 0 ? (
          /* Empty state */
          <div className="text-center py-10 px-4 rounded-2xl border border-cc-pine bg-cc-deep/40 space-y-3">
            <div className="text-3xl select-none" aria-hidden="true">
              🛡️
            </div>
            <p className="text-sm text-cc-glow max-w-md mx-auto leading-relaxed">
              No checks yet. Your recent checks will appear here (only on this device).
            </p>
            <button
              type="button"
              onClick={() => navigate(ROUTES.check)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cc-juniper hover:bg-cc-juniper/90 text-cc-mint text-xs font-semibold shadow transition-colors cursor-pointer"
            >
              <Message size={14} />
              <span>Check a message</span>
            </button>
          </div>
        ) : (
          /* AnimatedList of last 5 summaries */
          <div className="w-full">
            <AnimatedList
              items={recent}
              width="100%"
              maxHeight={440}
              gap={8}
              radius={14}
              accentColor="#235347"
              onItemSelect={() => navigate(ROUTES.history)}
              className="w-full"
              renderItem={(item) => {
                const meta = getVerdictMeta(item.level)
                const MetaIcon = meta.Icon
                const isOnDevice = Boolean(
                  item.checked_on_device ||
                    item.on_device ||
                    item.explanation_source === 'on_device' ||
                    item.model_version?.includes('on_device')
                )

                return (
                  <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-cc-deep/80 border border-cc-pine/80 rounded-xl hover:border-cc-juniper transition-colors cursor-pointer">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Verdict Badge with colour dot + icon */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider border ${meta.bgColor} ${meta.textColor} ${meta.borderColor}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${meta.dotColor}`}
                          aria-hidden="true"
                        />
                        <MetaIcon size={14} aria-hidden="true" />
                        <span>{meta.word}</span>
                      </span>

                      {/* Score */}
                      <span className="text-xs font-mono font-semibold text-cc-mint">
                        Score: {item.risk_score ?? item.score ?? 0}/100
                      </span>

                      {/* On device tag */}
                      {isOnDevice && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cc-pine text-cc-glow border border-cc-juniper uppercase">
                          On device
                        </span>
                      )}

                      {/* Reported tag */}
                      {item.reported && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#7C3AED]/20 text-[#C4B5FD] border border-[#7C3AED]/40">
                          Reported
                        </span>
                      )}
                    </div>

                    {/* Relative time */}
                    <div className="text-xs text-cc-glow/80 font-mono self-end sm:self-auto">
                      {formatRelative(item.created_at)}
                    </div>
                  </div>
                )
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
