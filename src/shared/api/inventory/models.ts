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

export type CostLeaderLineView = OperatorLineView & {
  // Decimal JSON, exactly like `currentQuantity`: the authoritative reconciled
  // quantity must stay an exact string, never an IEEE-754 double.
  finalizedQuantity: string | null
}

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
