# App-Shell Specification

## Purpose

V2 operator shell: landmarks, responsive nav, theme tokens, localized strings. Remediation scope only (1b).

## Requirements

### Requirement: Shell landmarks

The system MUST render header, nav, and main landmarks with semantic elements.

#### Scenario: Landmarks present

- GIVEN the app at any route
- WHEN assistive tech queries landmarks
- THEN header, nav, and main/content landmarks exist
- AND each nav link exposes an accessible name via t()

### Requirement: Responsive drawer behavior

The system MUST collapse nav into a drawer below lg and MUST close it on link activation with focus restoration.

#### Scenario: Drawer closes on link activation

- GIVEN the drawer open on a <lg viewport
- WHEN the user activates a nav link (click, Enter, or Space)
- THEN the route transitions to the link target
- AND the drawer closes and focus returns to the menu trigger

#### Scenario: Desktop nav stays visible

- GIVEN a >=lg viewport
- WHEN the user activates a sidebar nav link
- THEN the route transitions without drawer state change

### Requirement: Theme tokens

The system SHALL centralize visual tokens in AntD ThemeConfig; components MUST NOT hardcode brand values.

#### Scenario: Tokens centralized

- GIVEN any shell or placeholder render
- WHEN styles resolve
- THEN colors and spacing derive from the shared ThemeConfig

### Requirement: Localized shell strings

The system MUST render user-facing shell strings via t(); it MUST NOT hardcode copy in JSX.

#### Scenario: Shell strings localized

- GIVEN the es locale
- WHEN the shell renders
- THEN title, nav labels, and drawer title match es.json via t()
