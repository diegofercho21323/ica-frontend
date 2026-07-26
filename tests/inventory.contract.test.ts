import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { disabledHttpInventoryApi } from '../src/shared/api/inventory/http'
import {
  demoCredentials,
  leaderFixture,
  operatorV2Fixture,
} from '../src/shared/api/inventory/fixtures'
import { mockInventoryApi } from '../src/shared/api/inventory/mock'
import { createIdempotencyRegistry } from '../src/shared/lib/idempotency'
import { toPersistedSession } from '../src/shared/lib/persistence'
import type { OperatorLineView } from '../src/shared/api/inventory/models'

const lineFor = (
  lines: readonly OperatorLineView[],
  code: string,
): OperatorLineView => {
  const line = lines.find((candidate) => candidate.code === code)
  if (!line) throw new Error(`Expected a contract line for ${code}`)
  return line
}

describe('inventory contracts', () => {
  // A constant stub would make generated and stored keys indistinguishable, so
  // every mint must be unique for the reuse and deletion properties to be real.
  let mintedKeys = 0

  beforeEach(() => {
    mintedKeys = 0
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => `key-${++mintedKeys}`),
    })
  })

  afterEach(() => {
    // Per-file isolation already contains this stub across files, but without
    // an explicit unstub any later suite in THIS file silently inherits it.
    vi.unstubAllGlobals()
  })

  it('projects v2 operator fixtures without leader or historical fields', () => {
    expect(Object.keys(operatorV2Fixture[0]).sort()).toEqual([
      'code',
      'currentQuantity',
      'name',
      'state',
      'unit',
    ])
    expect(leaderFixture[0].finalizedQuantity).toBe('12')
    expect(operatorV2Fixture[0]).toMatchObject({
      state: 'NOT_COUNTED',
      currentQuantity: null,
    })
  })

  it('keeps the leader finalized quantity an exact decimal string', () => {
    const baseline = leaderFixture[0]
    const precision = leaderFixture[1]

    // The reconciled quantity is authoritative, so a numeric type here would
    // silently rewrite it exactly like the captured quantity.
    expect(typeof baseline.finalizedQuantity).toBe('string')
    expect(typeof precision.finalizedQuantity).toBe('string')
    expect(precision.finalizedQuantity).toBe('9007199254740993.000001')

    // A float round-trip rewrites this value, so inequality proves the leader
    // quantity never passed through IEEE-754.
    expect(String(Number(precision.finalizedQuantity))).not.toBe(
      precision.finalizedQuantity,
    )
    expect(Number(precision.finalizedQuantity)).toBe(9007199254740994)
  })

  it('returns a password-free session from deterministic mock credentials', async () => {
    const session = await mockInventoryApi.loginDemo(demoCredentials[0])
    expect(session).toEqual({
      userId: 'operator-1',
      displayName: 'Operador demo',
      role: 'operator',
    })
    expect(session).not.toHaveProperty('password')
  })

  it('serializes only non-sensitive session fields for persistence', () => {
    const persisted = toPersistedSession(demoCredentials[0])
    expect(persisted).not.toHaveProperty('password')
  })

  it('rejects every disabled HTTP adapter operation before a request', async () => {
    await expect(disabledHttpInventoryApi.listScopes()).rejects.toThrow(
      'disabled',
    )
    await expect(
      disabledHttpInventoryApi.submit('attempt-1', 'idempotency-key'),
    ).rejects.toThrow('disabled')
  })

  it('exposes all four documented count states through the operator port', async () => {
    const lines = await mockInventoryApi.getOperatorLines('attempt-1')

    expect(lineFor(lines, 'SKU-001').state).toBe('NOT_COUNTED')
    expect(lineFor(lines, 'SKU-002').state).toBe('COUNTED')
    expect(lineFor(lines, 'SKU-003').state).toBe('COUNTED_ZERO')
    expect(lineFor(lines, 'SKU-004').state).toBe('NOT_FOUND')
    expect(new Set(lines.map((line) => line.state))).toEqual(
      new Set(['NOT_COUNTED', 'COUNTED', 'COUNTED_ZERO', 'NOT_FOUND']),
    )
  })

  it('separates COUNTED_ZERO, NOT_FOUND, and NOT_COUNTED by state alone', async () => {
    const lines = await mockInventoryApi.getOperatorLines('attempt-1')
    const notCounted = lineFor(lines, 'SKU-001')
    const countedZero = lineFor(lines, 'SKU-003')
    const notFound = lineFor(lines, 'SKU-004')

    expect(countedZero.currentQuantity).toBe('0')
    expect(notFound.currentQuantity).toBeNull()
    expect(notCounted.currentQuantity).toBeNull()

    // Quantity-based checks collapse all three lines, so state is the only
    // field allowed to carry the distinction.
    expect(Number(countedZero.currentQuantity)).toBe(0)
    expect(Number(notFound.currentQuantity)).toBe(0)
    expect(!Number(countedZero.currentQuantity)).toBe(
      !Number(notFound.currentQuantity),
    )
    expect(notFound.currentQuantity).toEqual(notCounted.currentQuantity)

    const states = [notCounted.state, countedZero.state, notFound.state]
    expect(new Set(states).size).toBe(3)
  })

  it('keeps quantities as exact decimal strings without float coercion', async () => {
    const lines = await mockInventoryApi.getOperatorLines('attempt-1')
    const trailing = lineFor(lines, 'SKU-002')
    const highPrecision = lineFor(lines, 'SKU-005')

    expect(trailing.currentQuantity).toBe('10.10')
    expect(highPrecision.currentQuantity).toBe('9007199254740993.000001')

    // The contract rejects more than six decimals with 422, so a fixture that
    // exceeds the limit is invalid data no matter how well it breaks floats.
    for (const line of [trailing, highPrecision]) {
      const decimals = (line.currentQuantity ?? '').split('.')[1] ?? ''
      expect(decimals.length).toBeLessThanOrEqual(6)
    }

    for (const line of [trailing, highPrecision]) {
      const quantity = line.currentQuantity
      expect(typeof quantity).toBe('string')
      // A float round-trip rewrites both values, so inequality proves the
      // adapter never coerced them through IEEE-754.
      expect(String(Number(quantity))).not.toBe(quantity)
    }

    // Trailing digits are preserved verbatim, not normalized away.
    expect(trailing.currentQuantity).not.toBe('10.1')
    expect(String(Number('10.10'))).toBe('10.1')
    // Precision beyond 2^53 survives verbatim although a double corrupts it
    // into a different integer entirely.
    expect(Number(highPrecision.currentQuantity)).toBe(9007199254740994)
  })

  it('returns isolated line copies so a caller cannot corrupt later reads', async () => {
    const first = await mockInventoryApi.getOperatorLines('attempt-1')
    first[0].state = 'COUNTED'
    first[0].currentQuantity = '99'

    const second = await mockInventoryApi.getOperatorLines('attempt-1')
    expect(second[0]).not.toBe(first[0])
    expect(second[0]).toMatchObject({
      code: 'SKU-001',
      state: 'NOT_COUNTED',
      currentQuantity: null,
    })
    expect(operatorV2Fixture[0]).toMatchObject({
      state: 'NOT_COUNTED',
      currentQuantity: null,
    })
  })

  it('reuses a durable operation key after registry reconstruction', async () => {
    const keys = new Map<string, string>()
    const keyStore = {
      get: async (key: string) => keys.get(key),
      set: async (key: string, value: string) => void keys.set(key, value),
      del: async (key: string) => void keys.delete(key),
    }
    const firstRegistry = createIdempotencyRegistry(keyStore)
    const first = await firstRegistry.getKey('save', 'line-1')

    // Guard the guard: a fresh fingerprint must mint a different key, otherwise
    // every assertion below would hold even with no store at all.
    expect(await firstRegistry.getKey('save', 'line-2')).not.toBe(first)

    // Same key from an independently built registry proves the store read runs.
    const reconstructedRegistry = createIdempotencyRegistry(keyStore)
    expect(await reconstructedRegistry.getKey('save', 'line-1')).toBe(first)

    // A different key after clearing proves the deletion actually happened.
    await reconstructedRegistry.clearKey('save', 'line-1')
    expect(await reconstructedRegistry.getKey('save', 'line-1')).not.toBe(first)
  })

  it('shares one key resolution across concurrent calls', async () => {
    let resolveGet!: (value: string | undefined) => void
    const pendingGet = new Promise<string | undefined>((resolve) => {
      resolveGet = resolve
    })
    const keyStore = {
      get: vi.fn(() => pendingGet),
      set: vi.fn(async () => undefined),
      del: vi.fn(async () => undefined),
    }
    const registry = createIdempotencyRegistry(keyStore)

    const first = registry.getKey('save', 'line-1')
    const second = registry.getKey('save', 'line-1')

    expect(second).toBe(first)
    resolveGet(undefined)
    await expect(Promise.all([first, second])).resolves.toEqual([
      'key-1',
      'key-1',
    ])
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1)
    expect(keyStore.set).toHaveBeenCalledTimes(1)
  })

  it('rejects demo credentials with a wrong password', async () => {
    await expect(
      mockInventoryApi.loginDemo({ username: 'operador', password: 'wrong' }),
    ).rejects.toThrow('Invalid demo credentials')
  })
})
