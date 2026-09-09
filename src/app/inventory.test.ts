import { renderHook } from '@testing-library/react'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { PropsWithChildren } from 'react'
import { createElement } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { vi } from 'vitest'
import { disabledHttpInventoryApi } from '../shared/api/inventory/http'
import { mockInventoryApi } from '../shared/api/inventory/mock'
import type { InventoryApiPort } from '../shared/api/inventory/port'
import {
  InventoryApiProvider,
  resolveInventoryApi,
  useInventoryApi,
} from './inventory'

const ADAPTER_IMPORT = /inventory\/(mock|http)|from\s+['"]axios['"]/

function featureSources(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      found.push(...featureSources(path))
      continue
    }
    if (/\.tsx?$/.test(entry) && !/\.test\.[jt]sx?$/.test(entry)) {
      found.push(path)
    }
  }
  return found
}

describe('inventory adapter resolution', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves the mock adapter by default with zero network calls', () => {
    expect(resolveInventoryApi(undefined)).toBe(mockInventoryApi)
    expect(resolveInventoryApi('mock')).toBe(mockInventoryApi)
  })

  it('resolves the HTTP adapter when flagged on', () => {
    expect(resolveInventoryApi('http')).toBe(disabledHttpInventoryApi)
  })

  it('falls back to mock with a warning on an unknown adapter value', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(resolveInventoryApi('graphql')).toBe(mockInventoryApi)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toMatch(/graphql/)
  })

  it('exposes the mock adapter by default without a provider', () => {
    const { result } = renderHook(() => useInventoryApi())
    expect(result.current).toBe(mockInventoryApi)
  })

  it('exposes the provided adapter inside InventoryApiProvider', () => {
    const custom: InventoryApiPort = { ...mockInventoryApi }
    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(InventoryApiProvider, { api: custom }, children)
    const { result } = renderHook(() => useInventoryApi(), { wrapper })
    expect(result.current).toBe(custom)
  })

  it('keeps direct adapter imports out of migrated features', () => {
    // Full FSD target: zero files under src/features/ import mock/http/axios.
    // Debt still owned by later phases stays explicit here so no NEW direct
    // import can land silently; each phase entry shrinks this list.
    const ownedByLater = new Set([
      join('src', 'features', 'dashboard', 'DashboardKpis.tsx'),
      join('src', 'features', 'attempts', 'useReview.ts'),
      join('src', 'features', 'attempts', 'useFinalize.ts'),
      join('src', 'features', 'bodegas', 'BodegasList.tsx'),
    ])
    const violators = featureSources(join('src', 'features')).filter((path) =>
      ADAPTER_IMPORT.test(readFileSync(path, 'utf8')),
    )
    expect(new Set(violators)).toEqual(ownedByLater)
  })
})
