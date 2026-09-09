import type { PropsWithChildren } from 'react'
import type { DemoRole } from '../../shared/api/inventory/models'
import { useSession } from './SessionContext'

/**
 * Role gate as a UX mirror only (F4-PR2). The server enforces authorization —
 * `createRecount` rejects non-leaders with 403 — so this component only keeps
 * the workspace out of sight: blocked roles render an inline message and the
 * children (and their mutations) never mount.
 */
export function RequireRole({
  allowedRoles,
  unauthorizedLabel,
  children,
}: PropsWithChildren<{
  allowedRoles: readonly DemoRole[]
  unauthorizedLabel: string
}>) {
  const { session, status } = useSession()

  if (status === 'loading') return null
  if (!session || !allowedRoles.includes(session.role)) {
    return <p className="m-0 text-sm">{unauthorizedLabel}</p>
  }
  return <>{children}</>
}
