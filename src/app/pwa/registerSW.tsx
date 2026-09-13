import { Alert, Button } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRegisterSW } from 'virtual:pwa-register/react'

export type PwaLifecycle = {
  /** A new service worker is waiting; the operator must confirm before it activates. */
  needRefresh: boolean
  /** The precached app shell is ready to serve cached routes without network. */
  offlineReady: boolean
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>
}

/**
 * Thin wrapper around vite-plugin-pwa's generated React hook
 * (`virtual:pwa-register/react`). `generateSW` builds the precache manifest
 * for the app shell at build time; this hook exposes the runtime
 * `onNeedRefresh`/`onOfflineReady` lifecycle so `PwaStatus` can render a
 * prompt instead of the browser silently swapping service workers underneath
 * the operator mid-count.
 */
export function usePwaLifecycle(): PwaLifecycle {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true })

  return { needRefresh, offlineReady, updateServiceWorker }
}

function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return isOnline
}

/**
 * Global PWA lifecycle banner. Never blocks a screen's own primary action —
 * it renders nothing until there is something to say:
 * - a pending update needs the operator's explicit confirmation (one primary
 *   action, per the update-prompt requirement), or
 * - the app is offline and the precached shell is serving a cached route, so
 *   the operator sees a clear queued/offline notice instead of a raw network
 *   error.
 */
export function PwaStatus() {
  const { t } = useTranslation()
  const { needRefresh, offlineReady, updateServiceWorker } = usePwaLifecycle()
  const isOnline = useOnlineStatus()

  if (needRefresh) {
    return (
      <Alert
        role="alert"
        type="info"
        showIcon
        className="m-4"
        message={t('app.pwa.updateTitle')}
        description={t('app.pwa.updateMessage')}
        action={
          <Button type="primary" size="small" onClick={() => updateServiceWorker(true)}>
            {t('app.pwa.updateAction')}
          </Button>
        }
      />
    )
  }

  if (offlineReady && !isOnline) {
    return (
      <Alert
        role="status"
        type="info"
        showIcon
        className="m-4"
        message={t('app.pwa.offlineTitle')}
        description={t('app.pwa.offlineMessage')}
      />
    )
  }

  return null
}
