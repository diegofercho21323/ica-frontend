import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useInventoryApi } from '../../shared/api/inventory/api-context'
import { HttpError } from '../../shared/api/inventory/errors'
import type { Attempt, AttemptVersion, Receipt } from '../../shared/api/inventory/models'

/**
 * History/recount reads are keyed by `session_id`, never bare `attempt_id`
 * inference. The root matches `submissionHistoryKey` from the submission
 * slice on purpose: queue retries invalidate that prefix, so history views
 * refresh on every submit/retry without importing across features.
 */
export const sessionHistoryKey = (sessionId: string) =>
  ['submission-history', sessionId] as const

export type BlockedRecovery = { needsRecovery: true; key: string }

const isConflict = (error: unknown): error is HttpError =>
  error instanceof HttpError && error.status === 409

/**
 * Version history + idempotent resubmit for one attempt inside a session
 * (F4-PR2). Retry reuses the receipt key unchanged; a 409 never auto-retries
 * — recovery goes through `recoverWithReplacementKey`, which refuses to act
 * without explicit confirmation.
 *
 * Takes the real started `Attempt` (never a bare `attemptId`/free-form
 * `sessionId` string) so `sessionId` is always the one minted at
 * start-attempt and shared by any recount child — the caller cannot invent
 * or infer it.
 */
export function useSubmissionHistory({ attempt }: { attempt: Attempt }) {
  const api = useInventoryApi()
  const queryClient = useQueryClient()
  const { id: attemptId, sessionId } = attempt
  const historyKey = [...sessionHistoryKey(sessionId), attemptId] as const

  const historyQuery = useQuery({
    queryKey: historyKey,
    queryFn: () => api.getHistory(attemptId),
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [...sessionHistoryKey(sessionId)] })

  const resubmitSameKey = async (
    targetAttemptId: string,
    idempotencyKey: string,
  ): Promise<Receipt | BlockedRecovery> => {
    try {
      const receipt = await api.submit(targetAttemptId, idempotencyKey)
      await invalidate()
      return receipt
    } catch (error) {
      if (isConflict(error)) return { needsRecovery: true, key: idempotencyKey }
      throw error
    }
  }

  const recoverWithReplacementKey = async (
    targetAttemptId: string,
    idempotencyKey: string,
    options: { confirmed: boolean },
  ): Promise<Receipt> => {
    // Deliberate recovery only: without an explicit confirm the conflict
    // stays untouched — no replacement is minted, no resubmit fires.
    if (!options.confirmed) {
      throw new HttpError(
        409,
        'IDEMPOTENCY_CONFLICT',
        'Replacement-key recovery requires explicit confirmation',
      )
    }
    const replacement = await api.authorizeReplacementKey(idempotencyKey)
    const receipt = await api.submit(targetAttemptId, replacement)
    await invalidate()
    return receipt
  }

  const versions: AttemptVersion[] = historyQuery.data ?? []

  return {
    historyKey: [...historyKey],
    versions,
    isHistoryPending: historyQuery.isPending,
    isSuccess: historyQuery.isSuccess,
    isHistoryError: historyQuery.isError,
    resubmitSameKey,
    recoverWithReplacementKey,
  }
}
