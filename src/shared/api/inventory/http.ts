import axios from 'axios'
import type { InventoryApiPort } from './port'

const disabled = (): never => {
  throw new Error('HTTP inventory adapter is disabled for the local demo')
}

export const httpClient = axios.create({ timeout: 5_000 })

export const disabledHttpInventoryApi: InventoryApiPort = {
  loginDemo: async () => disabled(),
  listScopes: async () => disabled(),
  startAttempt: async () => disabled(),
  getOperatorLines: async () => disabled(),
  saveBatch: async () => disabled(),
  finalize: async () => disabled(),
  submit: async (_attemptId: string, _idempotencyKey: string) => {
    void _attemptId
    void _idempotencyKey
    return disabled()
  },
  loadPreset: async () => disabled(),
  resetDemo: async () => disabled(),
  authorizeReplacementKey: async () => disabled(),
}
