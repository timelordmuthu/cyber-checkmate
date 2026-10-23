/**
 * src/components/BottomNav.jsx
 * Mobile (< 768 px): fixed bottom tab bar with 5 nav items.
 * Desktop (≥ 768 px): hidden — the same items live inline in Header.
 *
 * Uses safe-area-inset-bottom for notched phones.
 * Active state: bg-cc-juniper.
 */
import { NavLink } from 'react-router-dom'
import { HugeiconsIcon } from '@/lib/icons.js'
import { useLanguage } from '@/context/LanguageContext.jsx'
import { t } from '@/i18n.js'
import { PRIMARY_NAV } from '@/components/Header.jsx'

export default function BottomNav() {
  const { lang } = useLanguage()

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40
                 bg-cc-deep/95 backdrop-blur-sm border-t border-cc-pine/80
                 flex items-stretch
                 pb-[env(safe-area-inset-bottom,0px)]"
    >
      {PRIMARY_NAV.map(({ to, labelKey, icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-w-0
             text-[10px] font-medium transition-colors
             ${isActive ? 'bg-cc-juniper text-cc-mint' : 'text-cc-glow hover:text-cc-mint hover:bg-cc-pine'}`
          }
        >
          {({ isActive }) => (
            <>
              <HugeiconsIcon
                icon={icon}
                size={22}
                strokeWidth={isActive ? 2 : 1.5}
                aria-hidden="true"
              />
              <span className="leading-none truncate max-w-full px-1">
                {t(labelKey, lang)}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
