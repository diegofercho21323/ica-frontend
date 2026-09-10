# bodegas-list Specification

## Purpose

List inventory scopes on protected `/bodegas` over deterministic mock data. States: loading / items / empty / error. Spanish copy via `t()`. Responsive AntD `List`/`Card`; no `Table` primitive.

## Requirements

### Requirement: Scope items list over mock port

The system MUST render one `List.Item`/`Card` per scope from `mockInventoryApi.listScopes()` via `useQuery({ queryKey: ['scopes'] })`, keyed by `id`, displaying `name`. Fixture shape stays `InventoryScope { id, name }`; the system MUST NOT add optional `code`.

#### Scenario: Populated fixtures render

- GIVEN deterministic scope fixtures (e.g. 3 scopes)
- WHEN `/bodegas` renders with query resolved
- THEN one card per scope shows its `name`
- AND each item key equals its `id`

#### Scenario: No code field

- GIVEN `InventoryScope` contract
- WHEN fixtures are reviewed
- THEN each fixture has only `id` and `name`
- AND no `code` property exists

### Requirement: Loading state

The system MUST set `aria-busy="true"` on the list container while `isPending` and show a loading indicator.

#### Scenario: Pending query

- GIVEN `listScopes()` is pending
- WHEN `/bodegas` renders
- THEN container has `aria-busy="true"`
- AND loading indicator is visible, no items yet

### Requirement: Empty state

The system MUST render `t('app.emptyWarehouses')` when `listScopes()` resolves to `[]` (current mock default).

#### Scenario: Empty mock

- GIVEN `listScopes()` resolves `[]`
- WHEN `/bodegas` renders
- THEN `emptyWarehouses` copy is visible
- AND zero scope cards render

### Requirement: Error state

The system MUST render an AntD `Alert` with `role="alert"` showing `t('app.warehousesError')` when the query fails.

#### Scenario: Query failure

- GIVEN `listScopes()` rejects
- WHEN `/bodegas` renders
- THEN an element with `role="alert"` is visible
- AND its message equals `warehousesError` copy

### Requirement: Spanish copy via t()

The system MUST render all user strings via `t()` with zero hardcoded Spanish/English in JSX. Title reuses `t('app.warehouses')`; empty reuses `t('app.emptyWarehouses')`; new keys `app.warehousesCount` and `app.warehousesError` live under `es.json:app.*`.

#### Scenario: Translated list

- GIVEN Spanish locale
- WHEN `/bodegas` renders with N scopes
- THEN title, count, items, and error (if any) all resolve via `t()`
- AND no hardcoded user string exists in `BodegasList.tsx`

### Requirement: Responsive List/Card, no Table

The system MUST lay out items with AntD `List` (grid) + `Card` inside `Row`/`Col` (`xs=24/sm=12/lg=8` or equivalent), stacking 1-col at 390px with no horizontal overflow. The system MUST NOT create or use a generic `Table` primitive in this change.

#### Scenario: Mobile stacks

- GIVEN 390px viewport with populated scopes
- WHEN `/bodegas` renders
- THEN cards stack vertically with no horizontal overflow

#### Scenario: No Table primitive

- GIVEN change review
- WHEN `shared/ui/primitives/` is inspected
- THEN no new `Table` component exists
- AND `BodegasList.tsx` imports only AntD `List`/`Card`/`Row`/`Col`/`Alert`

### Requirement: Scope boundary

The system MUST NOT include search, filter, sort, pagination, detail view, HTTP adapter enablement, or mock-contract validator in this change.

#### Scenario: Boundary check

- GIVEN this change under review
- WHEN scope is inspected
- THEN no search/detail/HTTP/validator code exists
- AND `http.ts` listScopes path stays disabled
