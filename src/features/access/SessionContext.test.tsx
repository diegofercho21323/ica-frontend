import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PropsWithChildren } from 'react'

vi.mock('idb-keyval', () => {
  const store = new Map<string, unknown>()
  return {
    createStore: vi.fn(() => ({})),
    get: vi.fn((key: string) => Promise.resolve(store.get(key))),
    set: vi.fn((key: string, value: unknown) => {
      store.set(key, value)
      return Promise.resolve()
    }),
    del: vi.fn((key: string) => {
      store.delete(key)
      return Promise.resolve()
    }),
    clear: vi.fn(() => {
      store.clear()
      return Promise.resolve()
    }),
  }
})

import { clear } from 'idb-keyval'
import { demoPersistence } from '../../shared/lib/persistence'
import {
  authTokenStorage,
  isAuthTokenExpired,
} from '../../shared/lib/auth-token'
import { SessionProvider, useSession } from './SessionContext'

function setup() {
  return renderHook(() => useSession(), {
    wrapper: ({ children }: PropsWithChildren) => <SessionProvider>{children}</SessionProvider>,
  })
}
describe('SessionContext', () => {
  beforeEach(async () => {
    await clear()
  })

  it('starts anonymous and becomes ready', async () => {
    const { result } = setup()

    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })
    expect(result.current.session).toBeNull()
  })

  it('logs in with each demo role and persists without password', async () => {
    const { result } = setup()
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })

    await result.current.login({ username: 'lider', password: 'lider' })

    await waitFor(() => {
      expect(result.current.session).toEqual({
        userId: 'leader-1',
        displayName: 'Líder de costos',
        role: 'cost-leader',
      })
    })
    expect(await demoPersistence.loadDemoSession()).toEqual(result.current.session)
  })

  it('rejects invalid credentials without starting a session', async () => {
    const { result } = setup()
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })

    await expect(
      result.current.login({ username: 'desconocido', password: 'xxxx' }),
    ).rejects.toThrow()
    expect(result.current.session).toBeNull()
  })

  it('restores the session on reload and clears it on logout', async () => {
    const first = setup()
    await waitFor(() => {
      expect(first.result.current.status).toBe('ready')
    })
    await first.result.current.login({ username: 'admin', password: 'admin' })
    await waitFor(() => {
      expect(first.result.current.session).not.toBeNull()
    })
    first.unmount()

    const second = setup()
    await waitFor(() => {
      expect(second.result.current.session).toEqual({
        userId: 'admin-1',
        displayName: 'Administrador demo',
        role: 'demo-admin',
      })
    })

    await second.result.current.logout()
    await waitFor(() => {
      expect(second.result.current.session).toBeNull()
    })
    expect(await demoPersistence.loadDemoSession()).toBeNull()
  })

  it('treats junk persisted payloads as anonymous', async () => {
    await demoPersistence.saveDemoSession({ role: 'super-admin' } as never)

    const { result } = setup()
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })
    expect(result.current.session).toBeNull()
  })

  it('clears a persisted token on logout and never stores passwords', async () => {
    await authTokenStorage.save({
      access_token: 'tok-123',
      token_type: 'bearer',
      expiresAt: Date.now() + 60_000,
    })
    const { result } = setup()
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })

    await result.current.login({ username: 'lider', password: 'lider' })
    await result.current.logout()

    await waitFor(() => {
      expect(result.current.session).toBeNull()
    })
    expect(await authTokenStorage.load()).toBeNull()
  })

  it('purges an expired token on boot and stays anonymous', async () => {
    await authTokenStorage.save({
      access_token: 'stale',
      token_type: 'bearer',
      expiresAt: Date.now() - 1,
    })
    expect(
      isAuthTokenExpired(await authTokenStorage.load()),
    ).toBe(true)

    const { result } = setup()
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })
    expect(result.current.session).toBeNull()
    expect(await authTokenStorage.load()).toBeNull()
  })
})
