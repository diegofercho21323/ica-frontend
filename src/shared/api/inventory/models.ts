export type DemoRole = 'operator' | 'cost-leader' | 'demo-admin'

export type DemoSession = {
  userId: string
  displayName: string
  role: DemoRole
}

export type DemoCredentials = {
  username: string
  password: string
}

export type OperatorLineView = {
  code: string
  name: string
  unit: string
  state: 'NOT_COUNTED' | 'COUNTED' | 'COUNTED_ZERO' | 'NOT_FOUND'
  currentQuantity: string | null
}

export type OperatorV2LineView = OperatorLineView

// `CostLeaderLineView` deliberately does NOT live here: see `leader-models.ts`.

export type InventoryScope = {
  id: string
  name: string
}
export type AttemptMode = 'guided' | 'manual'
export type Attempt = {
  id: string
  operatorId: string
  scopeId: string
  mode: AttemptMode
}
export type CaptureChange = {
  lineCode: string
  quantity: string | null
  state: OperatorLineView['state']
}
export type DemoPreset = 'open-count' | 'finalized' | 'retry' | 'blind-v2'

export type Receipt = {
  key: string
  status: 'SUCCEEDED' | 'FAILED'
  payload_hash: string
  erp_reference: string | null
}

export type AttemptVersion = {
  v: number
  lockedAt: string
  lineCount: number
  submission?: Receipt
}

// Review completeness exposes identity+unit only for pending lines: quantities
// and ERP data must never leak through the pending projection.
export type ReviewView = {
  attemptId: string
  counted: OperatorLineView[]
  pending: Pick<OperatorLineView, 'code' | 'name' | 'unit'>[]
}

export type AttemptRecord = {
  attempt: Attempt
  lines: Map<string, OperatorLineView>
  versions: AttemptVersion[]
  locked: boolean
}

export type FinalizeOptions = {
  confirm_uncounted?: boolean
}

export type RecountInput = {
  lineCodes: string[]
  assignee: string
}
