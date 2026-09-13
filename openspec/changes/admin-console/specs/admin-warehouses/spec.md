# Admin Warehouses Specification

## Purpose

New capability. Depends on (read-only): `InventoryScope`/`TenantScope` (`src/shared/api/inventory/models.ts`, `src/features/tenants/tenant-catalog.ts`), `InventoryApiPort`, and the `Table` primitive (`src/shared/ui/primitives/Table.tsx`). Extends the warehouse shape with CRUD; does not replace `InventoryScope` or `TenantScope`.

## Requirements

### Requirement: Extended warehouse fields and port methods

The system MUST extend `InventoryScope` with `active: boolean` and `companyId: string` as first-class fields (not invented by a mapping layer). The system MUST add `createScope()`, `updateScope()`, `deactivateScope()` to `InventoryApiPort`, alongside the existing `listScopes()`. `mockInventoryApi` MUST implement all three fully; the HTTP adapter MUST add them as `disabled()` stubs.

#### Scenario: Mock CRUD round-trip

- GIVEN the mock adapter is active
- WHEN an admin creates a warehouse, lists warehouses, updates its name, then deactivates it
- THEN each call resolves and `listScopes()` reflects the current state

#### Scenario: HTTP adapter stays disabled

- GIVEN the HTTP adapter is active
- WHEN any of the three new methods is called
- THEN it throws `HTTP_DISABLED_MESSAGE` and performs no network request

### Requirement: List view reuses the Table primitive

The admin-warehouses list view MUST render using the existing `Table` primitive (`src/shared/ui/primitives/Table.tsx`), not a new table component.

#### Scenario: Table primitive renders the list

- GIVEN at least one warehouse exists
- WHEN the admin-warehouses list view renders
- THEN it uses `Table` with a labelled scroll region, consistent with existing list screens

### Requirement: Admin route gated to demo-admin

The admin-warehouses route MUST use the same `RequireRole` gate (`demo-admin` only) established in `admin-users`.

#### Scenario: Non-admin sees the 403 mirror

- GIVEN an `operator` or `cost-leader` session
- WHEN navigating to the admin-warehouses route
- THEN the unauthorized message renders and no CRUD mutation fires

### Requirement: Deactivation does not disrupt open attempts

Deactivating a warehouse MUST prevent it from being selectable for new attempts in `BodegasList`, but MUST NOT invalidate, lock, or otherwise alter any attempt already open against that warehouse.

#### Scenario: Deactivated warehouse disappears from new-attempt selection

- GIVEN a warehouse is deactivated
- WHEN an operator opens `BodegasList`
- THEN the deactivated warehouse does not appear as a selectable option

#### Scenario: Open attempt against a deactivated warehouse continues

- GIVEN an operator has an open attempt against warehouse W
- WHEN an admin deactivates W
- THEN the open attempt remains accessible and completable without error
