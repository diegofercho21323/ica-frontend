import type { CostLeaderLineView } from './leader-models'
import type { DemoCredentials, DemoSession, OperatorV2LineView } from './models'

export const demoCredentials: readonly (DemoCredentials & DemoSession)[] = [
  {
    username: 'operador',
    password: 'operador',
    userId: 'operator-1',
    displayName: 'Operador demo',
    role: 'operator',
  },
  {
    username: 'lider',
    password: 'lider',
    userId: 'leader-1',
    displayName: 'Líder de costos',
    role: 'cost-leader',
  },
  {
    username: 'admin',
    password: 'admin',
    userId: 'admin-1',
    displayName: 'Administrador demo',
    role: 'demo-admin',
  },
]

export const operatorV2Fixture: readonly OperatorV2LineView[] = [
  {
    code: 'SKU-001',
    name: 'Caja demo',
    unit: 'UN',
    state: 'NOT_COUNTED',
    currentQuantity: null,
  },
  {
    code: 'SKU-002',
    name: 'Granel demo',
    unit: 'KG',
    // Trailing decimal digits are contract data and must never be normalized.
    state: 'COUNTED',
    currentQuantity: '10.10',
  },
  {
    code: 'SKU-003',
    name: 'Vacío demo',
    unit: 'UN',
    // A counted zero is a real measurement, not an absent one.
    state: 'COUNTED_ZERO',
    currentQuantity: '0',
  },
  {
    code: 'SKU-004',
    name: 'Faltante demo',
    unit: 'UN',
    // Not found carries no quantity at all.
    state: 'NOT_FOUND',
    currentQuantity: null,
  },
  {
    code: 'SKU-005',
    name: 'Precisión demo',
    unit: 'KG',
    // Contract-valid at exactly six decimals, yet the integer part sits past
    // 2^53, so any float coercion still rewrites it to 9007199254740994.
    state: 'COUNTED',
    currentQuantity: '9007199254740993.000001',
  },
]

export const leaderFixture: readonly CostLeaderLineView[] = [
  { ...operatorV2Fixture[0], finalizedQuantity: '12' },
  // The reconciled quantity carries the same precision risk as the captured
  // one, so the leader view keeps a float-breaking value under contract.
  { ...operatorV2Fixture[4], finalizedQuantity: '9007199254740993.000001' },
]
