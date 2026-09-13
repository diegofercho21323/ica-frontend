/**
 * Tallycore brand tokens — confirmed values (visual-shell spec, GAP-1 resolved).
 *
 * This module is the ONLY place brand hex, font, and radius literals may live.
 * Shell and feature code MUST resolve them through the AntD 5 `ConfigProvider`
 * in `theme.ts`; values stay swappable at that layer with no consumer changes.
 *
 * WCAG 2.2 AA contrast proof: `src/app/theme/contrast-table.md`.
 * `colorSuccess` / `colorWarning` carry a minimal darkening away from the raw
 * spec hex (`#1F8A4C` / `#B26A00`) so white-on-surface text clears 4.5:1.
 *
 * `colorBgLayout` / `colorBorder` / `borderRadius` were revised for the
 * design-direction refresh (cooler tinted surfaces for depth, one radius
 * step rounder); `colorPrimaryHover` and the `boxShadow*` elevation tokens
 * are new. Every value keeps its AA proof in `contrast-table.md`.
 */
export const tokens = {
  colorPrimary: '#0B5CD6',
  colorPrimaryHover: '#0045A8',
  colorBgLayout: '#F0F3FF',
  colorBgContainer: '#FFFFFF',
  colorText: '#1A2332',
  colorTextSecondary: '#5A6B82',
  colorBorder: '#C2C6D6',
  colorSuccess: '#1C8449',
  colorWarning: '#A86400',
  colorError: '#C0392B',
  borderRadius: 8,
  fontFamily:
    "Inter, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  fontSize: 14,
  boxShadow: '0 1px 2px rgba(19, 28, 42, 0.06)',
  boxShadowSecondary: '0 2px 8px rgba(19, 28, 42, 0.10)',
  boxShadowTertiary: '0 1px 3px rgba(19, 28, 42, 0.08)',
} as const
