import { describe, expect, it } from 'vitest'
import { buildChangeInput, buildConfirmChange } from './change-input'

const LINE = { code: 'SKU-002', unit: 'KG' }

describe('change-input builder (capture "Contract-exact ChangeInput")', () => {
  it('carries the exact-string quantity verbatim, never coerced to number', () => {
    const change = buildChangeInput(LINE, {
      quantity: '9007199254740993.000001',
      captureMethod: 'keyboard',
    })
    expect(change).toEqual({
      lineCode: 'SKU-002',
      quantity: '9007199254740993.000001',
      state: 'COUNTED',
      unit: 'KG',
      captureMethod: 'keyboard',
      confirmUnusualQuantity: false,
    })
    expect(typeof change.quantity).toBe('string')
  })

  it('always takes the unit from the authoritative line, never the form', () => {
    const change = buildChangeInput(LINE, { quantity: '2', captureMethod: 'manual' })
    expect(change.unit).toBe('KG')
  })

  it('builds the advisory confirm retry with the identical string and flag on', () => {
    const retry = buildConfirmChange(LINE, '9007199254740993.000001', 'keyboard')
    expect(retry).toEqual({
      lineCode: 'SKU-002',
      quantity: '9007199254740993.000001',
      state: 'COUNTED',
      unit: 'KG',
      captureMethod: 'keyboard',
      confirmUnusualQuantity: true,
    })
  })

  it('defaults the confirm retry capture method to keyboard when omitted', () => {
    const retry = buildConfirmChange(LINE, '3')
    expect(retry.captureMethod).toBe('keyboard')
  })

  it('never mutates the quantity string between the initial send and the confirm resend', () => {
    const original = buildChangeInput(LINE, { quantity: '0.000001', captureMethod: 'keyboard' })
    const resend = buildConfirmChange(LINE, original.quantity ?? '', 'keyboard')
    expect(resend.quantity).toBe(original.quantity)
    expect(resend.confirmUnusualQuantity).toBe(true)
    expect(original.confirmUnusualQuantity).toBe(false)
  })
})
