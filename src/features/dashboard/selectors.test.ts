import { describe, expect, it } from 'vitest'
import { operatorV2Fixture } from '../../shared/api/inventory/fixtures'
import type { OperatorV2LineView } from '../../shared/api/inventory/models'
import { selectKpis } from './selectors'

describe('selectKpis', () => {
  it('derives 5/3/2/60 from the 5-line operator fixture', () => {
    expect(selectKpis(operatorV2Fixture)).toEqual({
      total: '5',
      counted: '3',
      pending: '2',
      progress: '60',
    })
  })

  it('recomputes when a pending line becomes counted', () => {
    const flipped: OperatorV2LineView[] = operatorV2Fixture.map((line) =>
      line.code === 'SKU-001' ? { ...line, state: 'COUNTED' } : { ...line },
    )
    expect(selectKpis(flipped)).toEqual({
      total: '5',
      counted: '4',
      pending: '1',
      progress: '80',
    })
  })

  it('never coerces exact-decimal quantity strings', () => {
    const kpis = selectKpis(operatorV2Fixture)
    for (const value of Object.values(kpis)) {
      expect(typeof value).toBe('string')
    }
    // The fixture carries '9007199254740993.000001' past 2^53: no output may
    // leak quantity digits, and avance stays the exact string "60".
    expect(Object.values(kpis).join('|')).not.toContain('9007199254740993')
    expect(kpis.progress).toBe('60')
  })

  it('truncates the avance remainder instead of rounding', () => {
    const lines: OperatorV2LineView[] = [
      { code: 'A', name: 'A', unit: 'UN', state: 'COUNTED', currentQuantity: '1' },
      { code: 'B', name: 'B', unit: 'UN', state: 'NOT_COUNTED', currentQuantity: null },
      { code: 'C', name: 'C', unit: 'UN', state: 'NOT_COUNTED', currentQuantity: null },
    ]
    expect(selectKpis(lines).progress).toBe('33')
  })

  it('maps empty input to zeros', () => {
    expect(selectKpis([])).toEqual({
      total: '0',
      counted: '0',
      pending: '0',
      progress: '0',
    })
  })
})
