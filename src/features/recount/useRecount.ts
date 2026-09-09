import { useMutation } from '@tanstack/react-query'
import { useInventoryApi } from '../../shared/api/inventory/api-context'
import { HttpError } from '../../shared/api/inventory/errors'

export type RecountRequest = {
  attemptId: string
  lineCodes: string[]
  assignee: string
}

/**
 * Leader recount requests (F4-PR2). The server enforces the `cost-leader`
 * role (403) and rejects empty selections (400); the client pre-checks the
 * empty case so no request fires at all. Children restart blind: the mock
 * projects identity + unit only, quantities restart empty.
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
      return api.createRecount(request.attemptId, {
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
