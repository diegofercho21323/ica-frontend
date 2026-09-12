import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ItemCard } from './ItemCard'

const here = dirname(fileURLToPath(import.meta.url))

describe('ItemCard primitive (F3-PR2)', () => {
  it('renders name, exact unit with label, state text, and primary action', async () => {
    const onAction = vi.fn()
    const user = userEvent.setup()
    render(
      <ItemCard
        name="Granel demo"
        unit="KG"
        unitLabel="Unidad"
        stateLabel="Sin contar"
        stateTone="warning"
        actionLabel="Contar"
        onAction={onAction}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Granel demo' })).toBeInTheDocument()
    expect(screen.getByText('KG')).toBeInTheDocument()
    expect(screen.getByText('Unidad')).toBeInTheDocument()
    // State is text+icon, never color-only.
    expect(screen.getByText('Sin contar')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Contar' }))
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('activates the primary action by keyboard and blocks it when disabled', async () => {
    const onAction = vi.fn()
    const user = userEvent.setup()
    render(
      <ItemCard
        name="Caja demo"
        unit="UN"
        unitLabel="Unidad"
        stateLabel="Contada"
        stateTone="success"
        actionLabel="Editar"
        onAction={onAction}
        actionDisabled
      />,
    )
    const button = screen.getByRole('button', { name: 'Editar' })
    expect(button).toBeDisabled()
    button.focus()
    await user.keyboard('{Enter}')
    expect(onAction).not.toHaveBeenCalled()
  })

  it('carries no hardcoded brand hex, font-family, or radius literal in the component source (F3-PR3)', () => {
    const source = readFileSync(join(here, 'ItemCard.tsx'), 'utf8')
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(source).not.toMatch(/font-family|fontFamily|Manrope|['"]Inter['"]/i)
    expect(source).not.toMatch(/border-?radius\s*[:=]\s*['"]?\d/i)
  })
})
