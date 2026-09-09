import { describe, expect, it } from 'vitest'
import { mockInventoryApi } from '../../shared/api/inventory/mock'
import {
  DEFAULT_COMPANY_ID,
  buildScopesQuery,
  filterScopesByCompany,
  historyQueryKey,
  toTenantScope,
  type TenantScope,
} from './tenant-catalog'

const catalog: TenantScope[] = [
  {
    snapshot_id: 'snap-acme-1',
    warehouse_id: 'wh-acme-1',
    scope_key: 'acme-centro',
    display_name: 'Acme Centro',
    companyId: 'acme',
  },
  {
    snapshot_id: 'snap-acme-2',
    warehouse_id: 'wh-acme-2',
    scope_key: 'acme-norte',
    display_name: 'Acme Norte',
    companyId: 'acme',
  },
  {
    snapshot_id: 'snap-other-1',
    warehouse_id: 'wh-other-1',
    scope_key: 'other-centro',
    display_name: 'Other Centro',
    companyId: 'other',
  },
]

describe('tenant catalog (mock-backed until reads land)', () => {
  it('maps a mock scope to App. A scope keys under the active company', () => {
    expect(
      toTenantScope({ id: 'scope-centro', name: 'Bodega Centro' }, 'acme'),
    ).toEqual({
      snapshot_id: 'scope-centro',
      warehouse_id: 'scope-centro',
      scope_key: 'scope-centro',
      display_name: 'Bodega Centro',
      companyId: 'acme',
    })
  })

  it('lists only the active company scopes keyed by scope_key', () => {
    const scopes = filterScopesByCompany(catalog, 'acme')
    expect(scopes.map((scope) => scope.scope_key).sort()).toEqual([
      'acme-centro',
      'acme-norte',
    ])
    expect(
      filterScopesByCompany(catalog, 'other').map(
        (scope) => scope.scope_key,
      ),
    ).toEqual(['other-centro'])
  })

  it('queries history by session_id when linked, never by bare attempt inference', () => {
    expect(
      historyQueryKey({ session_id: 'sess-1', attempt_id: 'att-1' }),
    ).toEqual(['sessions', 'sess-1', 'history'])
    // No session linkage yet (GAP-4): the attempt fallback stays explicit.
    expect(historyQueryKey({ attempt_id: 'att-1' })).toEqual([
      'attempts',
      'att-1',
      'history',
    ])
  })

  it('builds a company-scoped Query owned by server state', async () => {
    const query = buildScopesQuery(
      { listScopes: () => mockInventoryApi.listScopes() },
      DEFAULT_COMPANY_ID,
    )
    expect(query.queryKey).toEqual(['scopes', DEFAULT_COMPANY_ID])
    const scopes = await query.queryFn()
    expect(scopes).toHaveLength(3)
    expect(
      new Set(scopes.map((scope) => scope.companyId)),
    ).toEqual(new Set([DEFAULT_COMPANY_ID]))
    expect(scopes.map((scope) => scope.scope_key).sort()).toEqual([
      'scope-centro',
      'scope-norte',
      'scope-sur',
    ])
  })
})
