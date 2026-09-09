import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

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
})
