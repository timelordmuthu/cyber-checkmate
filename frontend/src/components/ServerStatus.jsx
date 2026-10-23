/**
 * src/components/ServerStatus.jsx
 * Pill showing live server connectivity from ServerContext.
 * role="status" so screen readers announce changes.
 */
import { useServer } from '@/context/ServerContext.jsx'
import { useLanguage } from '@/context/LanguageContext.jsx'
import { t } from '@/i18n.js'

// ------------------------------------------------------------------
// Colour tokens for the dot (hex so they work inside style=)
// ------------------------------------------------------------------
const DOT_ONLINE   = 'var(--color-risk-green)'   // #22C55E
const DOT_LEGACY   = 'var(--color-risk-amber)'   // #F59E0B
const DOT_MOCK     = '#8B5CF6'                    // plum
const DOT_OFFLINE  = 'var(--color-risk-red)'     // #EF4444
const DOT_CHECKING = 'var(--color-risk-amber)'

export default function ServerStatus() {
  const { online, mock, apiVersion, modelVersion, checkedAt } = useServer()
  const { lang } = useLanguage()

  // Derive state label + dot colour
  let label, dotColor, dotClass
  if (mock) {
    label    = t('statusMock', lang)
    dotColor = DOT_MOCK
  } else if (online === null) {
    // Still loading on first check
    label    = t('statusChecking', lang)
    dotColor = DOT_CHECKING
    dotClass = 'animate-pulse'
  } else if (online && (apiVersion == null || apiVersion >= 2)) {
    label    = t('statusOnline', lang)
    dotColor = DOT_ONLINE
  } else if (online && apiVersion < 2) {
    label    = 'Online (older server)'
    dotColor = DOT_LEGACY
  } else {
    label    = t('statusOffline', lang)
    dotColor = DOT_OFFLINE
  }

  const titleText = modelVersion
    ? `Model: ${modelVersion}${checkedAt ? ` · Last checked: ${new Date(checkedAt).toLocaleTimeString()}` : ''}`
    : checkedAt
    ? `Last checked: ${new Date(checkedAt).toLocaleTimeString()}`
    : 'Server status'

  return (
    <span
      role="status"
      aria-label={label}
      title={titleText}
      className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium rounded-md
                 border border-cc-pine bg-cc-deep/80 text-cc-glow select-none"
    >
      <span
        aria-hidden="true"
        className={`inline-block w-2 h-2 rounded-full flex-none ${dotClass ?? ''}`}
        style={{ backgroundColor: dotColor, boxShadow: `0 0 0 2px ${dotColor}33` }}
      />
      <span>{label}</span>
    </span>
  )
}
