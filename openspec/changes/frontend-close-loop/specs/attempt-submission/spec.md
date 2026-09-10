# attempt-submission Specification

## Purpose

Idempotent submission of locked attempts with receipts, retry, replacement keys, and offline queue.

## Requirements

### Requirement: Idempotent submit

The system MUST submit locked attempts via `POST submissions` with stable `Idempotency-Key` and no body; same key+payload MUST replay the Receipt without duplicate effects; `NOT_FOUND` lines stay out of the ERP payload.

#### Scenario: SUCCEEDED receipt

- GIVEN a locked attempt
- WHEN operator submits
- THEN `SUCCEEDED` Receipt with `payload_hash` and `erp_reference` shows

#### Scenario: FAILED retry reuses key

- GIVEN a `FAILED` receipt
- WHEN operator retries unchanged
- THEN the same key is reused and the terminal Receipt updates

### Requirement: Conflict recovery

The system MUST block auto-retry on 409 (distinct payload) and REQUIRE the `authorizeReplacementKey` flow for deliberate resubmission.

#### Scenario: 409 replacement

- GIVEN submit returns 409
- WHEN operator confirms replacement
- THEN a new key authorizes and resubmits deliberately

### Requirement: Offline queue

The system MUST persist attempt bodies, queue, and receipts in idb and MUST show an unsynced badge until synced.

#### Scenario: Reload restores queue

- GIVEN queued items offline
- WHEN app reloads
- THEN bodies/queue/receipts restore and the badge marks unsynced
