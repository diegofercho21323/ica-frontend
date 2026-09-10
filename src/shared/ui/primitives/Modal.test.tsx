import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

const here = dirname(fileURLToPath(import.meta.url))

function Harness({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir
      </button>
      <Modal
        open={open}
        title="Confirmar cierre"
        closeLabel="Cerrar diálogo"
        onClose={() => {
          onClose()
          setOpen(false)
        }}
      >
        <p>Contenido del diálogo</p>
      </Modal>
    </div>
  )
}

describe('Modal primitive (F3-PR2)', () => {
  it('renders a titled dialog with an accessible name and content only while open', async () => {
    const user = userEvent.setup()
    render(<Harness onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    const dialog = await screen.findByRole('dialog', { name: 'Confirmar cierre' })
    expect(dialog).toHaveTextContent('Contenido del diálogo')
  })

  it('is a focus-trapping modal dialog that restores focus to the trigger on close', async () => {
    const user = userEvent.setup()
    render(<Harness onClose={vi.fn()} />)
    const trigger = screen.getByRole('button', { name: 'Abrir' })
    trigger.focus()
    await user.click(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Confirmar cierre' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    fireEvent.keyDown(dialog, { key: 'Escape', keyCode: 27 })
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    const dialog = await screen.findByRole('dialog', { name: 'Confirmar cierre' })
    fireEvent.keyDown(dialog, { key: 'Escape', keyCode: 27 })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes via the keyboard-operable labelled close control', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    await screen.findByRole('dialog', { name: 'Confirmar cierre' })
    const close = screen.getByRole('button', { name: 'Cerrar diálogo' })
    close.focus()
    await user.keyboard('{Enter}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('carries no hardcoded brand hex or radius literal in the component source', () => {
    const source = readFileSync(join(here, 'Modal.tsx'), 'utf8')
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(source).not.toMatch(/borderRadius\s*[:=]\s*['"]?\d/)
  })
})
