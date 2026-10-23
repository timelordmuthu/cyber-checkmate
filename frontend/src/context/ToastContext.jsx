/**
 * src/context/ToastContext.jsx
 * Global toast system.
 *
 * show({ type: 'success'|'error'|'info', title, message, timeout=4000 })
 *
 * Renders up to 3 simultaneous toasts using React Bits SwipeToast.
 * Colour accents:
 *   success -> --color-risk-green  (#22C55E)
 *   error   -> --color-risk-red    (#EF4444)
 *   info    -> --color-cc-glow     (#8EB698)
 *
 * Accessibility: outer wrapper has role="status" aria-live="polite".
 * SwipeToast itself also carries role="status" aria-live="polite" aria-atomic="true".
 *
 * Listens for window 'cc:admin-expired' → shows error toast + navigates to /login.
 */
import {
  createContext, useContext, useState, useCallback, useEffect,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/routes.js'
import SwipeToast from '@/components/reactbits/SwipeToast.jsx'

export const ToastContext = createContext(null)

let nextToastId = 1

const MAX_TOASTS = 3

// Accent colours per type
const ACCENT = {
  success: { bg: '#052E16', ink: '#22C55E', fuse: '#22C55E' },
  error:   { bg: '#2D0A0A', ink: '#EF4444', fuse: '#EF4444' },
  info:    { bg: '#0B2B26', ink: '#8EB698', fuse: '#8EB698' },
}

// ── AdminExpiredListener – must live inside the Router ──────────
function AdminExpiredListener() {
  const { show } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    const handle = () => {
      show({ type: 'error', title: 'Admin session expired.' })
      navigate(ROUTES.login)
    }
    window.addEventListener('cc:admin-expired', handle)
    return () => window.removeEventListener('cc:admin-expired', handle)
  }, [show, navigate])

  return null
}

// ── Provider ────────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    ({ type = 'info', title, message, timeout = 4000 }) => {
      const id = nextToastId++
      setToasts((prev) => {
        const next = [...prev, { id, type, title, message, timeout, open: true }]
        // Keep only the latest MAX_TOASTS
        return next.slice(-MAX_TOASTS)
      })
      // Independent timeout: removes the toast from state regardless of whether
      // SwipeToast fires its own onClose (ensures tests with fake timers work).
      if (timeout > 0) {
        setTimeout(() => removeToast(id), timeout)
      }
      return id
    },
    [removeToast],
  )

  const handleClose = useCallback(
    (id) => () => removeToast(id),
    [removeToast],
  )

  return (
    <ToastContext.Provider value={{ show, removeToast, toasts }}>
      <AdminExpiredListener />
      {children}

      {/* Toast stack – fixed bottom-right, above BottomNav on mobile */}
      <div
        role="status"
        aria-live="polite"
        aria-label="Notifications"
        className="fixed bottom-20 md:bottom-4 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none"
      >
        {toasts.map((toast) => {
          const accent = ACCENT[toast.type] ?? ACCENT.info
          return (
            <div key={toast.id} className="pointer-events-auto w-[min(356px,calc(100vw-2rem))]">
              <SwipeToast
                open={toast.open}
                onClose={handleClose(toast.id)}
                title={toast.title ?? ''}
                description={toast.message ?? ''}
                duration={toast.timeout > 0 ? toast.timeout : 0}
                background={accent.bg}
                color={accent.ink}
                fuseColor={accent.fuse}
                closeButton
                fuse="bottom"
                pauseOnHover
              />
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// ── Hook ────────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    return {
      show: () => {},
      removeToast: () => {},
      toasts: [],
    }
  }
  return ctx
}
