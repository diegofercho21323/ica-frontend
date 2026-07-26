import type { OperatorLineView } from './models'

// This type lives in its own module on purpose. dependency-cruiser reasons at
// module granularity, so while a cost-leader projection shares `models.ts` with
// the operator-facing views, no dependency rule can keep it out of an
// operator-facing screen. Isolating the module is what makes the
// `leader-view-is-recount-authoring-only` rule enforceable at all.
export type CostLeaderLineView = OperatorLineView & {
  // Decimal JSON, exactly like `currentQuantity`: the authoritative reconciled
  // quantity must stay an exact string, never an IEEE-754 double.
  finalizedQuantity: string | null
}
