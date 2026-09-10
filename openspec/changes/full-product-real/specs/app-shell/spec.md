# Delta for app-shell

Phase: F1 (full for adapter/session; locales skeleton for F3).

## ADDED Requirements

### Requirement: Adapter and session providers

The system MUST provide the selected `InventoryApiPort` (mock default, HTTP flagged) plus the auth session via `app/providers`, keyed by config; pages and features MUST consume these providers and MUST NOT construct adapters themselves.

#### Scenario: Config swap needs no feature edits

- GIVEN features consuming the port from providers
- WHEN `VITE_INVENTORY_ADAPTER` flips mock ↔ http
- THEN zero files under `src/features/` change AND queries resolve against the new adapter

#### Scenario: Session gates visible capabilities

- GIVEN no valid session
- WHEN the shell renders
- THEN protected nav items hide AND the router guards redirect to `/login`

## MODIFIED Requirements

### Requirement: Localized shell strings

The system MUST render user-facing shell strings via `t()`; `es` MUST be complete and new locales MUST merge additively (`supportedLngs` + `addResourceBundle`) without touching existing bundles. Technical units and API state identifiers MUST stay untranslated; only their labels localize.
(Previously: shell strings via t() with es only.)

#### Scenario: Shell strings localized

- GIVEN the es locale
- WHEN the shell renders
- THEN title, nav labels, and drawer title match es.json via t()

#### Scenario: Additive locale

- GIVEN a new locale bundle
- WHEN it is added via `addResourceBundle`
- THEN existing `es` strings render unchanged
