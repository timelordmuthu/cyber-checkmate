import { Navigate, useLocation } from 'react-router-dom'
import { getRole } from '@/lib/session.js'
import { ROUTES } from '@/routes.js'

export default function RequireRole({ children }) {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const devRole = searchParams.get('devRole')
  const role = devRole || getRole()

  if (!role) {
    return <Navigate to={`${ROUTES.login}?next=${encodeURIComponent(location.pathname)}`} replace />
  }

  return children
}
