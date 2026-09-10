# attempt-history Specification

## Purpose

Immutable version list with resubmit.

## Requirements

### Requirement: Immutable versions

The system MUST list versions newest-first with lock and submission state; prior versions MUST stay immutable and never leak prior quantities into capture.

#### Scenario: Versions listed

- GIVEN versions v1 and v2
- WHEN history opens
- THEN both show lock/submission state and v1 is uneditable

### Requirement: Resubmit

The system MUST allow resubmitting a finalized version through the idempotent submission contract.

#### Scenario: Resubmit receipt

- GIVEN a finalized version
- WHEN operator resubmits
- THEN the current Receipt renders without duplicating effects
