import { demoCredentials, operatorV2Fixture, scopeFixtures } from './fixtures'
import type { InventoryApiPort } from './port'
import type { CaptureChange, DemoCredentials, DemoSession } from './models'

const unsupported = (operation: string): never => {
  throw new Error(`${operation} is not available in this work unit`)
}

// Idempotency ledger: one entry per batch key. A repeated call with the same
// key and payload is a no-op success; the same key with a different payload
// is a conflict. `resetDemo` clears both maps.
const seenBatches = new Map<string, string>()
const appliedByLine = new Map<string, CaptureChange>()

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
    return scopeFixtures.map((scope) => ({ ...scope }))
  },
  async startAttempt() {
    return unsupported('Starting an attempt')
  },
  async getOperatorLines() {
    // Copy each line: a spread of the array alone shares the line objects, so a
    // caller mutating a result would corrupt the fixture for every later read.
    // Saved batches overlay on top without mutating the fixture itself.
    return operatorV2Fixture.map((line) => {
      const applied = appliedByLine.get(line.code)
      if (!applied) return { ...line }
      return { ...line, state: applied.state, currentQuantity: applied.quantity }
    })
  },
  async saveBatch(idempotencyKey: string, changes: CaptureChange[]) {
    const fingerprint = JSON.stringify(changes)
    const seen = seenBatches.get(idempotencyKey)
    if (seen !== undefined) {
      if (seen !== fingerprint) {
        throw new Error('Idempotency key reuse with a different payload')
      }
      return
    }
    seenBatches.set(idempotencyKey, fingerprint)
    for (const change of changes) {
      appliedByLine.set(change.lineCode, { ...change })
    }
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
  async resetDemo() {
    seenBatches.clear()
    appliedByLine.clear()
  },
  async authorizeReplacementKey() {
    return unsupported('Authorizing an idempotency key')
  },
}
