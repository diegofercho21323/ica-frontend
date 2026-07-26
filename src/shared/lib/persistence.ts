import { clear, createStore, del, get, set } from 'idb-keyval'
import type { DemoSession } from '../api/inventory/models'

const store = createStore('ica-demo', 'state')
const sessionKey = 'session'
const lastRouteKey = 'last-route'

export type PersistedDemoState = {
  session?: DemoSession
  lastRoute?: string
}

export const toPersistedSession = (session: DemoSession): DemoSession => ({
  userId: session.userId,
  displayName: session.displayName,
  role: session.role,
})

export const demoPersistence = {
  async load(): Promise<PersistedDemoState> {
    return {
      session: await get<DemoSession>(sessionKey, store),
      lastRoute: await get<string>(lastRouteKey, store),
    }
  },
  async saveSession(session: DemoSession) {
    await set(sessionKey, toPersistedSession(session), store)
  },
  async saveLastRoute(route: string) {
    await set(lastRouteKey, route, store)
  },
  async clearIdentity() {
    await del(sessionKey, store)
  },
  async reset() {
    await clear(store)
  },
}
