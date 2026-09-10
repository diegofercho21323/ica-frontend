# Delta for visual-shell

Phase: F3 (Tallycore brand tokens confirmed; GAP-1 resolved).

## RENAMED Requirements

### Requirement: Light Datup theme tokens → Light Tallycore theme tokens

(Reason: Brand owner is confirmed as Ducore and the product as Tallycore; the GAP-1 brand sign-off is resolved with concrete token values.)
(Migration: Update any test names, code comments, or docs referencing "Datup theme tokens" to "Tallycore theme tokens". No behavior change from the rename alone.)

## MODIFIED Requirements

### Requirement: Light Tallycore theme tokens

The system MUST resolve every semantic design token ONLY through AntD 5 `ConfigProvider` `theme.token` and `theme.components`; shell and feature code MUST NOT contain hardcoded hex, font, or radius brand values. The confirmed Tallycore token values are:

| Semantic token | AntD 5 token | Value |
|---|---|---|
| action primary | `colorPrimary` | `#0B5CD6` |
| background | `colorBgLayout` | `#F4F6F9` |
| surface | `colorBgContainer` | `#FFFFFF` |
| text | `colorText` | `#1A2332` |
| text secondary | `colorTextSecondary` | `#5A6B82` |
| border | `colorBorder` | `#D9E0EA` |
| success | `colorSuccess` | `#1F8A4C` |
| warning | `colorWarning` | `#B26A00` |
| error | `colorError` | `#C0392B` |
| focus ring | outline | `2px solid #0B5CD6`, offset `2px` |
| radius | `borderRadius` | `6` |
| font family | `fontFamily` | system stack with `Inter` fallback |
| font scale | `fontSize` | base `14`; scale `12 / 14 / 16 / 20 / 24 / 30` |

The theming PR MUST include a contrast table proving WCAG 2.2 AA (≥4.5:1) for every text/background token pair. Status MUST always be conveyed by text plus icon, never by color alone. Visible keyboard focus MUST NOT be obscured by other content. Pointer and touch targets MUST measure at least 24×24 CSS px. WCAG 2.4.13 Focus Appearance MUST NOT be cited as an AA requirement (it is AAA). Token values MAY be swapped later at the `ConfigProvider` layer without shell or feature code changes.
(Previously: token values were gated on brand sign-off GAP-1; shell "MUST NOT invent Colsubsidio hex/logo/font".)

#### Scenario: Tokens applied

- GIVEN any shell or feature render
- WHEN styles resolve
- THEN accents, surfaces, border, radius, and font derive from the AntD `ConfigProvider` token set
- AND no hardcoded brand hex, font, or radius value exists in shell or feature code

#### Scenario: AA contrast proven

- GIVEN the confirmed Tallycore token set
- WHEN the theming PR is reviewed
- THEN a contrast table shows ≥4.5:1 for every text/background pair (AA only; 2.4.13 is AAA and out of scope)

#### Scenario: Status not color-only

- GIVEN a success, warning, or error status indicator in the shell
- WHEN it renders
- THEN it presents a text label and an icon, with color as a secondary signal only

#### Scenario: Focus visible and targets sized

- GIVEN keyboard navigation across shell controls
- WHEN a control receives focus
- THEN a `2px` `#0B5CD6` focus ring with `2px` offset is visible and not obscured by other content
- AND every pointer target measures at least 24×24 CSS px
