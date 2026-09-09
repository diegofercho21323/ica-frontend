import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SearchInput } from './SearchInput'

const RESULTS = [
  { id: 'SKU-001', title: 'Caja demo', subtitle: 'UN' },
  { id: 'SKU-002', title: 'Granel demo', subtitle: 'KG' },
]

function renderOpen(props?: Partial<Parameters<typeof SearchInput>[0]>) {
  const handlers = {
    onInputChange: vi.fn(),
    onOpen: vi.fn(),
    onClose: vi.fn(),
    onSelect: vi.fn(),
    ...props,
  }
  render(
    <SearchInput
      label="Buscar línea"
      placeholder="SKU o nombre"
      inputValue=""
      results={RESULTS}
      open
      resultsLabel={(count) => `${count} resultados`}
      emptyLabel="Sin resultados"
      closeLabel="Cerrar búsqueda"
      {...handlers}
    />,
  )
  return handlers
}

describe('SearchInput primitive (F3-PR2)', () => {
  it('focuses the input on Ctrl+K without hijacking typed text', async () => {
    const user = userEvent.setup()
    const handlers = renderOpen({ open: false, results: [] })
    const input = screen.getByRole('combobox', { name: 'Buscar línea' })
    expect(input).not.toHaveFocus()
    await user.keyboard('{Control>}k{/Control}')
    expect(input).toHaveFocus()
    await user.type(input, '042')
    expect(handlers.onInputChange).toHaveBeenCalled()
    expect(handlers.onSelect).not.toHaveBeenCalled()
  })

  it('moves the active option with arrows, selects with Enter, closes with Esc', async () => {
    const user = userEvent.setup()
    const handlers = renderOpen()
    const input = screen.getByRole('combobox', { name: 'Buscar línea' })
    input.focus()
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Enter}')
    expect(handlers.onSelect).toHaveBeenCalledWith('SKU-001')
    await user.keyboard('{Escape}')
    expect(handlers.onClose).toHaveBeenCalled()
  })

  it('announces the result count and the empty state via live region', () => {
    renderOpen()
    expect(screen.getByRole('status')).toHaveTextContent('2 resultados')
    expect(screen.getByRole('option', { name: /Granel demo/ })).toBeInTheDocument()
  })

  it('shows the empty label with zero quantities when no results match', () => {
    renderOpen({ results: [] })
    expect(screen.getByText('Sin resultados')).toBeInTheDocument()
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })
})
