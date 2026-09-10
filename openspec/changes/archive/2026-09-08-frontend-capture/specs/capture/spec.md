# Capture Specification

## Purpose

Blind-count recording on `/capture`: operators enter quantities per operator line and batch-save them. Out of scope: autosave, search/filter/pagination, real HTTP.

## Requirements

### Requirement: Blind capture table

The system MUST render one row per operator line with SKU, description, quantity input, state select, and a single batch save action. The system MUST NOT display `currentQuantity` for rows in `NOT_COUNTED` state.

#### Scenario: Table renders operator lines blind

- GIVEN loaded operator lines
- WHEN the operator opens `/capture`
- THEN each line shows SKU, description, empty quantity input, and state select defaulting to `NOT_COUNTED`

#### Scenario: System quantity stays hidden until counted

- GIVEN a row in `NOT_COUNTED` state
- WHEN the table renders
- THEN `currentQuantity` is hidden for that row and shown only after state leaves `NOT_COUNTED`

### Requirement: Exact-decimal quantity input

The system MUST accept quantities as strings validated by regex (`^[0-9]+(\.[0-9]{1,6})?$`), MUST preserve them verbatim (`10.10` stays `10.10`), and MUST NOT use `type=number`, `Number()`, or `parseFloat` anywhere in the quantity path. Inputs MUST use `inputMode="decimal"`.

#### Scenario: Valid decimal string accepted verbatim

- GIVEN a row quantity input
- WHEN the operator types `10.10`
- THEN the value is stored and sent as the exact string `10.10`

#### Scenario: Unsafe-precision value survives

- GIVEN a row quantity input
- WHEN the operator types `9007199254740993.000001`
- THEN the value is stored and sent verbatim with no float coercion

#### Scenario: Invalid input rejected inline

- GIVEN a row quantity input
- WHEN the operator types `12.3456789` or `abc`
- THEN an inline error appears via `t()` and the row is excluded from the batch until fixed

### Requirement: Row state semantics

The system MUST offer `COUNTED` / `COUNTED_ZERO` / `NOT_FOUND` / `NOT_COUNTED` per row. `COUNTED_ZERO` MUST send quantity `'0'`; `NOT_FOUND` MUST send quantity `null`.

#### Scenario: Counted-zero sends zero string

- GIVEN a row set to `COUNTED_ZERO`
- WHEN the batch is saved
- THEN its payload quantity is the string `'0'`

#### Scenario: Not-found sends null

- GIVEN a row set to `NOT_FOUND`
- WHEN the batch is saved
- THEN its payload quantity is `null`

### Requirement: Idempotent batch save

The system MUST save dirty rows via `saveBatch` with exactly one idempotency key per batch minted from `shared/lib/idempotency`, and retry of the same batch MUST reuse that key. Only dirty, valid rows SHALL be included.

#### Scenario: One key per batch

- GIVEN two dirty rows
- WHEN the operator saves
- THEN `saveBatch` is called once with both rows and a single key

#### Scenario: Retry reuses key

- GIVEN a failed batch with key `k`
- WHEN the operator retries without edits
- THEN `saveBatch` is called again with key `k`

### Requirement: Async save states

The system MUST show loading (`aria-busy`, disabled save), error (retryable message), and success (confirmation + form reset of dirty flags) states for the batch save.

#### Scenario: Save lifecycle

- GIVEN a pending batch save
- WHEN it succeeds
- THEN a success message shows and saved rows are no longer dirty

#### Scenario: Save failure is retryable

- GIVEN a failed batch save
- WHEN the error renders
- THEN an error message with a retry action shows and the batch payload is preserved

### Requirement: Spanish copy and labels

All user-facing strings MUST come from `t()` with `es.json` keys, and every input/select MUST have an associated label. Icon-only controls MUST have `aria-label`.

#### Scenario: Spanish copy renders

- GIVEN locale `es`
- WHEN the capture page renders
- THEN labels, errors, and save states display Spanish `t()` copy with no hardcoded English

### Requirement: Responsive AntD layout

The system MUST build the table and form with AntD primitives directly (no custom table primitive) and MUST remain usable at mobile widths via horizontal scroll or stacked cards using Tailwind breakpoints.

#### Scenario: Mobile layout holds

- GIVEN a viewport under `sm`
- WHEN the capture table renders
- THEN rows remain reachable without overlap via scroll or card layout
