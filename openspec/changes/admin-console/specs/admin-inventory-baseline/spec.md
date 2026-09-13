# Admin Inventory Baseline Specification

## Purpose

New capability, highest structural risk in this change. Depends on (read-only): `OperatorLineView` and the exact-decimal-string discipline it establishes (`src/shared/api/inventory/models.ts`), the `leader-view-is-recount-authoring-only` isolation pattern in `dependency-cruiser.js` (recently corrected to scope `src/features/recount/`), and PRD §4's blind-count guarantee ("no se permite en ICA: stock teórico" — an operator MUST never see theoretical/expected stock). This spec extends that guarantee to a new type; it does not relax it.

## Requirements

### Requirement: Versioned baseline snapshot type

The system MUST define a baseline record per warehouse: `{ id, warehouseId, version, createdAt, lines: BaselineLine[] }` where `BaselineLine = { code: string; name: string; unit: string; expectedQuantity: string }`. `expectedQuantity` MUST be an exact decimal string, following the same discipline as `OperatorLineView.currentQuantity` — never a JS `number`.

#### Scenario: Expected quantity round-trips exactly

- GIVEN a baseline line with `expectedQuantity: "12.500"`
- WHEN the line is persisted and re-read via the mock adapter
- THEN the value is still the string `"12.500"`, with no floating-point coercion or trailing-zero loss

### Requirement: Baseline lives in a structurally isolated module

The baseline type and its port methods MUST live in a dedicated module (its own file, mirroring `leader-models.ts`'s isolation). A new dependency-cruiser rule MUST forbid any `import type` of the baseline module from any path outside that module itself, `src/shared/api/inventory/`, and the new admin-inventory-baseline feature folder. The rule MUST target the actual folder created by this change (not an aspirational path), correcting the class of error found in the existing `leader-view-is-recount-authoring-only` rule.

#### Scenario: Operator-facing import fails the build

- GIVEN a hypothetical change that imports the baseline type from an operator-facing capture module
- WHEN `npm run fsd` runs
- THEN dependency-cruiser reports an error and the check fails

#### Scenario: Allowed imports pass

- GIVEN the baseline module, `src/shared/api/inventory/`, and the admin-inventory-baseline feature folder import the baseline type
- WHEN `npm run fsd` runs
- THEN no error is reported for those imports

### Requirement: Blind-count guarantee extends to the baseline

No operator-facing component, hook, or query MUST ever render, receive as a prop, or hold in state any `expectedQuantity` value or the baseline type itself. This extends the PRD §4 rule that forbids showing theoretical stock to an operator.

#### Scenario: Operator capture screens never reference the baseline

- GIVEN any operator-facing capture or review component
- WHEN its props and rendered output are inspected
- THEN no `expectedQuantity`, baseline id, or baseline version value is present

### Requirement: CSV upload with strict per-row validation

The system MUST support CSV upload (via `papaparse`) to populate a baseline for a warehouse. Before accepting any row, the system MUST validate a minimal schema (`code`, `name`, `unit`, `expectedQuantity` present and non-empty, `expectedQuantity` matching a valid decimal-string pattern). A malformed row MUST produce a clear, row-numbered error and MUST NOT be silently coerced, defaulted, or dropped; a file containing any malformed row MUST NOT partially commit.

#### Scenario: Valid CSV creates a baseline

- GIVEN a CSV with all rows conforming to the schema
- WHEN the admin uploads it for warehouse W
- THEN a new baseline version is created for W with one `BaselineLine` per row

#### Scenario: Malformed row blocks the upload with a clear error

- GIVEN a CSV where row 4 has an empty `unit` and row 7 has a non-decimal `expectedQuantity`
- WHEN the admin uploads it
- THEN the upload is rejected, no baseline version is created, and the errors for rows 4 and 7 are both reported

### Requirement: Baseline uploads are versioned, never overwritten

Uploading or manually entering a new baseline for a warehouse MUST create a new version and MUST retain all previous versions for that warehouse, for audit purposes.

#### Scenario: Second upload creates version 2

- GIVEN warehouse W already has baseline version 1
- WHEN the admin uploads a new valid CSV for W
- THEN version 2 is created and version 1 remains retrievable, unmodified
