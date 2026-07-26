import { describe, expect, it } from 'vitest'

import { mockInventoryApi } from '../src/shared/api/inventory/mock'

/**
 * Layer 3 of the three-layer blind-count enforcement.
 *
 * Layer 1 is type absence and layer 2 is module isolation, but both are static.
 * A mutation that removes a field from a type *and* fixes its fixture in the
 * same edit is internally consistent, so `tsc` accepts it at exit 0 — that is a
 * defect this repository has already shipped once. The only check that can see
 * such a leak is one that reads the keys of the objects the port actually
 * returns at runtime.
 *
 * Operator-facing projections must never carry an audit or reconciliation
 * figure: seeing one turns a blind count into a confirmation of the system's
 * own number.
 */
const FORBIDDEN_OPERATOR_KEYS: readonly string[] = [
  'finalizedQuantity',
  'theoreticalQuantity',
  'previousQuantity',
  'difference',
  'delta',
  'variance',
  'compatibility',
  'ranking',
  'cause',
  'recommendation',
]

/**
 * Walks arrays and plain objects so a figure nested inside a projection is
 * caught too, not just one sitting on the top-level object.
 */
const collectKeys = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(collectKeys)
  if (value === null || typeof value !== 'object') return []
  const own = Object.keys(value as Record<string, unknown>)
  return [
    ...own,
    ...Object.values(value as Record<string, unknown>).flatMap(collectKeys),
  ]
}

const expectNoForbiddenKeys = (projection: unknown, source: string): void => {
  const leaked = [...new Set(collectKeys(projection))].filter((key) =>
    FORBIDDEN_OPERATOR_KEYS.includes(key),
  )
  expect(
    leaked,
    `${source} leaked forbidden audit key(s) into an operator-facing projection: ${leaked.join(', ')}`,
  ).toEqual([])
}

describe('blind count safety: operator projections carry no system figure', () => {
  it('exposes no forbidden key from listScopes()', async () => {
    expectNoForbiddenKeys(await mockInventoryApi.listScopes(), 'listScopes()')
  })

  it('exposes no forbidden key from getOperatorLines()', async () => {
    const lines = await mockInventoryApi.getOperatorLines('attempt-1')
    // Guard the guard: an empty projection would satisfy the assertion below
    // without ever inspecting a real key.
    expect(lines.length).toBeGreaterThan(0)
    expectNoForbiddenKeys(lines, 'getOperatorLines()')
  })
})
