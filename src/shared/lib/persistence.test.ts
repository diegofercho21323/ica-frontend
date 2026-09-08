import { beforeEach, describe, expect, it, vi } from 'vitest'

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

import { clear, get, set } from 'idb-keyval'
import { demoPersistence, toPersistedSession } from './persistence'

const session = { userId: 'operator-1', displayName: 'Operador demo', role: 'operator' } as const

describe('demo-session persistence', () => {
  beforeEach(async () => {
    await demoPersistence.reset()
    vi.clearAllMocks()
  })

  it('round-trips toPersistedSession() under the demo-session key', async () => {
    await demoPersistence.saveDemoSession({ ...session })

    expect(set).toHaveBeenCalledWith('demo-session', toPersistedSession(session), expect.anything())
    expect(await demoPersistence.loadDemoSession()).toEqual(toPersistedSession(session))
  })

  it('never persists the password', async () => {
    await demoPersistence.saveDemoSession({ ...session, password: 'operador' } as never)

    const stored = await get('demo-session')
    expect(stored).toEqual(toPersistedSession(session))
    expect(stored).not.toHaveProperty('password')
    expect(JSON.stringify(stored)).not.toContain('operador')
  })

  it('clears the demo-session key without dropping the namespaced store contract', async () => {
    await demoPersistence.saveDemoSession({ ...session })
    await demoPersistence.clearDemoSession()

    expect(await demoPersistence.loadDemoSession()).toBeNull()
    expect(clear).not.toHaveBeenCalled()
  })
})
