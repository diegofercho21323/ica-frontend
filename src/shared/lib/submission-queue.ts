import type { Receipt } from '../api/inventory/models'

// Submission queue linkage (F2 remainder toward F4). Pure helpers over the
// idempotent submit contract: the queue mirrors receipts, retries reuse the
// same Idempotency-Key, and 409 conflicts never auto-resolve — recovery goes
// through the deliberate replacement-key flow (`authorizeReplacementKey`).
// Locked attempts accept no edits or offline mutations.
export type QueueSyncState = 'pending' | 'synced' | 'conflict'

export type SubmissionQueueEntry = {
  attemptId: string
  idempotencyKey: string
  state: QueueSyncState
  queuedAt: number
  receipt?: Receipt
  detail?: string
}

// Every state carries text + icon so the queue UI never signals by color only.
export const QUEUE_STATUS_META: Record<
  QueueSyncState,
  { text: string; icon: string }
> = {
  pending: { text: 'Pending sync', icon: 'clock' },
  synced: { text: 'Synced', icon: 'check' },
  conflict: { text: 'Conflict — action needed', icon: 'alert' },
}

// Oldest pending entry first; synced and conflict entries never replay.
export const orderPendingForReplay = (
  entries: readonly SubmissionQueueEntry[],
): SubmissionQueueEntry[] =>
  entries
    .filter((entry) => entry.state === 'pending')
    .slice()
    .sort((left, right) => left.queuedAt - right.queuedAt)

export type RetryRequest = {
  attemptId: string
  idempotencyKey: string
}

// Unchanged retries reuse the entry key; conflicts return null because they
// require deliberate recovery instead of another attempt with the same key.
export const retryRequestFor = (
  entry: SubmissionQueueEntry,
): RetryRequest | null =>
  entry.state === 'conflict'
    ? null
    : { attemptId: entry.attemptId, idempotencyKey: entry.idempotencyKey }

// Only pending entries may retry on their own. Conflicts (409) and already
// synced entries never fire an automatic retry.
export const isAutoRetryBlocked = (entry: SubmissionQueueEntry): boolean =>
  entry.state !== 'pending'

// The server reports a locked attempt as immutable: neither the queue nor the
// operator may edit it or queue offline mutations against it.
export const canMutateAttempt = (locked: boolean): boolean => !locked

// A 409 conflict never auto-resolves: recovery requires a DELIBERATE user
// action that submits under a brand-new key, never the stale one that
// clashed. Non-conflict entries have nothing to resolve.
export const authorizeReplacementKey = (
  entry: SubmissionQueueEntry,
  nextKey: string,
): RetryRequest | null =>
  entry.state === 'conflict' && nextKey !== entry.idempotencyKey
    ? { attemptId: entry.attemptId, idempotencyKey: nextKey }
    : null
