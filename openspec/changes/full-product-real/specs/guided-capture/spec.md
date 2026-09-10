# guided-capture Specification

Phase: F3 (skeleton). No existing spec — new domain.

## Purpose

One-line guided assistant plus manual mode: keyboard-first, blind-safe, advisory confirm preserved.

## Requirements

### Requirement: Guided one-line assistant

The system MUST present one `ItemCard` (name + full ERP unit + state + primary action) at a time; saving MUST auto-advance while history stays editable until finalize. The system MUST NOT display theoretical stock, prior counts, or variance anywhere in this flow.

#### Scenario: Save advances, history editable

- GIVEN a guided line saved
- WHEN the save succeeds
- THEN the next pending line presents AND the saved line remains editable via search

#### Scenario: Keyboard-only capture loop

- GIVEN keyboard only
- WHEN the operator uses `Enter` (save/continue), arrows (prev/next), `Ctrl+K` (search), `Esc` (close)
- THEN the full loop completes without pointer AND shortcuts never hijack in-field editing or assistive tech

### Requirement: Manual mode with blind lookup

The system MUST start manual mode empty (scan / `Ctrl+K` / progressive add); pending-identity lookup MUST reveal identities + units only, never values.

#### Scenario: Blind pending lookup

- GIVEN manual mode with pending lines
- WHEN the operator requests pending identities
- THEN names + units list with zero quantities shown
