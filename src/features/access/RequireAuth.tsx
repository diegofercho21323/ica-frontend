import { Navigate, Outlet, useLocation } from 'react-router'
import { useSession } from './SessionContext'

export function RequireAuth() {
  const { session, status } = useSession()
  const location = useLocation()

  if (status === 'loading') return null
  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return <Outlet />
}
