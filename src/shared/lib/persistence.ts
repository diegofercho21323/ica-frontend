import { clear, createStore, del, get, set } from 'idb-keyval'
import type { DemoSession } from '../api/inventory/models'

const store = createStore('ica-demo', 'state')
const lastRouteKey = 'last-route'
const demoSessionKey = 'demo-session'

export type PersistedDemoState = { lastRoute?: string }

export const toPersistedSession = (session: DemoSession): DemoSession => ({
  userId: session.userId,
  displayName: session.displayName,
  role: session.role,
})

export const demoPersistence = {
  async load(): Promise<PersistedDemoState> {
    return {
      lastRoute: await get<string>(lastRouteKey, store),
    }
  },
  async saveLastRoute(route: string) {
    await set(lastRouteKey, route, store)
  },
  async saveDemoSession(session: DemoSession) {
    await set(demoSessionKey, toPersistedSession(session), store)
  },
  async loadDemoSession(): Promise<unknown> {
    try {
      return (await get(demoSessionKey, store)) ?? null
    } catch {
      return null
    }
  },
  async clearDemoSession() {
    try {
      await del(demoSessionKey, store)
    } catch {
      // Session state already converges to anonymous; storage errors surface on next save.
    }
  },
  async reset() {
    await clear(store)
  },
}
