# Tallycore theme — WCAG 2.2 AA contrast proof

Scope: F3-PR1 (`full-product-real`, spec `visual-shell` → "Light Tallycore theme
tokens"). Ratios computed with the W3C relative-luminance formula (G17/G18), the
same math asserted in `src/app/theme.tokens.test.ts`.

AA target: **≥ 4.5:1** for normal text on its background. WCAG 2.4.13 Focus
Appearance is AAA and explicitly out of scope.

## Token set under test

| AntD token | Value | Note |
|---|---|---|
| `colorPrimary` | `#0B5CD6` | spec value, unchanged |
| `colorPrimaryHover` | `#0045A8` | **new** — darker hover/active shade of primary |
| `colorBgLayout` | `#F0F3FF` | **revised** from `#F4F6F9` — cooler tinted surface (design refresh) |
| `colorBgContainer` | `#FFFFFF` | spec value, unchanged |
| `colorText` | `#1A2332` | spec value, unchanged |
| `colorTextSecondary` | `#5A6B82` | spec value, unchanged |
| `colorBorder` | `#C2C6D6` | **revised** from `#D9E0EA` — more defined separators (non-text) |
| `colorSuccess` | `#1C8449` | **AA nudge** from spec `#1F8A4C` |
| `colorWarning` | `#A86400` | **AA nudge** from spec `#B26A00` |
| `colorError` | `#C0392B` | spec value, unchanged |
| `borderRadius` | `8` | **revised** from `6` — one step rounder |
| `fontFamily` | `Inter, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` | pinned |
| `fontSize` | `14` (scale `12 / 14 / 16 / 20 / 24 / 30`) | spec value |
| `boxShadow` / `boxShadowSecondary` / `boxShadowTertiary` | soft `rgba(19,28,42,*)` shadows | **new** — card/menu/dropdown elevation |

Design-refresh rationale: the shell's sidebar and page background now share
`colorBgLayout` (previously the sider matched the white `colorBgContainer`),
giving the layered surface depth of the reference design direction while
every text/background pair below still proves AA independently.

## Text / background pairs

| Foreground | Background | Ratio | AA (≥4.5:1) |
|---|---|---|---|
| `colorText` `#1A2332` | `colorBgContainer` `#FFFFFF` | 15.78:1 | PASS |
| `colorText` `#1A2332` | `colorBgLayout` `#F0F3FF` | 14.26:1 | PASS |
| `colorTextSecondary` `#5A6B82` | `colorBgContainer` `#FFFFFF` | 5.44:1 | PASS |
| `colorTextSecondary` `#5A6B82` | `colorBgLayout` `#F0F3FF` | 4.91:1 | PASS |
| white `#FFFFFF` | `colorPrimary` `#0B5CD6` | 5.97:1 | PASS |
| white `#FFFFFF` | `colorPrimaryHover` `#0045A8` | 8.69:1 | PASS |
| white `#FFFFFF` | `colorSuccess` `#1C8449` | 4.72:1 | PASS |
| white `#FFFFFF` | `colorWarning` `#A86400` | 4.68:1 | PASS |
| white `#FFFFFF` | `colorError` `#C0392B` | 5.44:1 | PASS |

Every text/background pair clears AA.

## AA nudges (task 4.2)

Two raw spec hex values did not clear 4.5:1 for white text on the solid fill
(used by success/warning buttons, badges, and status pills):

| Token | Spec hex | White-text ratio | Nudged hex | White-text ratio |
|---|---|---|---|---|
| `colorSuccess` | `#1F8A4C` | 4.38:1 (fail) | `#1C8449` | 4.72:1 (pass) |
| `colorWarning` | `#B26A00` | 4.24:1 (fail) | `#A86400` | 4.68:1 (pass) |

The nudge is a minimal single-step darkening of the same hue; it preserves the
green/amber semantics and stays swappable at the `ConfigProvider` layer. Recorded
in `apply-progress.md`.

## Non-text tokens

`colorBorder` `#D9E0EA` is a 1px separator, not text. Per WCAG 1.4.11 it needs
3:1 only against *adjacent* colors when it is the sole means of conveying a
boundary; in this shell borders are always paired with elevation/spacing, so no
AA text rule applies. Not counted in the table above.
