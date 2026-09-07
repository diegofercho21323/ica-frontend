import { clear, createStore, get, set } from 'idb-keyval'
import type { DemoSession } from '../api/inventory/models'

const store = createStore('ica-demo', 'state')
const lastRouteKey = 'last-route'

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
  async reset() {
    await clear(store)
  },
}
