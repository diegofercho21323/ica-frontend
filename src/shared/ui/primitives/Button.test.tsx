import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

const here = dirname(fileURLToPath(import.meta.url))

describe('Button primitive (F3-PR1)', () => {
  it('renders an accessible button with minimum 24px target', () => {
    render(<Button onClick={() => {}}>Guardar</Button>)
    const button = screen.getByRole('button', { name: 'Guardar' })
    expect(button).toBeInTheDocument()
    expect(button.className).toMatch(/min-h-6/)
  })

  it('fires onClick by pointer and keyboard', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<Button onClick={onClick}>Guardar</Button>)
    const button = screen.getByRole('button', { name: 'Guardar' })
    await user.click(button)
    button.focus()
    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it('supports icon-only buttons via aria-label and blocks pointer when disabled', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(
      <Button onClick={onClick} aria-label="Cerrar" disabled>
        ✕
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Cerrar' })
    expect(button).toBeDisabled()
    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('announces busy state while saving', () => {
    render(
      <Button onClick={() => {}} loading loadingLabel="Guardando…">
        Guardar
      </Button>,
    )
    const button = screen.getByRole('button', { name: /guardando/i })
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('carries no hardcoded brand hex, font-family, or radius literal in the component source (F3-PR3)', () => {
    const source = readFileSync(join(here, 'Button.tsx'), 'utf8')
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(source).not.toMatch(/font-family|fontFamily|Manrope|['"]Inter['"]/i)
    expect(source).not.toMatch(/border-?radius\s*[:=]\s*['"]?\d/i)
  })
})
