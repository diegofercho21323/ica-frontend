import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { InventoryApiProvider } from '../../shared/api/inventory/api-context'
import { mockInventoryApi } from '../../shared/api/inventory/mock'
import type { Attempt } from '../../shared/api/inventory/models'
import type { InventoryApiPort } from '../../shared/api/inventory/port'
import { useRecount } from './useRecount'

function wrapper(api: InventoryApiPort) {
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

const countingApi = () => {
  const calls: Array<{ attemptId: string; lineCodes: string[]; assignee: string }> = []
  const api: InventoryApiPort = {
    ...mockInventoryApi,
    createRecount: async (attemptId, input) => {
      calls.push({ attemptId, lineCodes: [...input.lineCodes], assignee: input.assignee })
      return mockInventoryApi.createRecount(attemptId, input)
    },
  }
  return { api, calls }
}

const lockedAttempt = async (): Promise<Attempt> => {
  const attempt = await mockInventoryApi.startAttempt('scope-centro', 'guided')
  await mockInventoryApi.finalize(attempt.id, { confirm_uncounted: true })
  return attempt
}

describe('useRecount (F4-PR2)', () => {
  beforeEach(async () => {
    await mockInventoryApi.resetDemo()
    await mockInventoryApi.loginDemo({ username: 'lider', password: 'lider' })
  })

  it('creates a blind v2 subset: identity only, quantities restart empty', async () => {
    const { api } = countingApi()
    const { result } = renderHook(() => useRecount(), { wrapper: wrapper(api) })
    const parent = await lockedAttempt()

    const child = await result.current.requestRecount({
      attemptId: parent.id,
      lineCodes: ['SKU-001', 'SKU-999'],
      assignee: 'operator-1',
    })

    expect(child.id).not.toBe(parent.id)
    expect(child.operatorId).toBe('operator-1')
    const lines = await mockInventoryApi.getOperatorLines(child.id)
    // Unknown codes are filtered; the subset carries one blind line.
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({ code: 'SKU-001', state: 'NOT_COUNTED' })
    expect(lines[0]?.currentQuantity).toBeNull()
    expect('finalizedQuantity' in (lines[0] ?? {})).toBe(false)
    // Blind by construction: no parent quantity leaks into the child view.
    expect(JSON.stringify(lines)).not.toContain('10.10')
    expect(JSON.stringify(lines)).not.toContain('9007199254740993')
  })

  it('mints a distinct child per recount and keeps the parent locked', async () => {
    const { api } = countingApi()
    const { result } = renderHook(() => useRecount(), { wrapper: wrapper(api) })
    const parent = await lockedAttempt()

    const first = await result.current.requestRecount({
      attemptId: parent.id,
      lineCodes: ['SKU-001'],
      assignee: 'operator-1',
    })
    const second = await result.current.requestRecount({
      attemptId: parent.id,
      lineCodes: ['SKU-002'],
      assignee: 'operator-1',
    })

    expect(first.id).not.toBe(second.id)
    // The parent is untouched by either recount: same identities, same
    // states, and still locked against edits.
    const parentLines = await mockInventoryApi.getOperatorLines(parent.id)
    expect(parentLines.find((line) => line.code === 'SKU-002')).toMatchObject({
      state: 'COUNTED',
      currentQuantity: '10.10',
    })
    const lockedEdit = await mockInventoryApi
      .saveBatch(parent.id, 'late-key', [
        { lineCode: 'SKU-001', quantity: '1', state: 'COUNTED' },
      ])
      .catch((error: unknown) => error)
    expect(lockedEdit).toMatchObject({ status: 409 })
  })

  it('blocks an empty selection with 400 before any port call', async () => {
    const { api, calls } = countingApi()
    const { result } = renderHook(() => useRecount(), { wrapper: wrapper(api) })
    const parent = await lockedAttempt()

    const failure = await result.current
      .requestRecount({ attemptId: parent.id, lineCodes: [], assignee: 'operator-1' })
      .catch((error: unknown) => error)

    expect(failure).toMatchObject({ status: 400 })
    expect(calls).toHaveLength(0)
  })

  it('surfaces the server 403 for non-leaders with exactly one call', async () => {
    await mockInventoryApi.loginDemo({ username: 'operador', password: 'operador' })
    const { api, calls } = countingApi()
    const { result } = renderHook(() => useRecount(), { wrapper: wrapper(api) })
    const parent = await lockedAttempt()

    const failure = await result.current
      .requestRecount({ attemptId: parent.id, lineCodes: ['SKU-001'], assignee: 'operator-1' })
      .catch((error: unknown) => error)

    expect(failure).toMatchObject({ status: 403 })
    expect(calls).toHaveLength(1)
  })
})
