import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Status } from './Status'

const here = dirname(fileURLToPath(import.meta.url))

describe('Status primitive (F3-PR1)', () => {
  it.each([
    ['success', 'Sincronizada'],
    ['warning', 'Pendiente'],
    ['error', 'En conflicto'],
  ] as const)('announces %s state as text plus icon, never color-only', (tone, label) => {
    const { container } = render(<Status tone={tone} label={label} />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(label)
    const icon = container.querySelector('[aria-hidden="true"]')
    expect(icon).not.toBeNull()
  })

  it('resolves icon color through theme text types, with zero hardcoded hex', () => {
    const { container } = render(<Status tone="error" label="En conflicto" />)
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3}\b|#[0-9a-fA-F]{6}\b/)
  })

  it('carries no hardcoded brand hex, font-family, or radius literal in the component source (F3-PR3)', () => {
    const source = readFileSync(join(here, 'Status.tsx'), 'utf8')
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(source).not.toMatch(/font-family|fontFamily|Manrope|['"]Inter['"]/i)
    expect(source).not.toMatch(/border-?radius\s*[:=]\s*['"]?\d/i)
  })
})
