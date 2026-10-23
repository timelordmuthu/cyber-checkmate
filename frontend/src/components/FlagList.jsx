/**
 * FlagList – shows top 5 red flags with a "Show all (N)" toggle.
 * Each flag has a strength bar with aria-label.
 */
import { useState } from 'react'
import { flagLabel } from '@/lib/labels.js'

const INITIAL_SHOW = 5

/**
 * @param {{ flags: Array, className?: string }} props
 */
export default function FlagList({ flags = [], className = '' }) {
  const [showAll, setShowAll] = useState(false)

  if (!flags.length) return null

  const visible = showAll ? flags : flags.slice(0, INITIAL_SHOW)
  const hiddenCount = flags.length - INITIAL_SHOW

  return (
    <div className={['space-y-2', className].filter(Boolean).join(' ')}>
      <ul className="space-y-2" aria-label="Warning signs detected">
        {visible.map((flag, idx) => {
          const label = flagLabel(flag)
          const strengthPct = typeof flag.strength === 'number'
            ? Math.round(flag.strength * 100)
            : null

          const type = (flag.type || '').toUpperCase()
          const borderColor =
            type === 'URL'
              ? '#3b82f6'
              : type === 'KEYWORD'
              ? '#f59e0b'
              : type === 'TACTIC'
              ? '#ef4444'
              : '#6b7280'

          return (
            <li
              key={idx}
              className="bg-cc-surface border border-amber-500/30 rounded-lg p-3 mb-2 flex items-start gap-2"
              style={{ borderLeft: `3px solid ${borderColor}` }}
            >
              {/* type chip */}
              <span className="mt-0.5 shrink-0 inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-cc-pine text-cc-glow">
                {flag.type || '?'}
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-cc-mint leading-snug">{label}</p>

                {/* strength bar */}
                {strengthPct !== null && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div
                      role="meter"
                      aria-label={`strength ${strengthPct} percent`}
                      aria-valuenow={strengthPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="relative h-1.5 flex-1 rounded-full bg-cc-deep overflow-hidden"
                    >
                      <div
                        className="h-full rounded-full bg-risk-amber"
                        style={{ width: `${strengthPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-cc-glow/70 font-mono shrink-0">
                      {strengthPct}%
                    </span>
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {/* Show all / collapse toggle */}
      {flags.length > INITIAL_SHOW && (
        <button
          type="button"
          onClick={() => setShowAll(v => !v)}
          className="text-xs font-semibold text-cc-glow hover:text-cc-mint underline decoration-cc-glow/50 transition-colors"
        >
          {showAll
            ? 'Show less'
            : `Show all (${flags.length})`}
        </button>
      )}
    </div>
  )
}
