# offline-outbox Specification

Phase: F5 (skeleton). No existing spec — new domain.

## Purpose

Durable PWA outbox: versioned `idb-keyval` records replayed in order on reconnect. No multi-user reconciliation (PRD §22 non-goal).

## Requirements

### Requirement: Versioned durable outbox

The system MUST persist each offline mutation as `{attempt_id, body, Idempotency-Key}` under versioned `idb-keyval` keys; on reconnect the outbox MUST replay in original order via TanStack Query `retry` semantics.

#### Scenario: Reload restores pending work

- GIVEN offline captures queued
- WHEN the app reloads
- THEN all records restore and show `pending` until synced

#### Scenario: Ordered replay, 409 stops the line

- GIVEN three queued batches replaying
- WHEN the second returns `409`
- THEN the third is held AND the conflict requires deliberate recovery

### Requirement: Installable PWA shell

The system MUST ship an installable shell (`vite-plugin-pwa`, `generateSW` precache + `registerSW` update prompt) that loads offline for cached routes.

#### Scenario: Offline shell loads

- GIVEN installed PWA without network
- WHEN the operator opens the app
- THEN the shell renders with queued state instead of a network error
