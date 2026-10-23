/**
 * src/components/LanguageSelect.jsx
 * Native <select> for language switching, styled with Tailwind.
 * Reads available languages from i18n; in FE3-15 this will be extended
 * from serverLanguages. For now: en + hi.
 */
import { useLanguage } from '@/context/LanguageContext.jsx'

const LANGUAGES = [
  { code: 'en', label: 'EN – English' },
  { code: 'hi', label: 'HI – हिन्दी' },
]

export default function LanguageSelect() {
  const { lang, setLang } = useLanguage()

  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      aria-label="Select language"
      className="appearance-none bg-cc-deep border border-cc-juniper text-cc-glow text-xs
                 font-semibold rounded-md px-2.5 py-1 cursor-pointer
                 hover:border-cc-glow hover:text-cc-mint transition-colors
                 focus-visible:outline-2 focus-visible:outline-cc-glow"
    >
      {LANGUAGES.map(({ code, label }) => (
        <option key={code} value={code} className="bg-cc-deep text-cc-mint">
          {label}
        </option>
      ))}
    </select>
  )
}
