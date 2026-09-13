import { useMutation } from '@tanstack/react-query'
import { useInventoryApi } from '../../shared/api/inventory/api-context'
import { HttpError } from '../../shared/api/inventory/errors'
import type { Attempt } from '../../shared/api/inventory/models'

export type RecountRequest = {
  attempt: Attempt
  lineCodes: string[]
  assignee: string
}

/**
 * Leader recount requests (F4-PR2). The server enforces the `cost-leader`
 * role (403) and rejects empty selections (400); the client pre-checks the
 * empty case so no request fires at all. Children restart blind: the mock
 * projects identity + unit only, quantities restart empty.
 *
 * Takes the real started `Attempt` (never a bare `attemptId` string) so the
 * mutation targets a genuine attempt; the mock keeps the resulting child in
 * the parent's `sessionId` — recount never starts a disconnected session.
 */
export function useRecount() {
  const api = useInventoryApi()
  const mutation = useMutation({
    mutationFn: (request: RecountRequest) => {
      if (request.lineCodes.length === 0) {
        throw new HttpError(
          400,
          'EMPTY_RECOUNT_SELECTION',
          'Recount needs at least one line',
        )
      }
      return api.createRecount(request.attempt.id, {
        lineCodes: request.lineCodes,
        assignee: request.assignee,
      })
    },
    retry: false,
  })

  return {
    requestRecount: mutation.mutateAsync,
    isRecounting: mutation.isPending,
    isRecountError: mutation.isError,
    resetRecount: mutation.reset,
  }
}
