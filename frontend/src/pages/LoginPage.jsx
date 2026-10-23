/**
 * src/pages/LoginPage.jsx
 * FE PRD §7 Login.
 * Standalone page without App Shell (no header, footer, or bottom nav).
 * Uses React Bits DepthText, Radar, BorderGlow, and FadeContent only.
 */
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { setRole, setAdminToken, clearSession } from '@/lib/session.js'
import { ROUTES, RESERVED_PREFIXES, SHARED_EXCEPTIONS } from '@/routes.js'
import { admin, isMockMode } from '@/api/index.js'
import { ApiError, NetworkError, FeatureUnavailableError } from '@/api/errors.js'
import FxGate from '@/components/FxGate.jsx'
import { useFxTier } from '@/lib/fx.js'
import Radar from '@/components/reactbits/Radar.jsx'
import DepthText from '@/components/reactbits/DepthText.jsx'
import BorderGlow from '@/components/reactbits/BorderGlow.jsx'
import FadeContent from '@/components/reactbits/FadeContent.jsx'
import GridScan from '../components/GridScan'
import logoSrc from '@/assets/brand/logo.png'

function isPathReserved(path) {
  if (SHARED_EXCEPTIONS.includes(path)) return false
  return RESERVED_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + '/'))
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tier = useFxTier()
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )

  const [tokenInput, setTokenInput] = useState('')
  const [adminError, setAdminError] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)

  const showAdmin = import.meta.env.VITE_ENABLE_CONSOLE !== 'false'
  const mockMode = isMockMode()

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleContinueAsUser = () => {
    setRole('user')
    const next = searchParams.get('next')
    if (next && next.startsWith('/') && !isPathReserved(next)) {
      navigate(next)
    } else {
      navigate(ROUTES.dashboard)
    }
  }

  const handleAdminLogin = async (e) => {
    e.preventDefault()
    const trimmed = tokenInput.trim()
    if (!trimmed) {
      setAdminError("That token isn't right.")
      return
    }

    setAdminLoading(true)
    setAdminError('')

    // Set token temporarily for ping call
    setAdminToken(trimmed)
    try {
      await admin.ping(trimmed)
      // Success: keep token, set role admin, navigate
      setRole('admin')
      navigate(ROUTES.console)
    } catch (err) {
      // Clear token on failure
      setAdminToken(null)
      clearSession()

      if (err instanceof ApiError || err?.name === 'ApiError') {
        if (err.status === 401) {
          setAdminError("That token isn't right.")
        } else if (err.status === 503) {
          setAdminError('Admin is turned off on this server.')
        } else {
          setAdminError(err.message || "Can't reach the server.")
        }
      } else if (
        err instanceof FeatureUnavailableError ||
        err?.name === 'FeatureUnavailableError' ||
        err?.status === 404
      ) {
        setAdminError("Admin tools aren't available on this server yet.")
      } else if (err instanceof NetworkError || err?.name === 'NetworkError') {
        setAdminError("Can't reach the server.")
      } else {
        setAdminError(err?.message || "Can't reach the server.")
      }
    } finally {
      setAdminLoading(false)
    }
  }

  return (
    <div className="relative min-h-dvh flex flex-col items-center justify-center px-4 py-8 bg-cc-black text-cc-mint selection:bg-cc-glow selection:text-cc-black overflow-hidden">
      <GridScan linesColor="#056109" scanColor="#40c666" />

      {/* ── Background Radar ────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <FxGate
          need="full"
          webgl
          id="login-radar"
          fallback={
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,#163832,#051F20_70%)]" />
          }
        >
          <Radar
            color="#8EB698"
            speed={0.3}
            dpr={1.5}
            className="absolute inset-0 w-full h-full opacity-40"
          />
        </FxGate>
      </div>

      {/* ── Content Container (max-w-md centered) ────────────────────── */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Brand & DepthText */}
        <div className="flex flex-col items-center text-center mb-6">
          <img
            src={logoSrc}
            alt="CyberCheckmate"
            className="h-16 w-auto object-contain mx-auto mb-4 select-none"
          />
          <span className="sr-only">CyberCheckmate</span>
          <DepthText
            text="CYBERCHECKMATE"
            layers={isMobile ? 16 : 28}
            depthColor="#235347"
            faceColor="#DAF1DE"
            autoOrbit={tier === 'full'}
            fontSize={isMobile ? 'clamp(1.75rem, 6.5vw, 2.25rem)' : 'clamp(2.1rem, 5vw, 2.65rem)'}
            className="font-heading font-extrabold tracking-tight"
          />
          <p className="mt-2 text-sm text-cc-glow font-medium">
            Check before you trust
          </p>
        </div>

        {/* Cards wrapped in FadeContent */}
        <div className="w-full space-y-4">
          <FadeContent blur duration={0.6} ease="power2.out">
            {/* Card 1: Continue as User */}
            <BorderGlow
              borderRadius={16}
              glowColor="136 23 64"
              backgroundColor="#0B2B26"
              className="p-5 flex flex-col items-center text-center w-full shadow-lg"
            >
              <h2 className="text-base sm:text-lg font-heading font-bold text-cc-mint mb-0.5">
                Continue as User
              </h2>
              <p className="text-xs text-cc-glow mb-4">No account needed</p>
              <button
                type="button"
                onClick={handleContinueAsUser}
                className="w-full bg-cc-juniper hover:bg-cc-juniper/90 active:bg-cc-pine text-cc-mint font-semibold py-2.5 px-4 rounded-xl shadow transition-colors text-sm cursor-pointer"
              >
                Continue as User
              </button>
            </BorderGlow>
          </FadeContent>

          {/* Card 2: Admin Login */}
          {showAdmin && (
            <FadeContent blur duration={0.6} ease="power2.out" delay={0.1}>
              <BorderGlow
                borderRadius={16}
                glowColor="136 23 64"
                backgroundColor="#0B2B26"
                className="p-5 flex flex-col items-center text-center w-full shadow-lg"
              >
                <h2 className="text-base sm:text-lg font-heading font-bold text-cc-mint mb-0.5">
                  Admin Login
                </h2>
                <p className="text-xs text-cc-glow mb-4">
                  Review reports and configure rules
                </p>
                <form onSubmit={handleAdminLogin} className="w-full space-y-3">
                  <div className="text-left">
                    <label htmlFor="admin-token" className="block text-xs font-medium text-cc-glow mb-1">
                      Admin token
                    </label>
                    <input
                      id="admin-token"
                      type="password"
                      autoComplete="off"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="Enter admin token"
                      className="w-full bg-cc-black border border-cc-pine text-cc-mint placeholder-cc-glow/30 rounded-xl py-2 px-3 text-sm focus-visible:outline-2 focus-visible:outline-cc-glow"
                    />
                    {mockMode && (
                      <p className="text-[11px] text-cc-glow/80 mt-1">
                        Mock mode: use the token mock
                      </p>
                    )}
                  </div>
                  {adminError && (
                    <p className="text-xs font-medium text-risk-red text-left" role="alert">
                      {adminError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={adminLoading}
                    className="w-full bg-cc-pine hover:bg-cc-juniper active:bg-cc-deep text-cc-mint font-semibold py-2.5 px-4 rounded-xl border border-cc-juniper shadow transition-colors text-sm disabled:opacity-50 cursor-pointer"
                  >
                    {adminLoading ? 'Signing in…' : 'Sign in'}
                  </button>
                </form>
              </BorderGlow>
            </FadeContent>
          )}
        </div>

        {/* ── Footer line ────────────────────────────────────────────── */}
        <p className="text-center text-xs text-cc-glow/70 mt-6 select-none">
          No account needed. Your messages are not saved.
        </p>
      </div>
    </div>
  )
}
