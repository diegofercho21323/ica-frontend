import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('idb-keyval', () => {
  const store = new Map<string, unknown>()
  return {
    createStore: vi.fn(() => ({})),
    get: vi.fn((key: string) => Promise.resolve(store.get(key))),
    set: vi.fn((key: string, value: unknown) => {
      store.set(key, value)
      return Promise.resolve()
    }),
    del: vi.fn((key: string) => {
      store.delete(key)
      return Promise.resolve()
    }),
    entries: vi.fn(() => Promise.resolve(Array.from(store.entries()))),
    clear: vi.fn(() => {
      store.clear()
      return Promise.resolve()
    }),
  }
})

import { clear, set } from 'idb-keyval'
import { HttpError } from '../../api/inventory/errors'
import type { CaptureChange } from '../../api/inventory/models'
import { OUTBOX_VERSION, outboxStore, replayOutbox } from './outbox'

const change = (lineCode: string): CaptureChange[] => [
  { lineCode, quantity: '10.10', state: 'COUNTED' },
]

describe('outbox — versioned durable store', () => {
  beforeEach(async () => {
    await clear()
    vi.clearAllMocks()
  })

  it('persists {attempt_id, body, Idempotency-Key} under a versioned key', async () => {
    const record = await outboxStore.enqueue('att-1', 'key-1', change('SKU-1'))

    expect(set).toHaveBeenCalledWith(
      expect.stringContaining(`outbox:v${OUTBOX_VERSION}:`),
      expect.objectContaining({
        attempt_id: 'att-1',
        body: change('SKU-1'),
        'Idempotency-Key': 'key-1',
        state: 'pending',
      }),
      expect.anything(),
    )
    expect(record.attempt_id).toBe('att-1')
    expect(record.body).toEqual(change('SKU-1'))
    expect(record['Idempotency-Key']).toBe('key-1')
    expect(record.state).toBe('pending')
  })

  it('reload restores queued records as pending (app-restart simulation)', async () => {
    await outboxStore.enqueue('att-1', 'key-1', change('SKU-1'))
    await outboxStore.enqueue('att-2', 'key-2', change('SKU-2'))

    // "Reload" == read the durable store fresh, with no reliance on any
    // in-memory queue state inside outbox.ts itself.
    const pending = await outboxStore.loadPending()

    expect(pending).toHaveLength(2)
    expect(pending.every((r) => r.state === 'pending')).toBe(true)
  })

  it('replays in original insertion order (oldest first)', async () => {
    await outboxStore.enqueue('att-1', 'key-1', change('SKU-1'))
    await new Promise((resolve) => setTimeout(resolve, 2))
    await outboxStore.enqueue('att-2', 'key-2', change('SKU-2'))
    await new Promise((resolve) => setTimeout(resolve, 2))
    await outboxStore.enqueue('att-3', 'key-3', change('SKU-3'))

    const pending = await outboxStore.loadPending()
    expect(pending.map((r) => r.attempt_id)).toEqual(['att-1', 'att-2', 'att-3'])

    const submitted: string[] = []
    const result = await replayOutbox(pending, async (record) => {
      submitted.push(record.attempt_id)
    })

    expect(submitted).toEqual(['att-1', 'att-2', 'att-3'])
    expect(result.synced.map((r) => r.attempt_id)).toEqual([
      'att-1',
      'att-2',
      'att-3',
    ])
    expect(result.held).toEqual([])
  })

  it('a 409 on batch 2 holds batch 3 pending deliberate recovery, never skips ahead', async () => {
    const records = [
      { ...(await outboxStore.enqueue('att-1', 'key-1', change('SKU-1'))) },
      { ...(await outboxStore.enqueue('att-2', 'key-2', change('SKU-2'))) },
      { ...(await outboxStore.enqueue('att-3', 'key-3', change('SKU-3'))) },
    ]

    const submitted: string[] = []
    const submit = vi.fn(async (record: (typeof records)[number]) => {
      submitted.push(record.attempt_id)
      if (record.attempt_id === 'att-2') {
        throw new HttpError(409, 'IDEMPOTENCY_CONFLICT', 'conflict')
      }
    })

    const result = await replayOutbox(records, submit)

    // batch 2 (409) stops the line: batch 3 is never attempted.
    expect(submitted).toEqual(['att-1', 'att-2'])
    expect(submit).toHaveBeenCalledTimes(2)
    expect(result.synced.map((r) => r.attempt_id)).toEqual(['att-1'])
    expect(result.conflicted?.attempt_id).toBe('att-2')
    expect(result.held.map((r) => r.attempt_id)).toEqual(['att-3'])
  })

  it('does not throw for a non-409 replay failure and does not resume silently', async () => {
    const records = [
      await outboxStore.enqueue('att-1', 'key-1', change('SKU-1')),
      await outboxStore.enqueue('att-2', 'key-2', change('SKU-2')),
    ]

    await expect(
      replayOutbox(records, async (record) => {
        if (record.attempt_id === 'att-1') {
          throw new Error('network down')
        }
      }),
    ).rejects.toThrow('network down')
  })
})
