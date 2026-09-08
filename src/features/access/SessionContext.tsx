import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { mockInventoryApi } from '../../shared/api/inventory/mock'
import type { DemoCredentials, DemoSession } from '../../shared/api/inventory/models'
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

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<DemoSession | null>(null)
  const [status, setStatus] = useState<SessionStatus>('loading')

  useEffect(() => {
    let live = true
    demoPersistence
      .loadDemoSession()
      .then((stored) => {
        if (live) {
          setSession(parseDemoSession(stored))
          setStatus('ready')
        }
      })
      .catch(() => {
        if (live) setStatus('ready')
      })
    return () => {
      live = false
    }
  }, [])

  const login = useCallback(async (credentials: DemoCredentials) => {
    const next = await mockInventoryApi.loginDemo(credentials)
    await demoPersistence.saveDemoSession(next)
    setSession(next)
  }, [])

  const logout = useCallback(async () => {
    await demoPersistence.clearDemoSession()
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
