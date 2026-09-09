import { beforeEach, describe, expect, it } from 'vitest'
import { HttpError } from './errors'
import type { CaptureChange } from './models'
import { mockInventoryApi } from './mock'

const changes: CaptureChange[] = [
  { lineCode: 'SKU-001', quantity: '5', state: 'COUNTED' },
  { lineCode: 'SKU-002', quantity: '10.10', state: 'COUNTED' },
]

const startGuided = (scopeId = 'scope-centro') =>
  mockInventoryApi.startAttempt(scopeId, 'guided')

describe('mock saveBatch (attempt-scoped)', () => {
  beforeEach(async () => {
    await mockInventoryApi.resetDemo()
  })

  it('dedupes a same-key same-payload retry as a no-op success', async () => {
    const attempt = await startGuided()
    await mockInventoryApi.saveBatch(attempt.id, 'key-1', changes)
    await expect(
      mockInventoryApi.saveBatch(attempt.id, 'key-1', changes),
    ).resolves.toBeUndefined()

    const lines = await mockInventoryApi.getOperatorLines(attempt.id)
    expect(lines.find((line) => line.code === 'SKU-001')?.state).toBe('COUNTED')
  })

  it('rejects the same idempotencyKey with a different body (409)', async () => {
    const attempt = await startGuided()
    await mockInventoryApi.saveBatch(attempt.id, 'key-1', changes)
    const failure = await mockInventoryApi
      .saveBatch(attempt.id, 'key-1', [
        { lineCode: 'SKU-001', quantity: '6', state: 'COUNTED' },
      ])
      .catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(HttpError)
    expect((failure as HttpError).status).toBe(409)
    expect((failure as HttpError).code).toBe('IDEMPOTENCY_CONFLICT')
  })

  it('isolates batches per attempt: no cross-attempt leak', async () => {
    const first = await startGuided('scope-centro')
    const second = await startGuided('scope-norte')
    await mockInventoryApi.saveBatch(first.id, 'key-1', changes)

    const secondLines = await mockInventoryApi.getOperatorLines(second.id)
    expect(secondLines.find((line) => line.code === 'SKU-001')?.state).toBe(
      'NOT_COUNTED',
    )
    expect(
      secondLines.find((line) => line.code === 'SKU-001')?.currentQuantity,
    ).toBeNull()
  })

  it('reuses the same idempotencyKey across attempts without conflict', async () => {
    const first = await startGuided('scope-centro')
    const second = await startGuided('scope-norte')
    await mockInventoryApi.saveBatch(first.id, 'key-1', changes)
    await expect(
      mockInventoryApi.saveBatch(second.id, 'key-1', [
        { lineCode: 'SKU-001', quantity: '7.5', state: 'COUNTED' },
      ]),
    ).resolves.toBeUndefined()

    const firstLines = await mockInventoryApi.getOperatorLines(first.id)
    expect(firstLines.find((line) => line.code === 'SKU-001')?.currentQuantity).toBe(
      '5',
    )
  })

  it('rejects a batch on a locked attempt with 409, unlocked attempts still save', async () => {
    const locked = await startGuided('scope-centro')
    const open = await startGuided('scope-norte')
    await mockInventoryApi.finalize(locked.id, { confirm_uncounted: true })

    const failure = await mockInventoryApi
      .saveBatch(locked.id, 'locked-key', [
        { lineCode: 'SKU-001', quantity: '1', state: 'COUNTED' },
      ])
      .catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(HttpError)
    expect((failure as HttpError).status).toBe(409)
    expect((failure as HttpError).code).toBe('ATTEMPT_LOCKED')

    await expect(
      mockInventoryApi.saveBatch(open.id, 'open-key', [
        { lineCode: 'SKU-001', quantity: '1', state: 'COUNTED' },
      ]),
    ).resolves.toBeUndefined()
  })

  it('keeps decimal quantities verbatim without float coercion', async () => {
    const attempt = await startGuided()
    const exact = '9007199254740993.000001'
    await mockInventoryApi.saveBatch(attempt.id, 'decimal-key', [
      { lineCode: 'SKU-001', quantity: exact, state: 'COUNTED' },
    ])

    const lines = await mockInventoryApi.getOperatorLines(attempt.id)
    expect(lines.find((line) => line.code === 'SKU-001')?.currentQuantity).toBe(
      exact,
    )

    const review = await mockInventoryApi.getReview(attempt.id)
    expect(
      review.counted.find((line) => line.code === 'SKU-001')?.currentQuantity,
    ).toBe(exact)
  })

  it('rejects a batch on an unknown attempt with 404', async () => {
    const failure = await mockInventoryApi
      .saveBatch('att-999-scope-centro', 'key-1', changes)
      .catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(HttpError)
    expect((failure as HttpError).status).toBe(404)
  })

  it('resetDemo clears seen keys so the key can be reused', async () => {
    const attempt = await startGuided()
    await mockInventoryApi.saveBatch(attempt.id, 'key-1', changes)
    await mockInventoryApi.resetDemo()
    const fresh = await startGuided()
    await expect(
      mockInventoryApi.saveBatch(fresh.id, 'key-1', [
        { lineCode: 'SKU-001', quantity: '6', state: 'COUNTED' },
      ]),
    ).resolves.toBeUndefined()
  })

  it('resetDemo clears applied state back to the fixture', async () => {
    const attempt = await startGuided()
    await mockInventoryApi.saveBatch(attempt.id, 'key-1', changes)
    await mockInventoryApi.resetDemo()
    const fresh = await startGuided()
    const lines = await mockInventoryApi.getOperatorLines(fresh.id)
    expect(lines.find((line) => line.code === 'SKU-001')?.state).toBe('NOT_COUNTED')
  })
})
