# attempt-review Specification

## Purpose

Review counted/pending lines and finalize the attempt into a locked immutable version.

## Requirements

### Requirement: Review lists

The system MUST list counted lines with values and pending lines with identity+unit only. Completeness MUST expose identities+units, never quantities or ERP data.

#### Scenario: Mixed review renders

- GIVEN an attempt with mixed states
- WHEN operator opens review
- THEN counted show values, pending show identity+unit only

### Requirement: Finalize lock

The system MUST finalize via `POST finalize {confirm_uncounted}`; pending lines without confirm MUST surface 422 in an explicit dialog; locked attempts MUST disable all editing.

#### Scenario: 422 confirm then lock

- GIVEN pending lines exist
- WHEN finalize without confirm returns 422
- THEN a confirm dialog opens; confirming locks immutable with disabled controls
