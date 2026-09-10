# Public-Routes Specification

## Purpose

Placeholder topology for /login, /dashboard, /bodegas, /capture. mock-access (guards/session) is a 1c future and out of scope here.

## Requirements

### Requirement: Placeholder route topology

The system MUST expose index, /login, /dashboard, /bodegas, /capture under AppShell; index MUST render Login.

#### Scenario: Direct navigation renders placeholder

- GIVEN any placeholder path
- WHEN the user navigates directly to it
- THEN AppShell renders with the matching page title
- AND no guard redirects (mock-access deferred)

### Requirement: Localized placeholder copy

Bodegas MUST render t('app.emptyWarehouses'); Capture MUST render t('app.capturePlaceholder') with exact copy.

#### Scenario: Exact placeholder copy

- GIVEN /bodegas or /capture
- WHEN the page renders
- THEN the alert shows "No hay bodegas disponibles para esta demo." or "La captura estará disponible en el siguiente bloque MVP."
- AND the string comes from t(), not hardcoded JSX

### Requirement: Keyboard and link activation with observed transition

Nav links MUST be real links activatable by click, Enter, and Space; tests MUST assert the observed route change.

#### Scenario: Keyboard activation transitions route

- GIVEN focus on a nav link
- WHEN the user presses Enter (or Space) or clicks
- THEN the URL and heading update to the target page
- AND the assertion observes the rendered target, not the href alone
