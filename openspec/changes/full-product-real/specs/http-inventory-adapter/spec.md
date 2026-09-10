# http-inventory-adapter Specification

Phase: F1 (full). No existing spec — new domain.

## Purpose

Config-swappable `InventoryApiPort` binding: mock default, HTTP progressive. Features consume the port only.

## Requirements

### Requirement: Config-driven adapter selection

The system MUST resolve `InventoryApiPort` in `app/` from config (`VITE_INVENTORY_ADAPTER=mock|http`, default `mock`). Features MUST NOT import `mock.ts` or Axios directly.

#### Scenario: Mock default resolves

- GIVEN no adapter config set
- WHEN the app boots
- THEN the port resolves to `MockInventoryApiAdapter` with zero network calls

#### Scenario: HTTP adapter flagged on

- GIVEN `VITE_INVENTORY_ADAPTER=http` plus base URL configured
- WHEN the app boots
- THEN the port resolves to `HttpInventoryApiAdapter` against `/api/{SERVICE}/ica-inventory`

#### Scenario: No direct backend imports in features

- GIVEN a static import audit of `src/features/`
- WHEN imports are inspected
- THEN no file imports `shared/api/inventory/mock`, `shared/api/inventory/http`, or `axios`

### Requirement: HTTP contract parity (App. A)

The HTTP adapter MUST send PRD App. A DTOs verbatim: `GUIDED`/`MANUAL` uppercase, `ChangeInput` with exact-string `quantity`, exact `unit`, `capture_method`, `confirm_unusual_quantity`; `Idempotency-Key` header on batch and submissions; error codes `400/401/403/404/409/422` mapped to typed `HttpError`.

#### Scenario: Batch sends exact strings with key

- GIVEN a batch with quantity `10.10`
- WHEN `saveBatch` runs via HTTP
- THEN the body carries `"10.10"` verbatim plus one `Idempotency-Key` header

#### Scenario: 409 maps typed, never auto-retries

- GIVEN the server returns `409` (locked or same-key-different-body)
- WHEN the adapter surfaces it
- THEN callers receive typed `HttpError{status:409}` AND no automatic retry fires

### Requirement: Mock stays as regression harness

The mock adapter MUST remain selectable by config and deterministic across reloads of the same seed.

#### Scenario: Mock regression run

- GIVEN `VITE_INVENTORY_ADAPTER=mock`
- WHEN contract tests run
- THEN all port-conformance cases pass with no network dependency
