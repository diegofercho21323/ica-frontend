import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { describe, expect, it } from 'vitest'
import { HttpError } from '../../../shared/api/inventory/errors'
import { InventoryApiProvider } from '../../../shared/api/inventory/api-context'
import type { InventoryApiPort } from '../../../shared/api/inventory/port'
import { mockInventoryApi } from '../../../shared/api/inventory/mock'
import type { RowState } from '../validation'
import { ManualCapture, type ManualCaptureStrings } from './ManualCapture'

const STRINGS: ManualCaptureStrings = {
  emptyLabel: 'Escanee o busque una línea para empezar.',
  qtyLabel: 'Cantidad',
  saveLabel: 'Guardar',
  savingLabel: 'Guardando…',
  unitLabel: 'Unidad',
  invalidQtyLabel: 'Cantidad inválida.',
  qtyRequiredLabel: 'La cantidad es obligatoria.',
  unitMismatchLabel: 'La unidad no coincide con la línea.',
  savedLabel: 'Línea guardada.',
  confirmNeededLabel: 'Cantidad inusual pendiente de confirmación.',
  saveErrorLabel: 'No se pudo guardar.',
  confirmTitle: 'Confirmar cantidad inusual',
  confirmBody: (quantity) => `Confirmar el envío de ${quantity} tal cual, sin redondear.`,
  confirmYesLabel: 'Confirmar y reenviar',
  confirmNoLabel: 'Revisar',
  stateLabels: {
    NOT_COUNTED: 'Sin contar',
    COUNTED: 'Contada',
    COUNTED_ZERO: 'Contada en cero',
    NOT_FOUND: 'No encontrada',
  } satisfies Record<RowState, string>,
  actionLabel: 'Contar esta línea',
  scanTriggerLabel: 'Escanear o buscar',
  scanDialogTitle: 'Buscar o escanear línea',
  scanCloseLabel: 'Cerrar',
  searchLabel: 'Buscar línea',
  searchPlaceholder: 'SKU o nombre',
  searchResultsLabel: (count) => `${count} resultados`,
  searchEmptyLabel: 'Sin resultados',
  manualAddLabel: 'Agregar manualmente',
  manualNameLabel: 'Nombre',
  manualUnitLabel: 'Unidad',
  manualSubmitLabel: 'Agregar',
  pendingLookupLabel: 'Ver pendientes',
  pendingDialogTitle: 'Líneas pendientes',
  pendingEmptyLabel: 'Sin líneas pendientes.',
}

function Providers({ api, children }: PropsWithChildren<{ api: InventoryApiPort }>) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return (
    <InventoryApiProvider api={api}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </InventoryApiProvider>
  )
}

describe('ManualCapture screen (F3-PR4)', () => {
  it('starts empty and shows a line only after it is picked from search', async () => {
    await mockInventoryApi.resetDemo()
    const attempt = await mockInventoryApi.startAttempt('scope-centro', 'manual')
    const user = userEvent.setup()
    render(<ManualCapture attemptId={attempt.id} strings={STRINGS} />, {
      wrapper: (props) => Providers({ api: mockInventoryApi, ...props }),
    })
    await screen.findByText('Escanee o busque una línea para empezar.')
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Escanear o buscar' }))
    await user.type(screen.getByRole('combobox', { name: 'Buscar línea' }), 'Caja')
    await user.click(await screen.findByRole('option', { name: /Caja demo/ }))
    expect(await screen.findByRole('heading', { name: 'Caja demo' })).toBeInTheDocument()
    expect(screen.queryByText('10.10')).not.toBeInTheDocument()
  })

  it('reveals pending identities with units only, never values', async () => {
    await mockInventoryApi.resetDemo()
    const attempt = await mockInventoryApi.startAttempt('scope-centro', 'manual')
    const user = userEvent.setup()
    render(<ManualCapture attemptId={attempt.id} strings={STRINGS} />, {
      wrapper: (props) => Providers({ api: mockInventoryApi, ...props }),
    })
    await user.click(screen.getByRole('button', { name: 'Ver pendientes' }))
    const dialog = await screen.findByRole('listbox')
    expect(dialog).toHaveTextContent('Caja demo')
    expect(dialog).toHaveTextContent('UN')
    expect(dialog).not.toHaveTextContent('10.10')
    // Already-counted lines never appear in the blind pending lookup.
    expect(dialog).not.toHaveTextContent('Granel demo')
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('opens the scanner dialog with Ctrl+K', async () => {
    await mockInventoryApi.resetDemo()
    const attempt = await mockInventoryApi.startAttempt('scope-centro', 'manual')
    const user = userEvent.setup()
    render(<ManualCapture attemptId={attempt.id} strings={STRINGS} />, {
      wrapper: (props) => Providers({ api: mockInventoryApi, ...props }),
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.tab()
    await user.keyboard('{Control>}k{/Control}')
    expect(
      await screen.findByRole('dialog', { name: 'Buscar o escanear línea' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Buscar línea' })).toBeInTheDocument()
  })

  it('saves a picked line and stays on it — no auto-advance', async () => {
    await mockInventoryApi.resetDemo()
    const attempt = await mockInventoryApi.startAttempt('scope-centro', 'manual')
    const user = userEvent.setup()
    render(<ManualCapture attemptId={attempt.id} strings={STRINGS} />, {
      wrapper: (props) => Providers({ api: mockInventoryApi, ...props }),
    })
    await user.click(screen.getByRole('button', { name: 'Escanear o buscar' }))
    await user.type(screen.getByRole('combobox', { name: 'Buscar línea' }), 'Caja')
    await user.click(await screen.findByRole('option', { name: /Caja demo/ }))
    await user.type(screen.getByLabelText('Cantidad'), '2.5')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Línea guardada.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Caja demo' })).toBeInTheDocument()
    const lines = await mockInventoryApi.getOperatorLines(attempt.id)
    expect(lines.find((line) => line.code === 'SKU-001')?.currentQuantity).toBe('2.5')
  })

  it('holds advisory 422 confirm and resends the identical string on confirm', async () => {
    await mockInventoryApi.resetDemo()
    const attempt = await mockInventoryApi.startAttempt('scope-centro', 'manual')
    const seen: { quantity: unknown; confirm: unknown }[] = []
    let first = true
    const api: InventoryApiPort = {
      ...mockInventoryApi,
      saveBatch: async (attemptId, key, changes) => {
        seen.push({
          quantity: changes[0]?.quantity,
          confirm: changes[0]?.confirmUnusualQuantity ?? false,
        })
        if (first) {
          first = false
          throw new HttpError(422, 'UNPROCESSABLE', 'soft limit exceeded')
        }
        return mockInventoryApi.saveBatch(attemptId, key, changes)
      },
    }
    const user = userEvent.setup()
    render(<ManualCapture attemptId={attempt.id} strings={STRINGS} />, {
      wrapper: (props) => Providers({ api, ...props }),
    })
    await user.click(screen.getByRole('button', { name: 'Escanear o buscar' }))
    await user.type(screen.getByRole('combobox', { name: 'Buscar línea' }), 'Caja')
    await user.click(await screen.findByRole('option', { name: /Caja demo/ }))
    await user.type(screen.getByLabelText('Cantidad'), '9007199254740993.000001')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Confirmar cantidad inusual' })
    expect(dialog).toHaveTextContent('9007199254740993.000001')
    await user.click(screen.getByRole('button', { name: 'Confirmar y reenviar' }))
    expect(await screen.findByText('Línea guardada.')).toBeInTheDocument()
    expect(seen).toHaveLength(2)
    expect(seen[1]).toEqual({ quantity: '9007199254740993.000001', confirm: true })
  })
})
