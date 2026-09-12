import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ScannerTrigger } from './ScannerTrigger'

const here = dirname(fileURLToPath(import.meta.url))

const RESULTS = [{ id: 'SKU-001', title: 'Caja demo', subtitle: 'UN' }]

function Harness({ onManualSubmit }: { onManualSubmit: () => void }) {
  const [open, setOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('')
  return (
    <ScannerTrigger
      triggerLabel="Buscar por código"
      dialogTitle="Buscar línea"
      closeLabel="Cerrar búsqueda"
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      search={{
        label: 'Buscar línea',
        placeholder: 'SKU o nombre',
        inputValue: '',
        onInputChange: vi.fn(),
        results: RESULTS,
        open: true,
        onOpen: vi.fn(),
        onClose: vi.fn(),
        onSelect: vi.fn(),
        resultsLabel: (count) => `${count} resultados`,
        emptyLabel: 'Sin resultados',
        closeLabel: 'Cerrar búsqueda de línea',
      }}
      manualAddLabel="Agregar manualmente"
      manualAddOpen={manualOpen}
      onManualAddOpen={() => setManualOpen(true)}
      manualName={name}
      manualNameLabel="Nombre"
      onManualNameChange={setName}
      manualUnit={unit}
      manualUnitLabel="Unidad"
      onManualUnitChange={setUnit}
      manualSubmitLabel="Agregar línea"
      onManualSubmit={onManualSubmit}
    />
  )
}

describe('ScannerTrigger primitive (F3-PR3)', () => {
  it('opens the barcode/name search dialog from the trigger button', async () => {
    const user = userEvent.setup()
    render(<Harness onManualSubmit={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Buscar por código' }))
    const dialog = await screen.findByRole('dialog', { name: 'Buscar línea' })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Buscar línea' })).toBeInTheDocument()
  })

  it('is keyboard-activatable: Enter on the trigger opens the dialog', async () => {
    const user = userEvent.setup()
    render(<Harness onManualSubmit={vi.fn()} />)
    const trigger = screen.getByRole('button', { name: 'Buscar por código' })
    trigger.focus()
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('dialog', { name: 'Buscar línea' })).toBeInTheDocument()
  })

  it('reveals explicit name + unit fields only after choosing manual add', async () => {
    const user = userEvent.setup()
    render(<Harness onManualSubmit={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Buscar por código' }))
    await screen.findByRole('dialog', { name: 'Buscar línea' })
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Agregar manualmente' }))
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument()
    expect(screen.getByLabelText('Unidad')).toBeInTheDocument()
  })

  it('blocks manual submit until both name and unit are filled, then submits with both', async () => {
    const user = userEvent.setup()
    const onManualSubmit = vi.fn()
    render(<Harness onManualSubmit={onManualSubmit} />)
    await user.click(screen.getByRole('button', { name: 'Buscar por código' }))
    await screen.findByRole('dialog', { name: 'Buscar línea' })
    await user.click(screen.getByRole('button', { name: 'Agregar manualmente' }))
    const submit = screen.getByRole('button', { name: 'Agregar línea' })
    expect(submit).toBeDisabled()
    await user.type(screen.getByLabelText('Nombre'), 'Granel demo')
    expect(submit).toBeDisabled()
    await user.type(screen.getByLabelText('Unidad'), 'KG')
    expect(submit).toBeEnabled()
    await user.click(submit)
    expect(onManualSubmit).toHaveBeenCalledTimes(1)
  })

  it('carries no hardcoded brand hex, font-family, or radius literal in the component source', () => {
    const source = readFileSync(join(here, 'ScannerTrigger.tsx'), 'utf8')
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(source).not.toMatch(/font-family|fontFamily|Manrope|['"]Inter['"]/i)
    expect(source).not.toMatch(/border-?radius\s*[:=]\s*['"]?\d/i)
  })
})
