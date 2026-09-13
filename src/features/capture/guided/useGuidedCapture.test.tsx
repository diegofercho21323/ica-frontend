import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { HttpError } from '../../../shared/api/inventory/errors'
import { toChangeInput } from '../../../shared/api/inventory/http'
import { InventoryApiProvider } from '../../../shared/api/inventory/api-context'
import type { InventoryApiPort } from '../../../shared/api/inventory/port'
import { mockInventoryApi } from '../../../shared/api/inventory/mock'
import type { OperatorLineView } from '../../../shared/api/inventory/models'
import {
  __resetTelemetryForTests,
  getAttemptTelemetry,
} from '../../../shared/lib/telemetry/telemetry'
import {
  buildConfirmChange,
  getNextPendingIndex,
  getPendingIdentities,
  getProgress,
  resolveShortcut,
  useGuidedCapture,
} from './useGuidedCapture'

const LINES: OperatorLineView[] = [
  { code: 'A', name: 'Caja', unit: 'UN', state: 'COUNTED', currentQuantity: '2' },
  { code: 'B', name: 'Granel', unit: 'KG', state: 'NOT_COUNTED', currentQuantity: null },
  { code: 'C', name: 'Vacío', unit: 'UN', state: 'NOT_COUNTED', currentQuantity: null },
]

function hookWrapper(api: InventoryApiPort) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <InventoryApiProvider api={api}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </InventoryApiProvider>
    )
  }
}

describe('guided-capture pure helpers (F3-PR2)', () => {
  it('counts counted-vs-pending with zero quantities in the projection', () => {
    expect(getProgress(LINES)).toEqual({ counted: 1, total: 3 })
    expect(JSON.stringify(getProgress(LINES))).not.toContain('2')
  })

  it('finds the next pending line with wrap-around and -1 when done', () => {
    expect(getNextPendingIndex(LINES, 0)).toBe(1)
    expect(getNextPendingIndex(LINES, 2)).toBe(2)
    expect(getNextPendingIndex(LINES, 1)).toBe(1)
    const done = LINES.map((line) => ({ ...line, state: 'COUNTED' as const }))
    expect(getNextPendingIndex(done, 0)).toBe(-1)
  })

  it('reveals pending identities with units only, never values', () => {
    const pending = getPendingIdentities(LINES)
    expect(pending).toEqual([
      { code: 'B', name: 'Granel', unit: 'KG' },
      { code: 'C', name: 'Vacío', unit: 'UN' },
    ])
    for (const entry of pending) {
      expect(Object.keys(entry).sort()).toEqual(['code', 'name', 'unit'])
    }
  })

  it('maps keyboard shortcuts without hijacking in-field editing', () => {
    expect(resolveShortcut('Enter', { ctrlKey: false, inField: true })).toBe('save')
    expect(resolveShortcut('Escape', { ctrlKey: false, inField: true })).toBe('close')
    expect(resolveShortcut('ArrowDown', { ctrlKey: false, inField: true })).toBeNull()
    expect(resolveShortcut('ArrowDown', { ctrlKey: false, inField: false })).toBe('next')
    expect(resolveShortcut('ArrowUp', { ctrlKey: false, inField: false })).toBe('prev')
    expect(resolveShortcut('k', { ctrlKey: true, inField: true })).toBe('search')
    expect(resolveShortcut('x', { ctrlKey: false, inField: false })).toBeNull()
  })

  it('builds the advisory confirm retry with the identical exact string', () => {
    const retry = buildConfirmChange(LINES[1], '9007199254740993.000001')
    expect(retry).toEqual({
      lineCode: 'B',
      quantity: '9007199254740993.000001',
      state: 'COUNTED',
      unit: 'KG',
      captureMethod: 'keyboard',
      confirmUnusualQuantity: true,
    })
  })

  it('carries unit, capture method, and confirm flag into the ChangeInput body', () => {
    const body = toChangeInput(
      {
        lineCode: 'B',
        quantity: '9007199254740993.000001',
        state: 'COUNTED',
        unit: 'KG',
        captureMethod: 'keyboard',
        confirmUnusualQuantity: true,
      },
      { unit: '', capture_method: 'MANUAL' },
    )
    expect(body).toMatchObject({
      line_id: 'B',
      quantity: '9007199254740993.000001',
      unit: 'KG',
      capture_method: 'keyboard',
      confirm_unusual_quantity: true,
    })
  })
})

describe('useGuidedCapture hook (F3-PR2)', () => {
  it('guided starts at the first pending line and auto-advances on save', async () => {
    __resetTelemetryForTests()
    await mockInventoryApi.resetDemo()
    const attempt = await mockInventoryApi.startAttempt('scope-centro', 'guided')
    // Two pending lines so the advance has somewhere to go.
    await mockInventoryApi.saveBatch(attempt.id, 'setup-reopen-sku-002', [
      { lineCode: 'SKU-002', quantity: null, state: 'NOT_COUNTED' },
    ])
    const { result } = renderHook(() => useGuidedCapture(attempt.id, 'guided'), {
      wrapper: hookWrapper(mockInventoryApi),
    })
    await waitFor(() => expect(result.current.current?.code).toBe('SKU-001'))
    const first = result.current.current?.code
    act(() => {
      result.current.saveCurrent({ quantity: '2', unit: 'UN', captureMethod: 'keyboard' })
    })
    await waitFor(() => expect(result.current.current?.code).not.toBe(first))
    // Saved history stays editable: the operator can jump back.
    act(() => {
      result.current.selectLine('SKU-001')
    })
    expect(result.current.current?.code).toBe('SKU-001')
    // Focus-to-save timing joins the attempt's telemetry aggregate — never
    // blocking, never a raw log the caller must reduce themselves.
    const telemetry = getAttemptTelemetry(attempt.id)
    expect(telemetry.focusToSave.sampleCount).toBeGreaterThanOrEqual(1)
    expect(telemetry.focusToSave.medianMs).not.toBeNull()
  })

  it('manual starts empty until a line is picked from search', async () => {
    await mockInventoryApi.resetDemo()
    const attempt = await mockInventoryApi.startAttempt('scope-centro', 'manual')
    const { result } = renderHook(() => useGuidedCapture(attempt.id, 'manual'), {
      wrapper: hookWrapper(mockInventoryApi),
    })
    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(result.current.current).toBeNull()
    expect(result.current.pending.length).toBeGreaterThan(0)
    const picked = result.current.pending[0].code
    act(() => {
      result.current.selectLine(picked)
    })
    expect(result.current.current?.code).toBe(picked)
  })

  it('blocks unit mismatches inline, excludes them from the batch, and counts the telemetry error', async () => {
    __resetTelemetryForTests()
    await mockInventoryApi.resetDemo()
    const attempt = await mockInventoryApi.startAttempt('scope-centro', 'guided')
    const saveBatch = vi.fn(mockInventoryApi.saveBatch.bind(mockInventoryApi))
    const api: InventoryApiPort = { ...mockInventoryApi, saveBatch }
    const { result } = renderHook(() => useGuidedCapture(attempt.id, 'guided'), {
      wrapper: hookWrapper(api),
    })
    await waitFor(() => expect(result.current.current?.code).toBe('SKU-001'))
    act(() => {
      result.current.saveCurrent({ quantity: '2', unit: 'KG', captureMethod: 'keyboard' })
    })
    expect(result.current.fieldError).toBe('unit-mismatch')
    expect(saveBatch).not.toHaveBeenCalled()
    expect(getAttemptTelemetry(attempt.id).unitErrorCount).toBe(1)
  })

  it('holds advisory 422 confirm and resends the identical string with flag', async () => {
    await mockInventoryApi.resetDemo()
    const attempt = await mockInventoryApi.startAttempt('scope-centro', 'guided')
    const calls: { quantity: unknown; confirm: unknown }[] = []
    let first = true
    const api: InventoryApiPort = {
      ...mockInventoryApi,
      saveBatch: async (attemptId, key, changes) => {
        calls.push({
          quantity: changes[0]?.quantity,
          confirm: changes[0]?.confirmUnusualQuantity ?? false,
        })
        if (first) {
          first = false
          throw new HttpError(422, 'UNPROCESSABLE', 'soft limit exceeded')
        }
        return mockInventoryApi.saveBatch(attemptId, key, changes)
      },
    }
    const { result } = renderHook(() => useGuidedCapture(attempt.id, 'guided'), {
      wrapper: hookWrapper(api),
    })
    await waitFor(() => expect(result.current.current?.code).toBe('SKU-001'))
    act(() => {
      result.current.saveCurrent({
        quantity: '9007199254740993.000001',
        unit: 'UN',
        captureMethod: 'keyboard',
      })
    })
    await waitFor(() => expect(result.current.pendingConfirm).not.toBeNull())
    expect(result.current.pendingConfirm?.quantity).toBe('9007199254740993.000001')
    expect(result.current.notice).toBe('confirm-required')
    act(() => {
      result.current.confirmUnusual()
    })
    await waitFor(() => expect(result.current.pendingConfirm).toBeNull())
    expect(calls).toHaveLength(2)
    // Confirmation never rounds or clamps: identical string, flag on.
    expect(calls[1]).toEqual({ quantity: '9007199254740993.000001', confirm: true })
  })
})
