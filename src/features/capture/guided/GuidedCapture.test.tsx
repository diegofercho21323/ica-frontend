import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { describe, expect, it } from 'vitest'
import { HttpError } from '../../../shared/api/inventory/errors'
import { InventoryApiProvider } from '../../../shared/api/inventory/api-context'
import type { InventoryApiPort } from '../../../shared/api/inventory/port'
import { mockInventoryApi } from '../../../shared/api/inventory/mock'
import type { RowState } from '../validation'
import { GuidedCapture, type GuidedCaptureStrings } from './GuidedCapture'

const STRINGS: GuidedCaptureStrings = {
  progressLabel: (counted, total) => `Avance ${counted} de ${total}`,
  stateLabels: {
    NOT_COUNTED: 'Sin contar',
    COUNTED: 'Contada',
    COUNTED_ZERO: 'Contada en cero',
    NOT_FOUND: 'No encontrada',
  } satisfies Record<RowState, string>,
  actionLabel: 'Contar esta línea',
  qtyLabel: 'Cantidad',
  saveLabel: 'Guardar y continuar',
  savingLabel: 'Guardando…',
  prevLabel: 'Anterior',
  nextLabel: 'Siguiente',
  searchLabel: 'Buscar línea',
  searchPlaceholder: 'SKU o nombre',
  searchResultsLabel: (count) => `${count} resultados`,
  searchEmptyLabel: 'Sin resultados',
  searchCloseLabel: 'Cerrar búsqueda',
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
  manualEmptyLabel: 'Escanee o busque una línea para empezar.',
  pendingLookupLabel: 'Ver pendientes',
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

describe('GuidedCapture assistant (F3-PR2)', () => {
  it('completes the keyboard-only loop: type, Enter, auto-advance, announce', async () => {
    await mockInventoryApi.resetDemo()
    const attempt = await mockInventoryApi.startAttempt('scope-centro', 'guided')
    // Two pending lines so the auto-advance has somewhere to go.
    await mockInventoryApi.saveBatch(attempt.id, 'setup-reopen-sku-002', [
      { lineCode: 'SKU-002', quantity: null, state: 'NOT_COUNTED' },
    ])
    const user = userEvent.setup()
    render(<GuidedCapture attemptId={attempt.id} mode="guided" strings={STRINGS} />, {
      wrapper: (props) => Providers({ api: mockInventoryApi, ...props }),
    })
    expect(await screen.findByRole('heading', { name: 'Caja demo' })).toBeInTheDocument()
    // Blind-safe: the counted fixture value never leaks into this flow.
    expect(screen.queryByText('10.10')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Cantidad'), '2.5')
    await user.keyboard('{Enter}')
    expect(await screen.findByText('Línea guardada.')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Caja demo' })).not.toBeInTheDocument(),
    )
    const lines = await mockInventoryApi.getOperatorLines(attempt.id)
    expect(lines.find((line) => line.code === 'SKU-001')?.currentQuantity).toBe('2.5')
  })

  it('manual starts empty and reveals pending identities without values', async () => {
    await mockInventoryApi.resetDemo()
    const attempt = await mockInventoryApi.startAttempt('scope-centro', 'manual')
    const user = userEvent.setup()
    render(<GuidedCapture attemptId={attempt.id} mode="manual" strings={STRINGS} />, {
      wrapper: (props) => Providers({ api: mockInventoryApi, ...props }),
    })
    await screen.findByText('Escanee o busque una línea para empezar.')
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ver pendientes' }))
    const dialog = await screen.findByRole('listbox')
    expect(dialog).toHaveTextContent('Caja demo')
    expect(dialog).toHaveTextContent('UN')
    expect(dialog).not.toHaveTextContent('10.10')
  })

  it('holds advisory 422 confirm and resends the identical string on confirm', async () => {
    await mockInventoryApi.resetDemo()
    const attempt = await mockInventoryApi.startAttempt('scope-centro', 'guided')
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
    render(<GuidedCapture attemptId={attempt.id} mode="guided" strings={STRINGS} />, {
      wrapper: (props) => Providers({ api, ...props }),
    })
    await screen.findByRole('heading', { name: 'Caja demo' })
    await user.type(screen.getByLabelText('Cantidad'), '9007199254740993.000001')
    await user.click(screen.getByRole('button', { name: 'Guardar y continuar' }))
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Confirmar cantidad inusual',
    })
    expect(dialog).toHaveTextContent('9007199254740993.000001')
    await user.click(screen.getByRole('button', { name: 'Confirmar y reenviar' }))
    expect(await screen.findByText('Línea guardada.')).toBeInTheDocument()
    expect(seen).toHaveLength(2)
    expect(seen[1]).toEqual({ quantity: '9007199254740993.000001', confirm: true })
  })
})
