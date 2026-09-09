import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { useInventoryApi } from '../../shared/api/inventory/api-context'
import type { DemoCredentials, DemoSession } from '../../shared/api/inventory/models'
import type { InventoryApiPort } from '../../shared/api/inventory/port'
import { authTokenStorage, isAuthTokenExpired } from '../../shared/lib/auth-token'
import { demoPersistence } from '../../shared/lib/persistence'
import { parseDemoSession } from './parseDemoSession'

export type SessionStatus = 'loading' | 'ready'

export type SessionValue = {
  session: DemoSession | null
  status: SessionStatus
  login: (credentials: DemoCredentials) => Promise<void>
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({
  api,
  children,
}: PropsWithChildren<{ api?: InventoryApiPort }>) {
  const contextApi = useInventoryApi()
  const port = api ?? contextApi
  const [session, setSession] = useState<DemoSession | null>(null)
  const [status, setStatus] = useState<SessionStatus>('loading')

  useEffect(() => {
    let live = true
    // Token hygiene: an expired persisted token is purged on boot so the app
    // converges to anonymous instead of reusing a dead bearer.
    const boot = async () => {
      try {
        if (isAuthTokenExpired(await authTokenStorage.load())) {
          await authTokenStorage.clear()
        }
        const stored = await demoPersistence.loadDemoSession()
        if (live) {
          setSession(parseDemoSession(stored))
          setStatus('ready')
        }
      } catch {
        if (live) setStatus('ready')
      }
    }
    void boot()
    return () => {
      live = false
    }
  }, [])

  const login = useCallback(
    async (credentials: DemoCredentials) => {
      const next = await port.loginDemo(credentials)
      await demoPersistence.saveDemoSession(next)
      setSession(next)
    },
    [port],
  )

  const logout = useCallback(async () => {
    await Promise.all([
      demoPersistence.clearDemoSession(),
      authTokenStorage.clear(),
    ])
    setSession(null)
  }, [])

  const value = useMemo<SessionValue>(
    () => ({ session, status, login, logout }),
    [session, status, login, logout],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used within SessionProvider')
  return value
}
