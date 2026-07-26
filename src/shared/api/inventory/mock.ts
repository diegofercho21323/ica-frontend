import { demoCredentials, operatorV2Fixture } from './fixtures'
import type { InventoryApiPort } from './port'
import type { DemoCredentials, DemoSession } from './models'

const unsupported = (operation: string): never => {
  throw new Error(`${operation} is not available in this work unit`)
}

export const mockInventoryApi: InventoryApiPort = {
  async loginDemo(credentials: DemoCredentials): Promise<DemoSession> {
    const account = demoCredentials.find((candidate) => {
      return (
        candidate.username === credentials.username &&
        candidate.password === credentials.password
      )
    })
    if (!account) throw new Error('Invalid demo credentials')
    return {
      userId: account.userId,
      displayName: account.displayName,
      role: account.role,
    }
  },
  async listScopes() {
    return []
  },
  async startAttempt() {
    return unsupported('Starting an attempt')
  },
  async getOperatorLines() {
    // Copy each line: a spread of the array alone shares the line objects, so a
    // caller mutating a result would corrupt the fixture for every later read.
    return operatorV2Fixture.map((line) => ({ ...line }))
  },
  async saveBatch() {
    return unsupported('Saving captures')
  },
  async finalize() {
    return unsupported('Finalizing an attempt')
  },
  async submit(_attemptId: string, _idempotencyKey: string) {
    void _attemptId
    void _idempotencyKey
    return unsupported('Submitting an attempt')
  },
  async loadPreset() {
    return unsupported('Loading a preset')
  },
  async resetDemo() {},
  async authorizeReplacementKey() {
    return unsupported('Authorizing an idempotency key')
  },
}
