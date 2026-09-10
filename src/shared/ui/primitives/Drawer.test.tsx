import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Drawer } from './Drawer'

const here = dirname(fileURLToPath(import.meta.url))

function Harness({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir panel
      </button>
      <Drawer
        open={open}
        title="Menú de navegación"
        closeLabel="Cerrar panel"
        onClose={() => {
          onClose()
          setOpen(false)
        }}
      >
        <p>Contenido del panel</p>
      </Drawer>
    </div>
  )
}

describe('Drawer primitive (F3-PR2)', () => {
  it('renders a labelled dialog with content only while open', async () => {
    const user = userEvent.setup()
    render(<Harness onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Abrir panel' }))
    const dialog = await screen.findByRole('dialog', { name: 'Menú de navegación' })
    expect(dialog).toHaveTextContent('Contenido del panel')
  })

  it('is a modal dialog that restores focus to the trigger on close', async () => {
    const user = userEvent.setup()
    render(<Harness onClose={vi.fn()} />)
    const trigger = screen.getByRole('button', { name: 'Abrir panel' })
    trigger.focus()
    await user.click(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Menú de navegación' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    await user.click(screen.getByRole('button', { name: 'Cerrar panel' }))
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Abrir panel' }))
    const dialog = await screen.findByRole('dialog', { name: 'Menú de navegación' })
    fireEvent.keyDown(dialog, { key: 'Escape', keyCode: 27 })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when the scrim is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Abrir panel' }))
    await screen.findByRole('dialog', { name: 'Menú de navegación' })
    const mask = document.querySelector('.ant-drawer-mask')
    expect(mask).not.toBeNull()
    await user.click(mask as Element)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes via the labelled close control', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Abrir panel' }))
    await screen.findByRole('dialog', { name: 'Menú de navegación' })
    await user.click(screen.getByRole('button', { name: 'Cerrar panel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('carries no hardcoded brand hex or radius literal in the component source', () => {
    const source = readFileSync(join(here, 'Drawer.tsx'), 'utf8')
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(source).not.toMatch(/borderRadius\s*[:=]\s*['"]?\d/)
  })
})
