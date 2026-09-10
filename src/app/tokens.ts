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
 */
export const tokens = {
  colorPrimary: '#0B5CD6',
  colorBgLayout: '#F4F6F9',
  colorBgContainer: '#FFFFFF',
  colorText: '#1A2332',
  colorTextSecondary: '#5A6B82',
  colorBorder: '#D9E0EA',
  colorSuccess: '#1C8449',
  colorWarning: '#A86400',
  colorError: '#C0392B',
  borderRadius: 6,
  fontFamily:
    "Inter, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  fontSize: 14,
} as const
