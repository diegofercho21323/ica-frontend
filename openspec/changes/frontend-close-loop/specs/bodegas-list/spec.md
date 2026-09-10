# Delta for bodegas-list

## ADDED Requirements

### Requirement: Scope starts attempt

The system MUST start an attempt via `POST /sessions` with `{snapshot_id, warehouse_id, mode: 'GUIDED'|'MANUAL'}` and route to `/capture/:attemptId`. Errors MUST render via `t()` with no navigation.

#### Scenario: GUIDED start routes to capture

- GIVEN a scope card
- WHEN operator chooses GUIDED and confirms
- THEN attempt starts and router navigates to `/capture/:attemptId`

#### Scenario: Failed start stays put

- GIVEN a scope card
- WHEN start returns 400|404
- THEN an actionable `t()` error shows and no navigation occurs
