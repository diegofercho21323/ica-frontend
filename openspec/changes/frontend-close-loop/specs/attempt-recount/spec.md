# attempt-recount Specification

## Purpose

Leader-directed blind recount subset as version 2+.

## Requirements

### Requirement: Directed selection

The system MUST require a non-empty line selection plus assignee on the leader-only route; non-leaders MUST receive 403.

#### Scenario: Valid selection creates v2

- GIVEN a finalized version and leader role
- WHEN leader selects >=1 lines plus assignee
- THEN a v2+ attempt is created with that subset only

#### Scenario: Empty selection denied

- GIVEN zero lines selected
- WHEN leader submits
- THEN a 400 inline error shows and no attempt is created

### Requirement: Blind subset

The system MUST start v2+ with identities+units only and zero prior quantities, reusing capture, review, and finalize rules.

#### Scenario: Blind start

- GIVEN a created v2+
- WHEN assignee opens capture
- THEN lines show identity+unit with empty quantities
