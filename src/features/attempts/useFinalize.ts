import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { HttpError } from '../../shared/api/inventory/errors'
import { mockInventoryApi } from '../../shared/api/inventory/mock'
import type { AttemptVersion } from '../../shared/api/inventory/models'

/**
 * Finalize/lock mutation. A 422 (pending lines, no confirm) opens the
 * confirm dialog instead of failing; confirming retries with
 * `confirm_uncounted`. Other errors surface as `finalizeError`.
 */
export function useFinalize(attemptId: string) {
  const queryClient = useQueryClient()
  const [needsConfirm, setNeedsConfirm] = useState(false)
  const [lockedVersion, setLockedVersion] = useState<AttemptVersion | null>(null)

  const mutation = useMutation({
    mutationFn: (options?: { confirm_uncounted?: boolean }) =>
      mockInventoryApi.finalize(attemptId, options),
    onSuccess: (version) => {
      setNeedsConfirm(false)
      setLockedVersion(version)
      void queryClient.invalidateQueries({ queryKey: ['review', attemptId] })
      void queryClient.invalidateQueries({ queryKey: ['capture-lines', attemptId] })
      void queryClient.invalidateQueries({ queryKey: ['attempt-lock', attemptId] })
    },
    onError: (error) => {
      if (error instanceof HttpError && error.status === 422) {
        setNeedsConfirm(true)
      }
    },
  })

  return {
    needsConfirm,
    isFinalizing: mutation.isPending,
    lockedVersion,
    finalizeError: mutation.isError && !needsConfirm ? mutation.error : null,
    finalize: () => mutation.mutate(undefined),
    confirm: () => mutation.mutate({ confirm_uncounted: true }),
    cancel: () => {
      mutation.reset()
      setNeedsConfirm(false)
    },
  }
}
