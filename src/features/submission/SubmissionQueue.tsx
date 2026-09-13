import { InboxOutlined, SyncOutlined } from '@ant-design/icons'
import { Card, Divider, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useInventoryApi } from '../../shared/api/inventory/api-context'
import { HttpError } from '../../shared/api/inventory/errors'
import type { Receipt } from '../../shared/api/inventory/models'
import { mintKey } from '../../shared/lib/idempotency'
import {
  authorizeReplacementKey,
  canMutateAttempt,
  isAutoRetryBlocked,
  orderPendingForReplay,
  retryRequestFor,
  type QueueSyncState,
  type SubmissionQueueEntry,
} from '../../shared/lib/submission-queue'
import { recordRetry } from '../../shared/lib/telemetry/telemetry'
import { Button } from '../../shared/ui/primitives/Button'
import { LiveRegion } from '../../shared/ui/primitives/LiveRegion'
import { Status, type StatusTone } from '../../shared/ui/primitives/Status'

/** History/recount reads are keyed by `session_id`, never bare `attempt_id`. */
export const submissionHistoryKey = (sessionId: string) =>
  ['submission-history', sessionId] as const

const TONE_FOR_STATE: Record<QueueSyncState, StatusTone> = {
  pending: 'warning',
  synced: 'success',
  conflict: 'error',
}

/**
 * Every user-facing string arrives via props (the caller passes `t()`
 * output), so the queue never touches `es.json`. Blind-safe by
 * construction: receipts carry key/hash/reference only, never quantities.
 */
export type SubmissionQueueStrings = {
  titleLabel: string
  emptyLabel: string
  stateLabels: Record<QueueSyncState, string>
  attemptLabel: (attemptId: string) => string
  keyLabel: (key: string) => string
  retryLabel: string
  retryingLabel: string
  resolveLabel: string
  resolvingLabel: string
  resolvedLabel: string
  lockedLabel: string
  submittedLabel: string
  submitFailedLabel: string
  conflictAnnounceLabel: string
  receiptStatusLabels: Record<Receipt['status'], string>
  payloadHashLabel: (hash: string) => string
  erpReferenceLabel: (reference: string) => string
  noReferenceLabel: string
}

export function ReceiptView({
  receipt,
  statusLabel,
  hashText,
  referenceText,
}: {
  receipt: Receipt
  statusLabel: string
  hashText: string
  referenceText: string
}) {
  return (
    <div className="bg-layout flex flex-col gap-1 rounded-md p-3">
      <Status
        tone={receipt.status === 'SUCCEEDED' ? 'success' : 'error'}
        label={statusLabel}
      />
      <p className="text-on-surface-secondary m-0 text-sm">{hashText}</p>
      <p className="text-on-surface-secondary m-0 text-sm">{referenceText}</p>
    </div>
  )
}

export function RetryButton({
  attemptId,
  idempotencyKey,
  disabled = false,
  busy = false,
  retryLabel,
  retryingLabel,
  onRetry,
}: {
  attemptId: string
  idempotencyKey: string
  disabled?: boolean
  busy?: boolean
  retryLabel: string
  retryingLabel: string
  onRetry: (request: { attemptId: string; idempotencyKey: string }) => void
}) {
  return (
    <Button
      type="primary"
      disabled={disabled || busy}
      loading={busy}
      loadingLabel={retryingLabel}
      onClick={() => onRetry({ attemptId, idempotencyKey })}
    >
      {busy ? retryingLabel : retryLabel}
    </Button>
  )
}

/**
 * Deliberate conflict-recovery affordance. Separate from `RetryButton` on
 * purpose: a conflict never offers a plain "retry with the same key" path,
 * only this explicit "start a new attempt" action.
 */
export function ResolveButton({
  attemptId,
  disabled = false,
  busy = false,
  resolveLabel,
  resolvingLabel,
  onResolve,
}: {
  attemptId: string
  disabled?: boolean
  busy?: boolean
  resolveLabel: string
  resolvingLabel: string
  onResolve: (attemptId: string) => void
}) {
  return (
    <Button
      type="primary"
      disabled={disabled || busy}
      loading={busy}
      loadingLabel={resolvingLabel}
      onClick={() => onResolve(attemptId)}
    >
      {busy ? resolvingLabel : resolveLabel}
    </Button>
  )
}

const sameEntry =
  (entry: SubmissionQueueEntry) => (item: SubmissionQueueEntry) =>
    item.attemptId === entry.attemptId &&
    item.idempotencyKey === entry.idempotencyKey

/**
 * Visible submit/retry queue (F4-PR1). Pending entries replay oldest-first;
 * conflicts (409) and synced entries never auto-retry; locked attempts
 * accept no edits. Retry reuses the entry `Idempotency-Key` unchanged.
 */
export function SubmissionQueue({
  sessionId,
  initialEntries,
  locked,
  strings,
}: {
  sessionId: string
  initialEntries: readonly SubmissionQueueEntry[]
  locked: boolean
  strings: SubmissionQueueStrings
}) {
  const api = useInventoryApi()
  const queryClient = useQueryClient()
  const [entries, setEntries] = useState<SubmissionQueueEntry[]>([
    ...initialEntries,
  ])
  const [announcement, setAnnouncement] = useState('')
  const [assertive, setAssertive] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const mutable = canMutateAttempt(locked)

  const visible = useMemo(
    () => [
      ...orderPendingForReplay(entries),
      ...entries.filter((entry) => entry.state === 'synced'),
      ...entries.filter((entry) => entry.state === 'conflict'),
    ],
    [entries],
  )

  const handleRetry = async (entry: SubmissionQueueEntry) => {
    const request = retryRequestFor(entry)
    if (!request || isAutoRetryBlocked(entry) || !canMutateAttempt(locked)) return
    recordRetry(request.attemptId)
    setBusyKey(entry.idempotencyKey)
    try {
      const receipt = await api.submit(request.attemptId, request.idempotencyKey)
      setEntries((prev) =>
        prev.map((item) =>
          sameEntry(entry)(item) ? { ...item, state: 'synced', receipt } : item,
        ),
      )
      setAnnouncement(strings.submittedLabel)
      setAssertive(false)
    } catch (error) {
      if (error instanceof HttpError && error.status === 409) {
        setEntries((prev) =>
          prev.map((item) =>
            sameEntry(entry)(item)
              ? { ...item, state: 'conflict', detail: 'IDEMPOTENCY_CONFLICT' }
              : item,
          ),
        )
        setAnnouncement(strings.conflictAnnounceLabel)
        setAssertive(true)
      } else {
        setAnnouncement(strings.submitFailedLabel)
        setAssertive(true)
      }
    } finally {
      setBusyKey(null)
      await queryClient.invalidateQueries({
        queryKey: [...submissionHistoryKey(sessionId)],
      })
    }
  }

  /**
   * Deliberate conflict recovery: mints a brand-new `Idempotency-Key` and
   * submits under it. Never reuses the stale key that clashed — that is
   * exactly the silent-retry behavior a 409 must never trigger.
   */
  const handleResolveConflict = async (entry: SubmissionQueueEntry) => {
    if (!canMutateAttempt(locked)) return
    const nextKey = mintKey()
    const request = authorizeReplacementKey(entry, nextKey)
    if (!request) return
    setBusyKey(entry.idempotencyKey)
    try {
      const receipt = await api.submit(request.attemptId, request.idempotencyKey)
      setEntries((prev) =>
        prev.map((item) =>
          sameEntry(entry)(item)
            ? { ...item, idempotencyKey: nextKey, state: 'synced', receipt }
            : item,
        ),
      )
      setAnnouncement(strings.resolvedLabel)
      setAssertive(false)
    } catch (error) {
      if (error instanceof HttpError && error.status === 409) {
        setEntries((prev) =>
          prev.map((item) =>
            sameEntry(entry)(item)
              ? {
                  ...item,
                  idempotencyKey: nextKey,
                  state: 'conflict',
                  detail: 'IDEMPOTENCY_CONFLICT',
                }
              : item,
          ),
        )
        setAnnouncement(strings.conflictAnnounceLabel)
        setAssertive(true)
      } else {
        setAnnouncement(strings.submitFailedLabel)
        setAssertive(true)
      }
    } finally {
      setBusyKey(null)
      await queryClient.invalidateQueries({
        queryKey: [...submissionHistoryKey(sessionId)],
      })
    }
  }

  return (
    <section aria-busy={busyKey !== null} className="flex w-full justify-center">
      <Card variant="borderless" className="flex w-full max-w-2xl flex-col gap-4 shadow-sm">
        <Typography.Title level={4} className="!mb-0 flex items-center gap-2">
          <SyncOutlined aria-hidden />
          {strings.titleLabel}
        </Typography.Title>
        {locked ? (
          <p className="text-warning m-0 text-sm">{strings.lockedLabel}</p>
        ) : null}
        {visible.length === 0 ? (
          <div className="text-on-surface-secondary flex flex-col items-center gap-2 py-8 text-center">
            <InboxOutlined aria-hidden className="text-2xl" />
            <p className="m-0 text-sm">{strings.emptyLabel}</p>
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {visible.map((entry, index) => {
              const retryable =
                retryRequestFor(entry) !== null && !isAutoRetryBlocked(entry)
              return (
                <li key={`${sessionId}:${entry.attemptId}:${entry.idempotencyKey}`}>
                  {index > 0 ? <Divider className="!my-0" /> : null}
                  <div className="flex w-full flex-col gap-2 py-3">
                    <Status
                      tone={TONE_FOR_STATE[entry.state]}
                      label={strings.stateLabels[entry.state]}
                    />
                    <p className="m-0 text-sm">{strings.attemptLabel(entry.attemptId)}</p>
                    <p className="m-0 text-sm">{strings.keyLabel(entry.idempotencyKey)}</p>
                    {entry.receipt ? (
                      <ReceiptView
                        receipt={entry.receipt}
                        statusLabel={strings.receiptStatusLabels[entry.receipt.status]}
                        hashText={strings.payloadHashLabel(entry.receipt.payload_hash)}
                        referenceText={
                          entry.receipt.erp_reference
                            ? strings.erpReferenceLabel(entry.receipt.erp_reference)
                            : strings.noReferenceLabel
                        }
                      />
                    ) : null}
                    <div className="flex flex-col gap-2 sm:flex-row">
                      {retryable ? (
                        <RetryButton
                          attemptId={entry.attemptId}
                          idempotencyKey={entry.idempotencyKey}
                          disabled={!mutable}
                          busy={busyKey === entry.idempotencyKey}
                          retryLabel={strings.retryLabel}
                          retryingLabel={strings.retryingLabel}
                          onRetry={() => void handleRetry(entry)}
                        />
                      ) : null}
                      {entry.state === 'conflict' ? (
                        <ResolveButton
                          attemptId={entry.attemptId}
                          disabled={!mutable}
                          busy={busyKey === entry.idempotencyKey}
                          resolveLabel={strings.resolveLabel}
                          resolvingLabel={strings.resolvingLabel}
                          onResolve={() => void handleResolveConflict(entry)}
                        />
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <LiveRegion message={announcement} assertive={assertive} />
      </Card>
    </section>
  )
}
