import { useState } from 'react'
import { useLanguage } from '@/context/LanguageContext.jsx'

export default function SettingsPage() {
  // SECTION 1 — Language
  const { setLang: setContextLang } = useLanguage()
  const [lang, setLang] = useState(localStorage.getItem('cc_lang') || 'en')
  const langs = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिन्दी (Hindi)' },
  ]

  const handleLangClick = (code) => {
    setLang(code)
    localStorage.setItem('cc_lang', code)
    if (setContextLang) {
      setContextLang(code)
    }
  }

  // SECTION 2 — Private Mode
  const [priv, setPriv] = useState(localStorage.getItem('cc_private') === '1')

  const handleTogglePrivate = () => {
    setPriv((v) => {
      const next = !v
      localStorage.setItem('cc_private', next ? '1' : '0')
      localStorage.setItem('cc_private_mode', next ? '1' : '0')
      return next
    })
  }

  // SECTION 3 — Server
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
  const [status, setStatus] = useState(null)
  const [testing, setTesting] = useState(false)

  const handleTestConnection = () => {
    setTesting(true)
    fetch('/health')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to connect')
        return r.json()
      })
      .then((data) => {
        setStatus({ online: true, api_version: data?.api_version })
      })
      .catch(() => {
        setStatus({ online: false })
      })
      .finally(() => {
        setTesting(false)
      })
  }

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-cc-mint font-heading">
        Settings
      </h1>

      {/* SECTION 1 — Language */}
      <section className="bg-cc-deep border border-cc-juniper/70 rounded-2xl p-6 shadow-xl space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-cc-mint">Language</h2>
        <div className="flex gap-3">
          {langs.map((l) => {
            const active = lang === l.code
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => handleLangClick(l.code)}
                className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-colors cursor-pointer ${
                  active
                    ? 'bg-cc-glow text-cc-base shadow'
                    : 'bg-cc-surface text-cc-mint hover:bg-cc-juniper/60'
                }`}
              >
                {l.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* SECTION 2 — Private Mode */}
      <section className="bg-cc-deep border border-cc-juniper/70 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <label
              htmlFor="private-mode-toggle"
              className="text-base sm:text-lg font-bold text-cc-mint block cursor-pointer"
            >
              Private Mode
            </label>
            <p className="text-xs sm:text-sm text-cc-glow/80 leading-relaxed">
              Analysis runs on-device patterns only. History is not saved.
            </p>
          </div>
          <button
            id="private-mode-toggle"
            type="button"
            role="switch"
            aria-checked={priv}
            onClick={handleTogglePrivate}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cc-glow ${
              priv ? 'bg-cc-glow' : 'bg-cc-surface'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-cc-mint shadow-md ring-0 transition duration-200 ease-in-out ${
                priv ? 'translate-x-5 !bg-cc-base' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {/* SECTION 3 — Server */}
      <section className="bg-cc-deep border border-cc-juniper/70 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-bold text-cc-mint">Server</h2>
          <p className="text-xs sm:text-sm text-cc-glow/80 font-mono break-all">
            {backendUrl}
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <button
            type="button"
            disabled={testing}
            onClick={handleTestConnection}
            className="px-4 py-2 rounded-xl bg-cc-surface hover:bg-cc-juniper text-cc-mint font-semibold text-sm transition-colors border border-cc-juniper/50 cursor-pointer disabled:opacity-50"
          >
            {testing ? 'Testing…' : 'Test connection'}
          </button>

          {status && (
            status.online ? (
              <span className="text-sm font-semibold text-risk-green flex items-center gap-1.5">
                <span>●</span> Online{status.api_version != null ? ` (v${status.api_version})` : ''}
              </span>
            ) : (
              <span className="text-sm font-semibold text-risk-red flex items-center gap-1.5">
                <span>●</span> Offline
              </span>
            )
          )}
        </div>
      </section>
    </div>
  )
}
