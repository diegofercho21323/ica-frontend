# Proposal: Admin Console — Users, Warehouses, Inventory Baseline, Assignment

## Intent

`demo-admin` authenticates but owns zero surface: no route, screen, or port method. Warehouses are 3 fixtures, users are a free-text `assignee` string, every operator sees every warehouse, and nothing records what a warehouse *should* hold. Give the admin role a real console — mock-first, four additive slices.

## Scope

### In Scope
- `demo-admin`-gated admin routes — first production wiring of `RequireRole`
- User CRUD (`AdminUser`: `id, displayName, role, active`)
- Warehouse CRUD on `InventoryScope`/`TenantScope` (+ `active`, `companyId`), reusing `Table`
- Versioned per-warehouse baseline: manual entry, CSV upload (`papaparse`), API stub
- Dependency-cruiser rule making the baseline unimportable from operator code
- `{userId, warehouseId}` assignments; `BodegasList` shows only assigned warehouses (zero → empty state, fail closed)
- New `InventoryApiPort` methods: full in `mockInventoryApi`, `disabled()` in `http.ts`

### Out of Scope
- Full scheduling/shift/capacity planner (PRD §22 non-goal)
- Excel/`.xlsx` (`xlsx`, `exceljs`) — CSV only for v1
- Real backend integration; edits to `openspec/changes/full-product-real/`

## PRD Alignment

Extends §22 narrowly (pre-assignment, never a planner). Closes §23's open `assignee` catalog decision as a deliberate side effect. Baseline stays admin-only and structurally isolated, preserving §4's operator blind-count guarantee.

## Capabilities

### New Capabilities
- `admin-users`: `AdminUser` CRUD + role assignment, route-gated to `demo-admin`
- `admin-warehouses`: warehouse CRUD/deactivate with company scoping
- `admin-inventory-baseline`: versioned expected-stock snapshot, CSV ingest, enforced operator isolation
- `admin-assignment`: user↔warehouse links and the filtered operator read path

### Modified Capabilities
- None. The `BodegasList` filter requirement is authored inside `admin-assignment`, so no delta lands on `bodegas-list`, `access`, or `tenant-context` while `full-product-real` is mid-flight.

## Approach

Four independent slices, each ≤400 lines: port method + mock + `disabled()` stub + screen + tests. Order: users → warehouses → baseline → assignment (assignment depends on the first two). Baseline lives in its own module guarded by a dependency-cruiser rule written against the folder it actually creates.

## Affected Areas

| Area | Impact | Change |
|------|--------|--------|
| `shared/api/inventory/{models,port,mock,fixtures}.ts` | Modified | Admin types + methods |
| `shared/api/inventory/http.ts` | Modified | `disabled()` stubs |
| `app/router.tsx`, `features/access/RequireRole.tsx` | Modified | Role-gated routes |
| `src/features/admin/*` | New | Four slices |
| `features/bodegas/BodegasList.tsx` | Modified | Assignment filter |
| `dependency-cruiser.js`, `package.json` | Modified | Isolation rule; `papaparse` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Baseline leaks to operator UI | Med | Depcruise rule + failing test first |
| `RequireRole` unproven in routing | Med | Slice 1 wires and tests it |
| `full-product-real` collision | Med | No shared spec deltas |
| `papaparse` bundle/license | Low | MIT, ~40KB; vetted in design |
| CSV insufficient | Low | `.xlsx` deferred |

## Rollback Plan

Every slice is additive and mock-only. Disable = delete route + nav entry; port methods go unreferenced, HTTP stays `disabled()`. No migration risk — nothing alters the operator-facing contract except the `BodegasList` filter, reverted by removing it. Each slice is an independently revertible PR.

## Dependencies

- `papaparse` (new, MIT)
- Existing but unwired: `RequireRole`, dependency-cruiser isolation pattern
- Read-only: `tenant-context`, `access`, `bodegas-list` (owned by `full-product-real`)

## Success Criteria

- [ ] Non-`demo-admin` sessions cannot reach any admin route
- [ ] Admin creates/edits/deactivates users and warehouses against the mock
- [ ] CSV upload yields a versioned baseline; `npm run fsd` fails on operator import
- [ ] Operator sees only assigned warehouses; zero assignments → empty state
- [ ] `lint`, `typecheck`, `test:run`, `fsd` pass
