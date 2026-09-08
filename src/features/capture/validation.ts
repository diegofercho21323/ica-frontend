import type { OperatorLineView } from '../../shared/api/inventory/models'

export type RowState = OperatorLineView['state']

/**
 * Exact-decimal quantities stay strings end to end. Up to six fraction
 * digits are accepted verbatim; anything else is an inline error.
 * Never coerce through float parsing — values past 2^53
 * (for example 9007199254740993.000001) would be rewritten.
 */
export const QTY_RE = /^[0-9]+(\.[0-9]{1,6})?$/

export function toPayloadQty(state: RowState, qty: string): string | null {
  if (state === 'COUNTED_ZERO') return '0'
  if (state === 'NOT_FOUND') return null
  return qty
}
