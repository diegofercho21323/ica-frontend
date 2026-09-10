# product-telemetry Specification

Phase: F5 (skeleton). No existing spec — new domain.

## Purpose

Blind-safe operational telemetry: capture timing, unit-error rate, retry/replay counts. No values, no theoretical data, no PII.

## Requirements

### Requirement: Capture and submission metrics

The system MUST record focus-to-save timing (median/p90 against the <5s aspiration), unit-error counts, and retry/replay counts per attempt.

#### Scenario: Timing recorded per save

- GIVEN a guided save completes
- WHEN timing is logged
- THEN focus-to-save duration joins the attempt aggregate without blocking the UI

#### Scenario: Telemetry stays blind-safe

- GIVEN any telemetry payload
- WHEN inspected
- THEN it contains zero quantities, units-as-identifiers only where needed, and no theoretical stock, prior counts, or variance fields
