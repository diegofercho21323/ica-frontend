import { createContext, useContext, type PropsWithChildren } from 'react'
import { mockInventoryApi } from './mock'
import type { InventoryApiPort } from './port'

/**
 * Shared inventory-port context. The default is the mock adapter so feature
 * hooks keep working standalone (tests, storybook-style mounts); the app
 * shell overrides it with the config-resolved adapter via `app/providers`.
 *
 * Lives in `shared` (not `app/`) because the dependency-cruiser FSD rules
 * forbid `features → app` imports — features consume the port from here.
 */
const InventoryApiContext =
  createContext<InventoryApiPort>(mockInventoryApi)

export function InventoryApiProvider({
  api,
  children,
}: PropsWithChildren<{ api: InventoryApiPort }>) {
  return (
    <InventoryApiContext.Provider value={api}>
      {children}
    </InventoryApiContext.Provider>
  )
}

export function useInventoryApi(): InventoryApiPort {
  return useContext(InventoryApiContext)
}
