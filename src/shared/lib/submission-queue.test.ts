import { describe, expect, it } from 'vitest'
import {
  QUEUE_STATUS_META,
  authorizeReplacementKey,
  canMutateAttempt,
  isAutoRetryBlocked,
  orderPendingForReplay,
  retryRequestFor,
  type SubmissionQueueEntry,
} from './submission-queue'

const entry = (
  overrides: Partial<SubmissionQueueEntry> = {},
): SubmissionQueueEntry => ({
  attemptId: 'att-1',
  idempotencyKey: 'key-1',
  state: 'pending',
  queuedAt: 1,
  ...overrides,
})

describe('submission queue linkage (synced/pending/conflict, no auto-resolve)', () => {
  it('exposes every state as text + icon, never color-only', () => {
    for (const state of ['pending', 'synced', 'conflict'] as const) {
      expect(QUEUE_STATUS_META[state].text.length).toBeGreaterThan(0)
      expect(QUEUE_STATUS_META[state].icon.length).toBeGreaterThan(0)
    }
    expect(QUEUE_STATUS_META.pending.text).not.toBe(
      QUEUE_STATUS_META.synced.text,
    )
    expect(QUEUE_STATUS_META.conflict.text).not.toBe(
      QUEUE_STATUS_META.synced.text,
    )
  })

  it('replays pending entries oldest-first and skips synced/conflict ones', () => {
    const replayable = orderPendingForReplay([
      entry({ idempotencyKey: 'newer', queuedAt: 20 }),
      entry({ idempotencyKey: 'older', queuedAt: 10 }),
      entry({ idempotencyKey: 'done', state: 'synced', queuedAt: 1 }),
      entry({ idempotencyKey: 'blocked', state: 'conflict', queuedAt: 2 }),
    ])
    expect(replayable.map((item) => item.idempotencyKey)).toEqual([
      'older',
      'newer',
    ])
  })

  it('returns an empty replay when nothing is pending (all synced is a real empty)', () => {
    const replayable = orderPendingForReplay([
      entry({ idempotencyKey: 'done-1', state: 'synced', queuedAt: 1 }),
      entry({ idempotencyKey: 'done-2', state: 'synced', queuedAt: 2 }),
    ])
    expect(replayable).toEqual([])
  })

  it('reuses the same Idempotency-Key when retrying a FAILED receipt unchanged', () => {
    const failed = entry({
      state: 'pending',
      idempotencyKey: 'retry-key',
      receipt: {
        key: 'retry-key',
        status: 'FAILED',
        payload_hash: 'cafef00d',
        erp_reference: null,
      },
    })
    expect(retryRequestFor(failed)).toEqual({
      attemptId: 'att-1',
      idempotencyKey: 'retry-key',
    })
  })

  it('refuses a direct retry for conflicts (replacement-key recovery is required)', () => {
    const conflicted = entry({ state: 'conflict' })
    expect(retryRequestFor(conflicted)).toBeNull()
    expect(isAutoRetryBlocked(conflicted)).toBe(true)
  })

  it('allows auto-retry only for pending entries, never for conflict or synced', () => {
    expect(isAutoRetryBlocked(entry({ state: 'pending' }))).toBe(false)
    expect(isAutoRetryBlocked(entry({ state: 'conflict' }))).toBe(true)
    expect(isAutoRetryBlocked(entry({ state: 'synced' }))).toBe(true)
  })

  it('forbids edits and offline mutations on locked attempts', () => {
    expect(canMutateAttempt(true)).toBe(false)
    expect(canMutateAttempt(false)).toBe(true)
  })

  it('authorizes a conflict recovery only with a genuinely new replacement key', () => {
    const conflicted = entry({ state: 'conflict', idempotencyKey: 'clash-key' })
    expect(authorizeReplacementKey(conflicted, 'fresh-key')).toEqual({
      attemptId: 'att-1',
      idempotencyKey: 'fresh-key',
    })
  })

  it('refuses conflict recovery when the replacement key matches the stale one', () => {
    const conflicted = entry({ state: 'conflict', idempotencyKey: 'clash-key' })
    expect(authorizeReplacementKey(conflicted, 'clash-key')).toBeNull()
  })

  it('refuses conflict recovery for pending or synced entries (nothing to resolve)', () => {
    expect(
      authorizeReplacementKey(entry({ state: 'pending' }), 'fresh-key'),
    ).toBeNull()
    expect(
      authorizeReplacementKey(entry({ state: 'synced' }), 'fresh-key'),
    ).toBeNull()
  })
})
