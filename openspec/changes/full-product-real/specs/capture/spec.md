# Delta for capture

Phase: F3 (skeleton). Builds on close-loop attempt-scoped blind table.

## ADDED Requirements

### Requirement: Contract-exact ChangeInput

Each batch change MUST send `ChangeInput` with `unit` exactly equal to the authoritative line unit, `capture_method` (`keyboard`/`stepper`/`voice-demo`/`barcode`/`manual`), and `confirm_unusual_quantity: true` re-sending the identical exact-string quantity when an advisory `422 UNUSUAL_QUANTITY` is confirmed. Confirmation MUST never round or clamp the quantity.

#### Scenario: Advisory confirm resends identical string

- GIVEN `soft_limit_quantity` exceeded and advisory `422` received
- WHEN the operator confirms
- THEN the retry sends the same exact string with `confirm_unusual_quantity: true`

#### Scenario: Unit mismatch rejected client-side

- GIVEN a line with authoritative unit `KG`
- WHEN a change carries any other `unit`
- THEN it is blocked inline via `t()` AND excluded from the batch

#### Scenario: Unsafe-precision string survives end to end

- GIVEN quantity `9007199254740993.000001`
- WHEN saved through the port
- THEN the adapter body carries it verbatim with no float coercion
