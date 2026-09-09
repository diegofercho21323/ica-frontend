import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { theme } from './theme'
import { tokens } from './tokens'

const here = dirname(fileURLToPath(import.meta.url))
const HEX_RE = /#[0-9a-fA-F]{3}\b|#[0-9a-fA-F]{6}\b/

function readSource(relative: string): string {
  return readFileSync(join(here, relative), 'utf8')
}

/** WCAG relative luminance + contrast ratio (same math as W3C G18). */
function luminance(hex: string): number {
  const c = hex
    .replace('#', '')
    .padEnd(6, hex.length === 4 ? hex[3] : '0')
  const f = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  const [r, g, b] = [0, 2, 4].map((i) => f(parseInt(c.slice(i, i + 2), 16)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function ratio(fg: string, bg: string): number {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}

describe('theme semantic tokens (F3-PR1)', () => {
  it('resolves every shell token through ConfigProvider theme, not literals', () => {
    expect(theme.token?.colorPrimary).toBe(tokens.colorAction)
    expect(theme.token?.colorBgBase).toBe(tokens.colorSurfaceSunken)
    expect(theme.token?.colorBgContainer).toBe(tokens.colorSurface)
    expect(theme.token?.colorTextBase).toBe(tokens.colorTextStrong)
    expect(theme.token?.colorSuccess).toBe(tokens.colorConfirm)
    expect(theme.token?.colorWarning).toBe(tokens.colorAttention)
    expect(theme.token?.colorError).toBe(tokens.colorCritical)
    expect(theme.token?.borderRadius).toBe(tokens.radiusControl)
    expect(theme.token?.fontFamily).toBe(tokens.fontFamilyBase)
  })

  it('carries per-component tokens (Layout shell derives from semantics)', () => {
    expect(theme.components?.Layout?.bodyBg).toBe(tokens.colorSurfaceSunken)
    expect(theme.components?.Layout?.headerBg).toBe(tokens.colorSurface)
  })

  it('hardcodes zero brand hex outside tokens.ts (values pending GAP-1 sign-off)', () => {
    expect(readSource('theme.ts')).not.toMatch(HEX_RE)
    expect(readSource('providers.tsx')).not.toMatch(HEX_RE)
  })

  it.each([
    ['text on surface', tokens.colorTextStrong, tokens.colorSurface, 4.5],
    ['surface on action', tokens.colorSurface, tokens.colorAction, 4.5],
    ['action ink on surface', tokens.colorActionInk, tokens.colorSurface, 4.5],
    ['critical on surface', tokens.colorCritical, tokens.colorSurface, 4.5],
    ['text on attention', tokens.colorTextStrong, tokens.colorAttention, 4.5],
    // Success green is icon-only (WCAG 1.4.11 non-text 3:1); body text stays
    // text-strong. Full AA body-text green awaits brand sign-off (GAP-1).
    ['confirm icon on surface', tokens.colorConfirm, tokens.colorSurface, 3],
  ])('contrast AA: %s is ≥ %s:1', (_label, fg, bg, min) => {
    expect(ratio(fg as string, bg as string)).toBeGreaterThanOrEqual(min as number)
  })
})
