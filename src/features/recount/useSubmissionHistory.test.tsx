import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { InventoryApiProvider } from '../../shared/api/inventory/api-context'
import { HttpError } from '../../shared/api/inventory/errors'
import { mockInventoryApi } from '../../shared/api/inventory/mock'
import type { Attempt, Receipt } from '../../shared/api/inventory/models'
import type { InventoryApiPort } from '../../shared/api/inventory/port'
import { sessionHistoryKey, useSubmissionHistory } from './useSubmissionHistory'

const fakeAttempt = (overrides: Partial<Attempt> = {}): Attempt => ({
  id: 'att-9',
  operatorId: 'operator-1',
  scopeId: 'scope-centro',
  mode: 'guided',
  sessionId: 'sess-9',
  ...overrides,
})

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

const submittedAttempt = async (key: string) => {
  const attempt = await mockInventoryApi.startAttempt('scope-centro', 'guided')
  await mockInventoryApi.saveBatch(attempt.id, 'cap-1', [
    { lineCode: 'SKU-001', quantity: '5', state: 'COUNTED' },
  ])
  await mockInventoryApi.finalize(attempt.id, { confirm_uncounted: true })
  const receipt = await mockInventoryApi.submit(attempt.id, key)
  return { attempt, receipt }
}

describe('useSubmissionHistory (F4-PR2)', () => {
  beforeEach(async () => {
    await mockInventoryApi.resetDemo()
  })

  it('keys history reads by the started attempt session_id and exposes the terminal receipt', async () => {
    const { attempt, receipt } = await submittedAttempt('history-key')
    const { result } = renderHook(() => useSubmissionHistory({ attempt }), {
      wrapper: wrapper(mockInventoryApi),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.historyKey).toEqual([
      'submission-history',
      attempt.sessionId,
      attempt.id,
    ])
    expect(sessionHistoryKey(attempt.sessionId)).toEqual([
      'submission-history',
      attempt.sessionId,
    ])
    expect(sessionHistoryKey('sess-2')).not.toEqual(sessionHistoryKey(attempt.sessionId))
    expect(result.current.versions).toHaveLength(1)
    expect(result.current.versions[0]).toMatchObject({ v: 1 })
    expect(result.current.versions[0]?.submission).toEqual(receipt)
    expect(receipt.payload_hash.length).toBeGreaterThan(0)
    expect(receipt.erp_reference).toBe(`erp-${attempt.id}-v1`)
  })

  it('mints a real session_id at start-attempt and a recount child never invents a new one', async () => {
    const parent = await mockInventoryApi.startAttempt('scope-centro', 'guided')
    await mockInventoryApi.saveBatch(parent.id, 'cap-recount', [
      { lineCode: 'SKU-001', quantity: '5', state: 'COUNTED' },
    ])
    await mockInventoryApi.finalize(parent.id, { confirm_uncounted: true })
    await mockInventoryApi.loginDemo({ username: 'lider', password: 'lider' })
    const child = await mockInventoryApi.createRecount(parent.id, {
      lineCodes: ['SKU-001'],
      assignee: 'operator-2',
    })

    expect(parent.sessionId).toBeTruthy()
    expect(parent.sessionId).not.toBe(parent.id)
    // Recount continues the same counting session — never a bare attempt_id
    // stand-in and never a freshly minted, disconnected session.
    expect(child.sessionId).toBe(parent.sessionId)
    expect(child.id).not.toBe(parent.id)

    const { result } = renderHook(() => useSubmissionHistory({ attempt: child }), {
      wrapper: wrapper(mockInventoryApi),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.historyKey).toEqual([
      'submission-history',
      parent.sessionId,
      child.id,
    ])
  })

  it('retries an unchanged payload with the same key in exactly one call', async () => {
    const { attempt } = await submittedAttempt('retry-key')
    const calls: Array<{ attemptId: string; key: string }> = []
    const api: InventoryApiPort = {
      ...mockInventoryApi,
      submit: async (attemptId, key) => {
        calls.push({ attemptId, key })
        return mockInventoryApi.submit(attemptId, key)
      },
    }
    const { result } = renderHook(() => useSubmissionHistory({ attempt }), {
      wrapper: wrapper(api),
    })

    const receipt = await result.current.resubmitSameKey(attempt.id, 'retry-key')
    expect(calls).toEqual([{ attemptId: attempt.id, key: 'retry-key' }])
    expect(receipt).toMatchObject({ key: 'retry-key', status: 'SUCCEEDED' })
  })

  it('reports 409 as needs-recovery with one request and never auto-retries', async () => {
    const submitCalls: string[] = []
    const authorizeCalls: string[] = []
    const api: InventoryApiPort = {
      ...mockInventoryApi,
      submit: async (_attemptId, key) => {
        submitCalls.push(key)
        if (key.endsWith('-replacement-1')) {
          const receipt: Receipt = {
            key,
            status: 'SUCCEEDED',
            payload_hash: 'recovered-hash',
            erp_reference: 'erp-recovered-v1',
          }
          return receipt
        }
        throw new HttpError(409, 'IDEMPOTENCY_CONFLICT', 'same key, different body')
      },
      authorizeReplacementKey: async (key) => {
        authorizeCalls.push(key)
        return `${key}-replacement-1`
      },
    }
    const { result } = renderHook(() => useSubmissionHistory({ attempt: fakeAttempt() }), {
      wrapper: wrapper(api),
    })

    const blocked = await result.current.resubmitSameKey('att-9', 'clash-key')
    expect(blocked).toEqual({ needsRecovery: true, key: 'clash-key' })
    expect(submitCalls).toEqual(['clash-key'])
    expect(authorizeCalls).toHaveLength(0)
  })

  it('authorizes a replacement key only with explicit confirmation', async () => {
    const submitCalls: string[] = []
    const authorizeCalls: string[] = []
    const api: InventoryApiPort = {
      ...mockInventoryApi,
      submit: async (_attemptId, key) => {
        submitCalls.push(key)
        const receipt: Receipt = {
          key,
          status: 'SUCCEEDED',
          payload_hash: 'recovered-hash',
          erp_reference: 'erp-recovered-v1',
        }
        return receipt
      },
      authorizeReplacementKey: async (key) => {
        authorizeCalls.push(key)
        return `${key}-replacement-1`
      },
    }
    const { result } = renderHook(() => useSubmissionHistory({ attempt: fakeAttempt() }), {
      wrapper: wrapper(api),
    })

    await expect(
      result.current.recoverWithReplacementKey('att-9', 'clash-key', {
        confirmed: false,
      }),
    ).rejects.toMatchObject({ status: 409 })
    expect(authorizeCalls).toHaveLength(0)
    expect(submitCalls).toHaveLength(0)

    const receipt = await result.current.recoverWithReplacementKey(
      'att-9',
      'clash-key',
      { confirmed: true },
    )
    expect(authorizeCalls).toEqual(['clash-key'])
    expect(submitCalls).toEqual(['clash-key-replacement-1'])
    expect(receipt).toMatchObject({
      key: 'clash-key-replacement-1',
      status: 'SUCCEEDED',
    })
  })
})
