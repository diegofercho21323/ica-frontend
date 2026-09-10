# Dashboard KPIs Specification

## Purpose

KPI cards on the dashboard showing count progress derived from `getOperatorLines`.

## Requirements

### Requirement: KPI values derived from operator lines

The system SHALL derive 4 KPIs from `getOperatorLines` via selectors: total SKUs, contadas, pendientes, avance %.

#### Scenario: Correct values from 5-line fixture

- GIVEN 5 deterministic SKU lines (3 contadas, 2 pendientes)
- WHEN the dashboard renders
- THEN 4 cards show total "5", contadas "3", pendientes "2", avance "60"

#### Scenario: Selectors recompute on data change

- GIVEN lines update (a pendiente becomes contada)
- WHEN selectors rerun
- THEN contadas increments, pendientes decrements, avance % updates

### Requirement: KpiCard visual contract

The system SHALL render each KPI via shared KpiCard (AntD Card+Statistic) with label, value, and unit; Datup-like styling; no business logic inside.

#### Scenario: Card structure

- GIVEN a KPI value
- WHEN KpiCard renders
- THEN it shows label, value, unit with Statistic formatting

#### Scenario: No business logic in primitive

- GIVEN KpiCard props
- WHEN reviewed
- THEN it contains no selector or fetch calls, only presentational props

### Requirement: Responsive KPI grid

The system SHALL lay out cards in a responsive grid 1→2→4 columns using Tailwind breakpoints; 390px viewport stacks 1-col with no horizontal overflow.

#### Scenario: Desktop 4-column layout

- GIVEN viewport ≥1024px
- WHEN dashboard renders
- THEN 4 cards display in one row

#### Scenario: Mobile 390px stacks

- GIVEN 390px viewport
- WHEN dashboard renders
- THEN cards stack vertically with no horizontal overflow

### Requirement: Exact-decimal strings

The system SHALL represent counts and avance % as exact-decimal strings and MUST NOT coerce through float arithmetic.

#### Scenario: Avance precision

- GIVEN 3 of 5 counted
- WHEN avance computes
- THEN value is exact-decimal string "60", never float-rounded

### Requirement: Spanish copy via t()

The system SHALL render all KPI labels/units in Spanish via `t()` and SHALL replace dashboardPlaceholder copy; smoke asserts target new content.

#### Scenario: Spanish labels

- GIVEN Spanish locale
- WHEN dashboard renders
- THEN labels read via `t()` keys (total, contadas, pendientes, avance)

#### Scenario: Placeholder replaced

- GIVEN dashboard route
- WHEN rendered
- THEN no dashboardPlaceholder copy remains
