import { Navigate } from 'react-router-dom'
import { getAdminToken } from '@/lib/session.js'
import { ROUTES } from '@/routes.js'

export default function RequireAdmin({ children }) {
  const token = getAdminToken()

  if (!token) {
    return <Navigate to={ROUTES.login} replace />
  }

  return children
}
