# Delta for bodegas-list

Phase: F2 (skeleton). Builds on close-loop "Scope starts attempt" (attempt-scoped routing).

## ADDED Requirements

### Requirement: Tenant-scoped scopes catalog

The system MUST list scopes per active company via `tenant-context` (`scope_key`, `display_name`) through `useQuery({ queryKey: ['scopes', companyId] })`, and starting an attempt MUST send `{snapshot_id, warehouse_id, mode}` plus the active `session_id` linkage. Scope DTO fields MUST come from the server; the system MUST NOT invent `code` or theoretical-stock fields.

#### Scenario: Per-company scopes render

- GIVEN company A selected with 2 scopes
- WHEN `/bodegas` resolves
- THEN exactly those 2 scope cards show by `display_name`, keyed by `scope_key`

#### Scenario: Blind-safe scope cards

- GIVEN any scope card render
- WHEN inspected
- THEN no theoretical stock, prior count, or variance value appears
