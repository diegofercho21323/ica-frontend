import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { theme } from '../src/app/theme'
import { tokens } from '../src/app/tokens'

const SHELL_SOURCES = [
  'src/shared/ui/layout/AppShell.tsx',
  'src/pages/screens.tsx',
  'src/app/theme.ts',
  'src/app/providers.tsx',
]
const HEX = /#[0-9A-Fa-f]{3,8}\b/g

describe('Tallycore theme tokens derive from tokens.ts', () => {
  it('maps every AntD semantic token to the shared Tallycore tokens', () => {
    const seed = theme.token ?? {}
    expect(seed.colorPrimary).toBe(tokens.colorPrimary)
    expect(seed.colorBgLayout).toBe(tokens.colorBgLayout)
    expect(seed.colorBgContainer).toBe(tokens.colorBgContainer)
    expect(seed.colorText).toBe(tokens.colorText)
    expect(seed.colorTextSecondary).toBe(tokens.colorTextSecondary)
    expect(seed.colorBorder).toBe(tokens.colorBorder)
    expect(seed.colorSuccess).toBe(tokens.colorSuccess)
    expect(seed.colorWarning).toBe(tokens.colorWarning)
    expect(seed.colorError).toBe(tokens.colorError)
    expect(seed.borderRadius).toBe(tokens.borderRadius)
    expect(seed.fontFamily).toBe(tokens.fontFamily)
    expect(seed.fontSize).toBe(tokens.fontSize)
  })

  it('consumes every token and keeps brand hex out of shell sources', () => {
    const consumed = new Set<unknown>(Object.values(theme.token ?? {}))
    for (const [name, value] of Object.entries(tokens)) {
      expect(
        consumed.has(value),
        `${name} is not consumed by ThemeConfig`,
      ).toBe(true)
    }
    expect(SHELL_SOURCES.length).toBeGreaterThan(0)
    for (const file of SHELL_SOURCES) {
      const source = readFileSync(file, 'utf8')
      expect(source.match(HEX) ?? [], `${file} hardcodes a brand hex`).toEqual(
        [],
      )
    }
    expect(readFileSync('src/app/theme.ts', 'utf8')).toContain('tokens.')
    // Guard the guard: the scanner must find hex where hex exists.
    expect(
      readFileSync('src/app/tokens.ts', 'utf8').match(HEX)?.length ?? 0,
    ).toBeGreaterThan(0)
  })
})
