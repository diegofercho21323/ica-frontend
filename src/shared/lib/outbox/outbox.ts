import { createStore, del, entries, set } from 'idb-keyval'
import { HttpError } from '../../api/inventory/errors'
import type { CaptureChange } from '../../api/inventory/models'

// Durable offline outbox (F5-PR2, spec: offline-outbox "Versioned durable
// outbox"). Each offline mutation persists as {attempt_id, body,
// Idempotency-Key} under a versioned idb-keyval store, so a page reload never
// loses queued work — the durable store is the sole source of truth, not any
// in-memory queue. `OUTBOX_VERSION` is baked into the store name so a future
// breaking schema change starts a fresh store instead of misreading old
// records.
export const OUTBOX_VERSION = 1

const store = createStore(`ica-outbox-v${OUTBOX_VERSION}`, 'records')

export type OutboxRecordState = 'pending' | 'synced'

export type OutboxRecord = {
  attempt_id: string
  body: CaptureChange[]
  'Idempotency-Key': string
  state: OutboxRecordState
  queuedAt: number
}

const recordKey = (attemptId: string, idempotencyKey: string): string =>
  `outbox:v${OUTBOX_VERSION}:${attemptId}:${idempotencyKey}`

export const outboxStore = {
  async enqueue(
    attemptId: string,
    idempotencyKey: string,
    body: CaptureChange[],
  ): Promise<OutboxRecord> {
    const record: OutboxRecord = {
      attempt_id: attemptId,
      body,
      'Idempotency-Key': idempotencyKey,
      state: 'pending',
      queuedAt: Date.now(),
    }
    await set(recordKey(attemptId, idempotencyKey), record, store)
    return record
  },

  // The durable store is read fresh every time — this is what "reload
  // restores pending work" means: no in-memory queue survives a restart,
  // only what idb-keyval actually persisted.
  async loadPending(): Promise<OutboxRecord[]> {
    const all = await entries<string, OutboxRecord>(store)
    return all
      .map(([, record]) => record)
      .filter((record) => record.state === 'pending')
      .sort((left, right) => left.queuedAt - right.queuedAt)
  },

  async markSynced(attemptId: string, idempotencyKey: string): Promise<void> {
    await del(recordKey(attemptId, idempotencyKey), store)
  },
}

export type OutboxSubmit = (record: OutboxRecord) => Promise<void>

export type OutboxReplayResult = {
  synced: OutboxRecord[]
  held: OutboxRecord[]
  conflicted?: OutboxRecord
}

// Ordered replay, oldest first. A 409 on any batch holds every later batch
// pending deliberate recovery — it never silently skips ahead to keep the
// queue moving. Any other failure propagates so the caller's own retry
// policy (TanStack Query `retry`) decides what happens next; only a 409 is
// this function's own stopping rule.
export const replayOutbox = async (
  records: readonly OutboxRecord[],
  submit: OutboxSubmit,
): Promise<OutboxReplayResult> => {
  const ordered = [...records].sort((left, right) => left.queuedAt - right.queuedAt)
  const synced: OutboxRecord[] = []

  for (let index = 0; index < ordered.length; index += 1) {
    const record = ordered[index]
    try {
      await submit(record)
      synced.push(record)
    } catch (error) {
      if (error instanceof HttpError && error.status === 409) {
        return { synced, held: ordered.slice(index + 1), conflicted: record }
      }
      throw error
    }
  }

  return { synced, held: [] }
}
