import { describe, expect, it } from 'vitest'
import { parseDemoSession } from './parseDemoSession'

describe('parseDemoSession', () => {
  it.each([
    {
      role: 'operator',
      value: { userId: 'operator-1', displayName: 'Operador demo', role: 'operator' },
    },
    {
      role: 'cost-leader',
      value: { userId: 'leader-1', displayName: 'Líder de costos', role: 'cost-leader' },
    },
    {
      role: 'demo-admin',
      value: { userId: 'admin-1', displayName: 'Administrador demo', role: 'demo-admin' },
    },
  ])('accepts a valid $role session', ({ value }) => {
    expect(parseDemoSession(value)).toEqual(value)
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['string', 'operator-1'],
    ['number', 42],
    ['empty object', {}],
    ['missing userId', { displayName: 'Operador demo', role: 'operator' }],
    ['empty userId', { userId: '', displayName: 'Operador demo', role: 'operator' }],
    ['missing displayName', { userId: 'operator-1', role: 'operator' }],
    ['unknown role', { userId: 'operator-1', displayName: 'Operador demo', role: 'super-admin' }],
    ['missing role', { userId: 'operator-1', displayName: 'Operador demo' }],
    ['array', [{ userId: 'operator-1', displayName: 'Operador demo', role: 'operator' }]],
  ])('returns null for %s payloads', (_label, value) => {
    expect(parseDemoSession(value)).toBeNull()
  })
})
