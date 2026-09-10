# Visual-Shell Specification

## Purpose

Datup-inspired light shell: zero header/content overlap, violet theme tokens, visible active nav, structured drawer. Shell-only; KPI content, charts, and 1c-access are out of scope.

## Requirements

### Requirement: Overlap-free responsive layout

The system MUST offset content below the sticky header with safe padding at 390/768/1440 viewports.

#### Scenario: No overlap at breakpoints

- GIVEN viewports 390, 768, and 1440
- WHEN any route renders
- THEN page heading bounding box sits fully below the header
- AND no horizontal overflow occurs

### Requirement: Light Datup theme tokens

The system MUST resolve accent `#6600FF`, light surfaces, ~12px radius, and Manrope-like font from `ThemeConfig`/`tokens.ts`; shell code MUST NOT hardcode brand values.

#### Scenario: Tokens applied

- GIVEN any shell render
- WHEN styles resolve
- THEN active accents, surfaces, radius, and font match ThemeConfig

### Requirement: Visible active-route state

The sidebar icon rail (≥lg) and drawer (<lg) MUST mark the current route with a visible selected state plus `aria-current="page"`.

#### Scenario: Active link exposed

- GIVEN route `/bodegas` active
- WHEN nav renders
- THEN exactly one link carries selected styling and `aria-current="page"`
- AND the state is keyboard-perceivable

### Requirement: Structured drawer preserving behavior

The system MUST keep close-on-navigate with focus return to the menu trigger, and SHOULD structure the drawer with header title, nav hierarchy, and labeled close control (`t()` strings).

#### Scenario: Drawer navigate and focus

- GIVEN the drawer open on <lg
- WHEN a nav link is activated
- THEN the route transitions, the drawer closes, and focus returns to the trigger
- AND header, nav group, and close control render with accessible names
