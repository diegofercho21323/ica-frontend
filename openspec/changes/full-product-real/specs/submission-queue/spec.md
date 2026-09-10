# submission-queue Specification

Phase: F4 (skeleton). No existing spec — new domain.

## Purpose

Visible submit/retry/replay/conflict queue over the idempotent submission contract. Builds on close-loop `attempt-submission` (receipts, replacement keys).

## Requirements

### Requirement: Explicit queue states

The system MUST show each submission as `synced` / `pending` / `conflict` with text + icon (never color-only); retry of the same payload MUST reuse its `Idempotency-Key`.

#### Scenario: Failed retry reuses key

- GIVEN a `FAILED` receipt with key `k`
- WHEN the operator retries unchanged
- THEN the request reuses `k` and the terminal receipt updates

#### Scenario: 409 never auto-resolves

- GIVEN submit returns `409` (distinct payload)
- WHEN the queue processes it
- THEN auto-retry is blocked AND deliberate recovery (replacement-key flow) is required

#### Scenario: Locked attempts never edited

- GIVEN the server reports an attempt locked
- WHEN the queue or operator acts
- THEN no edit or offline mutation of that attempt is permitted
