import {
  InventoryApiProvider,
  useInventoryApi,
} from '../shared/api/inventory/api-context'
import {
  createHttpInventoryApi,
  disabledHttpInventoryApi,
  readInventoryApiUrl,
  resolveHttpBaseUrl,
} from '../shared/api/inventory/http'
import { mockInventoryApi } from '../shared/api/inventory/mock'
import type { InventoryApiPort } from '../shared/api/inventory/port'

export { InventoryApiProvider, useInventoryApi }

const readAdapterEnv = (): string | undefined => {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> })
    .env
  return env?.['VITE_INVENTORY_ADAPTER']
}

/**
 * Config-driven port selection (`VITE_INVENTORY_ADAPTER=mock|http`).
 * Mock is the default so the app boots with zero network calls; `http`
 * opts into the progressive HTTP adapter and additionally requires
 * `VITE_INVENTORY_API_URL` — without it the adapter stays disabled with a
 * clear message (GAP-4: no backend URL published yet). Unknown values fall
 * back to mock with a console warning.
 */
export function resolveInventoryApi(raw?: string): InventoryApiPort {
  const value = raw ?? readAdapterEnv() ?? 'mock'
  if (value === 'mock') return mockInventoryApi
  if (value === 'http') {
    // No URL is ever hardcoded: absence keeps the disabled placeholder.
    const baseUrl = readInventoryApiUrl() ?? ''
    if (resolveHttpBaseUrl(baseUrl) === null) {
      return disabledHttpInventoryApi
    }
    return createHttpInventoryApi({ baseUrl })
  }
  console.warn(
    `[inventory] unknown VITE_INVENTORY_ADAPTER "${value}", falling back to mock`,
  )
  return mockInventoryApi
}
