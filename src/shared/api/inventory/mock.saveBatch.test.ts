import { beforeEach, describe, expect, it } from 'vitest'
import type { CaptureChange } from './models'
import { mockInventoryApi } from './mock'

const changes: CaptureChange[] = [
  { lineCode: 'SKU-001', quantity: '5', state: 'COUNTED' },
  { lineCode: 'SKU-002', quantity: '10.10', state: 'COUNTED' },
]

describe('mock saveBatch', () => {
  beforeEach(async () => {
    await mockInventoryApi.resetDemo()
  })

  it('dedupes a same-key same-payload retry as a no-op success', async () => {
    await mockInventoryApi.saveBatch('key-1', changes)
    await expect(mockInventoryApi.saveBatch('key-1', changes)).resolves.toBeUndefined()

    const lines = await mockInventoryApi.getOperatorLines('capture')
    expect(lines.find((line) => line.code === 'SKU-001')?.state).toBe('COUNTED')
  })

  it('rejects the same key with a different payload', async () => {
    await mockInventoryApi.saveBatch('key-1', changes)
    await expect(
      mockInventoryApi.saveBatch('key-1', [
        { lineCode: 'SKU-001', quantity: '6', state: 'COUNTED' },
      ]),
    ).rejects.toThrow()
  })

  it('resetDemo clears seen keys so the key can be reused', async () => {
    await mockInventoryApi.saveBatch('key-1', changes)
    await mockInventoryApi.resetDemo()
    await expect(
      mockInventoryApi.saveBatch('key-1', [
        { lineCode: 'SKU-001', quantity: '6', state: 'COUNTED' },
      ]),
    ).resolves.toBeUndefined()
  })

  it('resetDemo clears applied state back to the fixture', async () => {
    await mockInventoryApi.saveBatch('key-1', changes)
    await mockInventoryApi.resetDemo()
    const lines = await mockInventoryApi.getOperatorLines('capture')
    expect(lines.find((line) => line.code === 'SKU-001')?.state).toBe('NOT_COUNTED')
  })
})
