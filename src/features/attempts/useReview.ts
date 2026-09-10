import { useQuery } from '@tanstack/react-query'
import { mockInventoryApi } from '../../shared/api/inventory/mock'

/**
 * Attempt review projection. Completeness counts identities only: pending
 * lines expose code/name/unit, never quantities.
 */
export function useReview(attemptId: string) {
  const reviewQuery = useQuery({
    queryKey: ['review', attemptId],
    queryFn: () => mockInventoryApi.getReview(attemptId),
  })

  const counted = reviewQuery.data?.counted ?? []
  const pending = reviewQuery.data?.pending ?? []

  return {
    counted,
    pending,
    countedCount: counted.length,
    total: counted.length + pending.length,
    isPending: reviewQuery.isPending,
    isError: reviewQuery.isError,
  }
}
