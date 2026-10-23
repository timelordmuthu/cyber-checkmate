import { createContext, useContext, useState } from 'react'
import { getStoredLang, setStoredLang } from '@/i18n.js'

export const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => getStoredLang())

  const setLang = (nextLang) => {
    const valid = nextLang === 'hi' ? 'hi' : 'en'
    setLangState(valid)
    setStoredLang(valid)
  }

  const toggleLang = () => {
    const next = lang === 'en' ? 'hi' : 'en'
    setLang(next)
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    // Graceful fallback if rendered outside provider (e.g. in standalone tests)
    return {
      lang: getStoredLang(),
      setLang: () => {},
      toggleLang: () => {},
    }
  }
  return ctx
}
