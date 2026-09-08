import type { OperatorV2LineView } from '../../shared/api/inventory/models'

export type KpiValues = {
  total: string
  counted: string
  pending: string
  progress: string
}

const isCounted = (line: OperatorV2LineView): boolean =>
  line.state === 'COUNTED' || line.state === 'COUNTED_ZERO'

/**
 * Partition note: `NOT_FOUND` carries no quantity (see fixture comment), so
 * progress-wise it is pending, not counted. `COUNTED_ZERO` is a real
 * measurement and counts as counted.
 *
 * Exact-decimal contract: every output is a string built from integer line
 * counts only. `currentQuantity` strings are never read here, so values past
 * 2^53 cannot corrupt the math. `Number()`/`parseFloat` are banned in this
 * module.
 */
export function selectTotal(lines: readonly OperatorV2LineView[]): string {
  return String(lines.length)
}

export function selectCounted(lines: readonly OperatorV2LineView[]): string {
  return String(lines.filter(isCounted).length)
}

export function selectPending(lines: readonly OperatorV2LineView[]): string {
  return String(lines.length - lines.filter(isCounted).length)
}

export function selectProgress(lines: readonly OperatorV2LineView[]): string {
  const total = lines.length
  if (total === 0) return '0'
  const counted = lines.filter(isCounted).length
  return String(Math.trunc((counted * 100) / total))
}

export function selectKpis(lines: readonly OperatorV2LineView[]): KpiValues {
  return {
    total: selectTotal(lines),
    counted: selectCounted(lines),
    pending: selectPending(lines),
    progress: selectProgress(lines),
  }
}
