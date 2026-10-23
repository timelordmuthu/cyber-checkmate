import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTES } from '@/routes.js'

export default function SharePage() {
  const location = useLocation()
  const navigate = useNavigate()

  const params = new URLSearchParams(location.search)
  const text =
    params.get('text') ||
    params.get('url') ||
    params.get('title') ||
    ''

  useEffect(() => {
    if (text.trim()) {
      sessionStorage.setItem('cc_prefill', text.trim())
      navigate(ROUTES.CHECK || ROUTES.check, {
        replace: true,
        state: { text: text.trim() },
      })
    }
  }, [text, navigate])

  if (text.trim()) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 bg-cc-black text-cc-mint">
        <p className="text-sm font-mono text-cc-glow animate-pulse">
          Opening scam checker...
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-cc-black text-cc-mint">
      <div className="max-w-md w-full bg-cc-deep border border-cc-pine rounded-2xl p-6 text-center space-y-4 shadow-xl">
        <h1 className="text-2xl font-extrabold text-cc-mint">
          Share Target
        </h1>
        <p className="text-sm text-cc-glow">
          Nothing to check — paste a message
        </p>
        <div>
          <button
            type="button"
            onClick={() => navigate(ROUTES.CHECK || ROUTES.check)}
            className="px-5 py-2.5 rounded-xl bg-cc-juniper hover:bg-cc-juniper/90 text-cc-mint font-bold text-sm transition-colors cursor-pointer"
          >
            Go to Check
          </button>
        </div>
      </div>
    </div>
  )
}
