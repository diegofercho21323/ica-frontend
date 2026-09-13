# Admin Assignment Specification

## Purpose

New capability. Depends on (read-only): `BodegasList` (`src/features/bodegas/BodegasList.tsx`, currently unfiltered — every session sees every scope) and `InventoryApiPort`/`mockInventoryApi`. Per proposal, this requirement is authored here rather than as a delta on `bodegas-list`, to avoid colliding with the in-flight `full-product-real` change. Out of scope per PRD §22: shift scheduling, time windows, capacity limits, multi-operator-per-warehouse conflict resolution.

## Requirements

### Requirement: Assignment record and port methods

The system MUST define `Assignment: { userId: string; warehouseId: string }` and MUST add `listAssignments()`, `assignWarehouse()`, `unassignWarehouse()` to `InventoryApiPort`. `mockInventoryApi` MUST implement all three fully; the HTTP adapter MUST add them as `disabled()` stubs.

#### Scenario: Admin assigns and unassigns

- GIVEN the mock adapter is active
- WHEN an admin assigns warehouse W to operator U, then unassigns it
- THEN `listAssignments()` reflects the assignment after the first call and its absence after the second

### Requirement: BodegasList filters by assignment for non-admin, non-leader roles

For sessions with role `operator`, `BodegasList` MUST query only the warehouses assigned to that operator's `userId`, instead of all scopes. `demo-admin` and `cost-leader` sessions are unaffected by this filter.

#### Scenario: Operator sees only assigned warehouses

- GIVEN operator U is assigned warehouses W1 and W2 out of three existing warehouses
- WHEN U opens `BodegasList`
- THEN only W1 and W2 render as selectable

#### Scenario: Admin and cost-leader are unaffected

- GIVEN a `demo-admin` or `cost-leader` session with no assignment records
- WHEN opening the equivalent warehouse listing
- THEN the existing unfiltered behavior is preserved (this filter applies to `operator` sessions only)

### Requirement: Zero assignments fails closed to an explicit empty state

An operator with zero assignment records MUST see an explicit empty state in `BodegasList` and MUST NOT see any warehouse, fixture, or fallback list.

#### Scenario: Unassigned operator sees empty state, not all warehouses

- GIVEN operator U has zero assignment records
- WHEN U opens `BodegasList`
- THEN an explicit empty-state message renders and zero warehouse cards are shown

### Requirement: Scope boundary — no scheduling, capacity, or conflict resolution

This capability MUST NOT implement shift scheduling, time windows, capacity limits, or multi-operator-per-warehouse conflict resolution. An assignment is a pure visibility filter: it does not change what `startAttempt(scopeId, mode)` accepts or how it behaves.

#### Scenario: Multiple operators can be assigned the same warehouse without conflict

- GIVEN operators U1 and U2 are both assigned warehouse W
- WHEN both start attempts against W
- THEN both attempts proceed independently with no scheduling or capacity check applied
