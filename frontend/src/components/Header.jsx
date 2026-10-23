/**
 * src/components/Header.jsx
 * Sticky top header.
 *
 * Left  : logo (logo-horizontal.png ≥768px, logo-compact.png <768px; text fallback)
 *         linking to ROUTES.dashboard
 * Right : LanguageSelect, ServerStatus, Private chip (when private mode on),
 *         Console link (when admin), Sign out button
 * Desktop (≥768px): the 5 primary nav items inline in the header
 */
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useLanguage } from '@/context/LanguageContext.jsx'
import { usePrivateMode } from '@/context/PrivateModeContext.jsx'
import { t } from '@/i18n.js'
import { clearSession } from '@/lib/session.js'
import { ROUTES } from '@/routes.js'
import ServerStatus from '@/components/ServerStatus.jsx'
import LanguageSelect from '@/components/LanguageSelect.jsx'
import { HugeiconsIcon, LockIcon, Home01Icon, Message01Icon, HistoryIcon,
         Radar01Icon, Settings01Icon } from '@/lib/icons.js'
import logoSrc from '@/assets/brand/logo.png'
import logoCompactSrc from '@/assets/brand/logo-compact.png'

// Nav items shared with BottomNav
export const PRIMARY_NAV = [
  { to: ROUTES.dashboard, labelKey: 'navDashboard', icon: Home01Icon },
  { to: ROUTES.check,     labelKey: 'navCheck',     icon: Message01Icon },
  { to: ROUTES.history,   labelKey: 'navHistory',   icon: HistoryIcon },
  { to: ROUTES.radar,     labelKey: 'navRadar',     icon: Radar01Icon },
  { to: ROUTES.settings,  labelKey: 'navSettings',  icon: Settings01Icon },
]

function NavItem({ to, labelKey, lang, mobile = false }) {
  if (mobile) return null // rendered by BottomNav
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-cc-juniper text-cc-mint'
            : 'text-cc-glow hover:text-cc-mint hover:bg-cc-pine'
        }`
      }
    >
      {t(labelKey, lang)}
    </NavLink>
  )
}

export default function Header() {
  const navigate = useNavigate()
  const { lang } = useLanguage()
  const { privateMode } = usePrivateMode()

  const handleSignOut = () => {
    clearSession()           // does NOT clear history (localStorage scan cache)
    navigate(ROUTES.login)
  }

  return (
    <header className="sticky top-0 z-40 bg-cc-deep/95 backdrop-blur-sm border-b border-cc-pine/80">
      <div className="max-w-[960px] mx-auto px-4 py-2.5 flex items-center gap-3">

        {/* ── Logo ─────────────────────────────────────────────────── */}
        <Link
          to={ROUTES.dashboard}
          className="flex-none flex items-center gap-2 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-cc-glow rounded"
          aria-label="CyberCheckmate – go to dashboard"
        >
          {/* Wide logo ≥768px */}
          <img
            src={logoSrc}
            alt="CyberCheckmate"
            className="hidden md:block h-8 w-auto object-contain"
          />
          {/* Compact logo <768px */}
          <img
            src={logoCompactSrc}
            alt="CyberCheckmate"
            className="block md:hidden h-7 w-auto object-contain"
          />
        </Link>

        {/* ── Desktop primary nav (hidden below md) ────────────────── */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-1 ml-4">
          {PRIMARY_NAV.map(({ to, labelKey }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-cc-glow/20 text-cc-glow'
                    : 'text-cc-muted hover:text-cc-text'
                }`
              }
            >
              {t(labelKey, lang)}
            </NavLink>
          ))}
        </nav>

        {/* ── Spacer ───────────────────────────────────────────────── */}
        <div className="flex-1" />

        {/* ── Right controls ───────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-none">

          {/* Language selector */}
          <LanguageSelect />

          {/* Server status (desktop only – shown in footer on mobile) */}
          <span className="hidden sm:inline-flex">
            <ServerStatus />
          </span>

          {/* Private mode chip */}
          {privateMode && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                             bg-cc-pine border border-cc-juniper text-[11px] text-cc-glow
                             font-medium select-none"
              aria-label="Private mode on"
            >
              <HugeiconsIcon icon={LockIcon} size={12} strokeWidth={2} aria-hidden="true" />
              Private
            </span>
          )}

          {/* Admin link – always visible, subtle */}
          <a href="/console" className="text-xs text-cc-muted hover:text-cc-glow px-2 transition-colors">
            Admin
          </a>


          {/* Sign out */}
          <button
            type="button"
            onClick={handleSignOut}
            className="text-xs text-cc-glow/80 hover:text-cc-mint px-2.5 py-1 rounded-md
                       border border-cc-pine hover:bg-cc-pine transition-colors cursor-pointer"
            title="Sign out – your scan history stays on this device"
          >
            {t('signOut', lang)}
          </button>
        </div>
      </div>
    </header>
  )
}
