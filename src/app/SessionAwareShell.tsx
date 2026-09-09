import { LogoutButton } from '../features/access/LogoutButton'
import { useSession } from '../features/access/SessionContext'
import { AppShell } from '../shared/ui/layout/AppShell'

/**
 * App-layer shell wiring (F6-P1): feeds the session into AppShell's
 * `authenticated` prop. It lives in app/ because shared/ must not import
 * from features/ (FSD layer rule). While the session boots, `session` is
 * null, so only the login entry shows — a secure default with no flash of
 * privileged navigation.
 */
export function SessionAwareShell() {
  const { session } = useSession()
  return (
    <AppShell
      authenticated={session !== null}
      headerActions={<LogoutButton />}
    />
  )
}
