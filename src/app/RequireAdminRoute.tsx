import { Outlet } from 'react-router'
import { useTranslation } from 'react-i18next'
import { RequireRole } from '../features/access/RequireRole'

/**
 * Route-layer gate for the whole `/admin` subtree (admin-console F1-PR1).
 *
 * `RequireRole` lives in `src/features/access/` and takes `children`, not
 * `Outlet` — `features-must-not-depend-on-other-features` forbids
 * `admin → access`, so this composition belongs in `src/app` (the layer
 * allowed to import any feature). `RequireRole` stays untouched; this
 * wrapper only supplies the `Outlet` it needs and the `demo-admin`
 * allow-list, gating the whole subtree once instead of per screen.
 */
export function RequireAdminRoute() {
  const { t } = useTranslation()
  return (
    <RequireRole allowedRoles={['demo-admin']} unauthorizedLabel={t('admin.unauthorized')}>
      <Outlet />
    </RequireRole>
  )
}
