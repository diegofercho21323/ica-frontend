import { describe, expect, it } from 'vitest'
import { QTY_RE, toPayloadQty } from './validation'

describe('QTY_RE', () => {
  it.each(['0', '5', '10.10', '9007199254740993.000001', '3.1', '007'])(
    'accepts exact-decimal string %s verbatim',
    (value) => {
      expect(QTY_RE.test(value)).toBe(true)
    },
  )

  it.each(['12.3456789', 'abc', '', '-3', '1.', '.5', '10,10', ' 10', '10 '])(
    'rejects %s',
    (value) => {
      expect(QTY_RE.test(value)).toBe(false)
    },
  )
})

describe('toPayloadQty', () => {
  it('maps COUNTED_ZERO to the string zero', () => {
    expect(toPayloadQty('COUNTED_ZERO', '')).toBe('0')
  })

  it('maps NOT_FOUND to null', () => {
    expect(toPayloadQty('NOT_FOUND', '')).toBeNull()
  })

  it('passes COUNTED quantities through verbatim', () => {
    expect(toPayloadQty('COUNTED', '10.10')).toBe('10.10')
    expect(toPayloadQty('COUNTED', '9007199254740993.000001')).toBe(
      '9007199254740993.000001',
    )
  })
})
