import type { InventoryApiPort } from '../../shared/api/inventory/port'
import type { InventoryScope } from '../../shared/api/inventory/models'

// Tenant catalog, mock-backed until read endpoints land (PRD §23/GAP-4).
// GET /scopes returns {snapshot_id, warehouse_id, scope_key, display_name};
// the mock InventoryScope only carries id+name, so the mapping below is an
// explicit passthrough labeled mock-backed — the client invents no server
// fields. Company scoping filters on caller-supplied data only.
export type TenantScope = {
  snapshot_id: string
  warehouse_id: string
  scope_key: string
  display_name: string
  companyId: string
}

export type SessionLink = {
  session_id?: string
  attempt_id: string
}

export const DEFAULT_COMPANY_ID = 'demo-company'

export const toTenantScope = (
  scope: InventoryScope,
  companyId: string,
): TenantScope => ({
  snapshot_id: scope.id,
  warehouse_id: scope.id,
  scope_key: scope.id,
  display_name: scope.name,
  companyId,
})

export const filterScopesByCompany = (
  catalog: readonly TenantScope[],
  companyId: string,
): TenantScope[] =>
  catalog.filter((scope) => scope.companyId === companyId)

// session_id links start → history → recount. POST /sessions returns no
// session_id yet (GAP-4), so the link stays optional and history queries by
// session_id only when one was actually passed through.
export const historyQueryKey = (link: SessionLink): string[] =>
  link.session_id !== undefined
    ? ['sessions', link.session_id, 'history']
    : ['attempts', link.attempt_id, 'history']

export const buildScopesQuery = (
  port: Pick<InventoryApiPort, 'listScopes'>,
  companyId: string,
) => ({
  queryKey: ['scopes', companyId] as const,
  queryFn: async (): Promise<TenantScope[]> =>
    filterScopesByCompany(
      (await port.listScopes()).map((scope) => toTenantScope(scope, companyId)),
      companyId,
    ),
})
