/**
 * ReputationCard – "Reported N times by other users" per item.
 * reputation: Array<{ type: string, value_masked: string, count: number }>
 */

const TYPE_LABEL = {
  phone: 'Phone number',
  upi: 'UPI ID',
  link: 'Link',
  email: 'Email',
  account: 'Bank account',
}

function typeLabel(type) {
  return TYPE_LABEL[type] || (type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Item')
}

/**
 * @param {{ reputation: Array, className?: string }} props
 */
export default function ReputationCard({ reputation = [], className = '' }) {
  if (!reputation.length) return null

  return (
    <div
      className={['rounded-xl border border-cc-pine bg-cc-black/40 p-4 space-y-2', className]
        .filter(Boolean)
        .join(' ')}
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider text-cc-glow">
        Reported by other users
      </h3>

      <ul className="space-y-1.5">
        {reputation.map((item, idx) => {
          // Support both field name variants from the API
          const maskedValue = item.value_masked ?? item.masked ?? '***'
          const count = item.count ?? item.reports ?? 0
          return (
            <li
              key={idx}
              className="flex items-center justify-between gap-2 text-xs text-cc-mint/90"
            >
              <span className="flex items-center gap-1.5">
                <span className="font-medium text-cc-glow">{typeLabel(item.type)}:</span>
                <span className="font-mono">{maskedValue}</span>
              </span>
              <span className="shrink-0 rounded-full bg-risk-red-bg text-risk-red border border-risk-red-border px-2 py-0.5 text-[10px] font-bold">
                {count} {count === 1 ? 'report' : 'reports'}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
