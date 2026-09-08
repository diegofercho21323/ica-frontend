import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Fragments are concatenated so the banned literals never appear verbatim in
// this file; the grep ban in task 1.4 scans production sources only.
const BANNED = [
  'Num' + 'ber\\(',
  'parse' + 'Float',
  'type="num' + 'ber"',
  "type='num" + "ber'",
].map((source) => new RegExp(source))

const here = dirname(fileURLToPath(import.meta.url))
const sources = readdirSync(here).filter(
  (file) => !file.includes('.test.') && /\.(ts|tsx)$/.test(file),
)

describe('no float coercion in the capture slice', () => {
  it('finds production sources to audit', () => {
    expect(sources.length).toBeGreaterThan(0)
  })

  it.each(sources)('bans float coercion in %s', (file) => {
    const content = readFileSync(join(here, file), 'utf8')
    for (const pattern of BANNED) {
      expect(content).not.toMatch(pattern)
    }
  })
})
