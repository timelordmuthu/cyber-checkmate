/**
 * src/components/Footer.jsx
 * PRD §7 two-line footer.
 * Hidden on mobile while BottomNav is visible; shown above the bottom of
 * page content on desktop. The padding-bottom on <main> handles the gap.
 */
import { useLanguage } from '@/context/LanguageContext.jsx'
import { t } from '@/i18n.js'

export default function Footer() {
  const { lang } = useLanguage()

  return (
    <footer
      className="hidden md:block border-t border-cc-pine/80 bg-cc-deep
                 px-4 py-5 text-center text-xs text-cc-glow/80 space-y-1.5"
    >
      <p className="max-w-2xl mx-auto leading-relaxed">
        {t('privacyNotice', lang)}
      </p>
      <p className="text-cc-glow/60">
        {t('disclaimer', lang)}
      </p>
    </footer>
  )
}
