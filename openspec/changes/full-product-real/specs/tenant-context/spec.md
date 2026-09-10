# tenant-context Specification

Phase: F2 (skeleton). No existing spec — new domain.

## Purpose

Multi-tenant scope: company → scopes → snapshots, with `session_id` linking start → history → recount.

## Requirements

### Requirement: Tenant-scoped catalog

The system MUST resolve scopes per selected company (`snapshot_id`, `warehouse_id`, `scope_key`, `display_name`) and MUST NOT show other companies' scopes. Until read endpoints land (PRD §23), reads stay mock-backed and clearly labeled.

#### Scenario: Company switch filters scopes

- GIVEN two companies with distinct scopes
- WHEN the operator switches company
- THEN only that company's scopes list, keyed by `scope_key`

#### Scenario: session_id links the loop

- GIVEN `POST /sessions` returns `session_id`
- WHEN history or recount opens
- THEN it queries by that `session_id`, never by bare `attempt_id` inference
