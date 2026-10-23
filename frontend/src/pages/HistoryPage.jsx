/**
 * src/pages/HistoryPage.jsx
 * Event History Page according to FE PRD §7 History.
 *
 * Uses React Bits: AnimatedList, RubberSegment, HoldButton.
 */
import { useState, useMemo } from 'react'
import RubberSegment from '@/components/reactbits/RubberSegment.jsx'
import AnimatedList from '@/components/reactbits/AnimatedList.jsx'
import HoldButton from '@/components/reactbits/HoldButton.jsx'
import VerdictBadge from '@/components/VerdictBadge.jsx'
import ConfirmDialog from '@/components/ConfirmDialog.jsx'
import { listSummaries, clearHistory, isStorageAvailable } from '@/history.js'
import { formatDateTime } from '@/lib/format.js'
import { useLanguage } from '@/context/LanguageContext.jsx'
import { useToast } from '@/context/ToastContext.jsx'

const FILTER_ITEMS = [
  { value: 'all', label: 'All' },
  { value: 'red', label: 'Checkmate' },
  { value: 'amber', label: 'Check' },
  { value: 'green', label: 'Safe' },
  { value: 'reported', label: 'Reported' },
]

export default function HistoryPage() {
  const { lang } = useLanguage()
  const toast = useToast()
  const storageOk = isStorageAvailable()

  const [items, setItems] = useState(() => (storageOk ? listSummaries() : []))
  const [filter, setFilter] = useState('all') // all | red | amber | green | reported
  const [expandedId, setExpandedId] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Filter summaries in memory
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filter === 'all') return true
      if (filter === 'reported') return Boolean(item.reported)
      return item.level === filter
    })
  }, [items, filter])

  const handleClearSuccess = () => {
    clearHistory()
    setItems([])
    toast.show({
      type: 'success',
      title: 'History cleared',
    })
  }

  const handleDialogConfirm = () => {
    setConfirmOpen(false)
    handleClearSuccess()
  }

  if (!storageOk) {
    return (
      <div className="max-w-xl mx-auto py-8 text-center">
        <div className="bg-cc-deep/90 border border-risk-amber-border rounded-2xl p-8 sm:p-12 space-y-3">
          <div className="text-3xl select-none" aria-hidden="true">⚠️</div>
          <h2 className="text-xl font-bold text-cc-mint">
            History isn&apos;t available in this browser
          </h2>
          <p className="text-sm text-cc-glow max-w-sm mx-auto leading-relaxed">
            Local browser storage is disabled or unavailable in your current privacy settings. Analysis can still be run, but on-device history will not be saved.
          </p>
        </div>
      </div>
    )
  }

  const bcp47Locale = lang === 'hi' ? 'hi-IN' : 'en-IN'

  const getEmptyMessage = () => {
    if (items.length === 0) {
      return 'No checks yet. Your recent checks will appear here (only on this device).'
    }
    if (filter === 'red') return 'No Checkmate results yet.'
    if (filter === 'amber') return 'No Check results yet.'
    if (filter === 'green') return 'No Safe results yet.'
    if (filter === 'reported') return 'No Reported results yet.'
    return 'No checks yet.'
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* ── Title & Note ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-cc-mint">
            Event History
          </h1>
          <p className="text-xs sm:text-sm text-cc-glow mt-1">
            History stays on this device. It never includes your messages.
          </p>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-3 shrink-0">
            {/* Keyboard alternative clear button */}
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="text-xs font-semibold text-risk-red hover:text-red-400 underline decoration-risk-red/50 transition-colors cursor-pointer py-2 px-1"
            >
              Clear history…
            </button>

            {/* HoldButton for touch / hold action */}
            <HoldButton
              doneLabel="Cleared"
              holdTime={1200}
              fillColor="#EF4444"
              backgroundColor="#163832"
              textColor="#DAF1DE"
              fillTextColor="#ffffff"
              size="sm"
              onHold={handleClearSuccess}
            >
              Hold to clear history
            </HoldButton>
          </div>
        )}
      </div>

      {/* ── Filter Segment Bar ───────────────────────────────────── */}
      {items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-cc-deep/80 border border-cc-pine rounded-2xl p-3 sm:p-4">
          <RubberSegment
            items={FILTER_ITEMS}
            value={filter}
            onChange={(val) => setFilter(val)}
            aria-label="Filter history"
            trackColor="#051F20"
            thumbColor="#163832"
            textColor="#8EB698"
            activeTextColor="#DAF1DE"
          />

          <span className="text-xs text-cc-glow font-mono px-2">
            {filteredItems.length} {filteredItems.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
      )}

      {/* ── Summary List or Empty State ──────────────────────────── */}
      {filteredItems.length === 0 ? (
        <div className="bg-cc-deep/90 border border-cc-pine rounded-2xl p-8 sm:p-12 text-center space-y-3">
          <div className="text-4xl mb-1 select-none" aria-hidden="true">🛡️</div>
          <h2 className="text-base sm:text-lg font-bold text-cc-mint">
            {getEmptyMessage()}
          </h2>
          <p className="text-xs text-cc-glow max-w-sm mx-auto">
            History is stored locally in your browser and is never uploaded.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatedList
            items={filteredItems}
            width="100%"
            maxHeight="none"
            frame={false}
            displayScrollbar={false}
            showGradients={false}
            onItemSelect={(item) =>
              setExpandedId((prev) => (prev === item.id ? null : item.id))
            }
            renderItem={(item) => {
              const isExpanded = expandedId === item.id
              const dateStr = formatDateTime(item.created_at, bcp47Locale)
              const inputIcon =
                item.input_type === 'url' ? '🔗' : item.input_type === 'image' ? '🖼️' : '💬'
              const inputTypeLabel =
                item.input_type === 'url' ? 'Link' : item.input_type === 'image' ? 'Image' : 'Message'

              return (
                <div
                  className="w-full flex flex-col gap-2 p-1"
                  onClick={() =>
                    setExpandedId((prev) => (prev === item.id ? null : item.id))
                  }
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <VerdictBadge level={item.level} />

                      <span className="font-mono font-bold text-xs sm:text-sm text-cc-mint">
                        Score: {item.risk_score} / 100
                      </span>

                      <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-cc-black text-cc-glow border border-cc-pine">
                        <span aria-hidden="true">{inputIcon}</span>
                        <span>{inputTypeLabel}</span>
                      </span>

                      {item.checked_on_device && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cc-pine text-cc-glow border border-cc-juniper">
                          On device
                        </span>
                      )}

                      {item.reported && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-plum-700 text-cc-mint border border-plum-light/30">
                          Reported
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-cc-glow/80 font-mono">
                      {dateStr}
                    </div>
                  </div>

                  {/* Small details panel when clicked */}
                  {isExpanded && (
                    <div className="pt-2.5 mt-1 border-t border-cc-pine/70 space-y-2 text-xs">
                      <div className="font-semibold text-cc-glow text-[11px] uppercase tracking-wider">
                        Detected Warning Categories:
                      </div>
                      {item.flag_categories && item.flag_categories.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {item.flag_categories.map((cat, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-0.5 rounded-md bg-cc-black text-cc-mint text-[11px] border border-cc-pine"
                            >
                              {cat.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-cc-glow/70 italic text-[11px]">
                          No warning signs recorded.
                        </p>
                      )}
                      <div className="text-[10px] text-cc-glow/60 font-mono flex flex-wrap gap-4 pt-1">
                        <span>Model: {item.model_version || 'v2'}</span>
                        <span>Source: {item.explanation_source || 'template'}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            }}
          />
        </div>
      )}

      {/* ── Native <dialog> Confirmation ─────────────────────────── */}
      <ConfirmDialog
        open={confirmOpen}
        title="Clear history"
        message="Are you sure you want to clear your local history? This action cannot be undone."
        confirmLabel="Clear history"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={handleDialogConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
