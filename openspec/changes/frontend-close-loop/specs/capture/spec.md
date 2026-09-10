# Delta for capture

## MODIFIED Requirements

### Requirement: Blind capture table

The system MUST render one attempt-scoped row per operator line at `/capture/:attemptId` with SKU, description, quantity input, state select, and a single batch save action. The system MUST NOT display `currentQuantity` for rows in `NOT_COUNTED` state.

(Previously: fixed `/capture` route with hardcoded attempt id.)

#### Scenario: Table renders operator lines blind

- GIVEN loaded lines for `:attemptId`
- WHEN the operator opens `/capture/:attemptId`
- THEN each line shows SKU, description, empty quantity input, state select `NOT_COUNTED`

#### Scenario: System quantity stays hidden until counted

- GIVEN a row in `NOT_COUNTED` state
- WHEN the table renders
- THEN `currentQuantity` is hidden for that row and shown only after state leaves `NOT_COUNTED`
