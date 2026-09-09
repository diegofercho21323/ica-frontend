import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { InventoryApiProvider } from '../../shared/api/inventory/api-context'
import { mockInventoryApi } from '../../shared/api/inventory/mock'
import type { InventoryApiPort } from '../../shared/api/inventory/port'
import {
  RecountScreen,
  type RecountLineIdentity,
  type RecountScreenStrings,
} from './RecountScreen'

const LINES: RecountLineIdentity[] = [
  { code: 'SKU-001', name: 'Caja demo', unit: 'UN' },
  { code: 'SKU-002', name: 'Granel demo', unit: 'KG' },
]

const STRINGS: RecountScreenStrings = {
  titleLabel: 'Leader recount',
  forbiddenLabel: 'Recount is limited to the cost leader.',
  selectHintLabel: 'Select the lines to recount. Quantities stay hidden.',
  lineLabel: (line) => `${line.code} — ${line.name} (${line.unit})`,
  assigneeLabel: 'Assignee operator',
  createLabel: 'Create blind recount',
  creatingLabel: 'Creating recount…',
  createdLabel: (attemptId) => `Blind recount ${attemptId} created.`,
  failedLabel: 'Recount failed.',
  emptySelectionLabel: 'Select at least one line.',
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

const renderScreen = (
  api: InventoryApiPort,
  props: { canRecount: boolean; attemptId?: string },
) =>
  render(
    <RecountScreen
      attemptId={props.attemptId ?? 'att-1-scope-centro'}
      lines={LINES}
      canRecount={props.canRecount}
      strings={STRINGS}
    />,
    { wrapper: (wrapperProps) => Providers({ api, ...wrapperProps }) },
  )

describe('RecountScreen (F4-PR2)', () => {
  it('creates a blind v2 from the selected lines without showing quantities', async () => {
    const createCalls: Array<{ attemptId: string; lineCodes: string[]; assignee: string }> = []
    const api: InventoryApiPort = {
      ...mockInventoryApi,
      createRecount: async (attemptId, input) => {
        createCalls.push({
          attemptId,
          lineCodes: [...input.lineCodes],
          assignee: input.assignee,
        })
        return { id: 'att-2-scope-centro', operatorId: input.assignee, scopeId: 'scope-centro', mode: 'guided' }
      },
    }
    const user = userEvent.setup()
    renderScreen(api, { canRecount: true })

    expect(screen.getByText('Leader recount')).toBeInTheDocument()
    expect(screen.getByText('SKU-001 — Caja demo (UN)')).toBeInTheDocument()
    expect(screen.getByText('SKU-002 — Granel demo (KG)')).toBeInTheDocument()
    // Blind subset: identities only, never quantities.
    expect(screen.queryByText('10.10')).not.toBeInTheDocument()
    expect(screen.queryByText('9007199254740993.000001')).not.toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'SKU-001 — Caja demo (UN)' }))
    await user.click(screen.getByRole('checkbox', { name: 'SKU-002 — Granel demo (KG)' }))
    await user.type(screen.getByLabelText('Assignee operator'), 'operator-1')
    await user.click(screen.getByRole('button', { name: 'Create blind recount' }))

    expect(await screen.findByText('Blind recount att-2-scope-centro created.')).toBeInTheDocument()
    expect(createCalls).toEqual([
      {
        attemptId: 'att-1-scope-centro',
        lineCodes: ['SKU-001', 'SKU-002'],
        assignee: 'operator-1',
      },
    ])
  })

  it('keeps creation disabled until at least one line is selected', async () => {
    const createRecount = vi.fn()
    const api: InventoryApiPort = { ...mockInventoryApi, createRecount }
    const user = userEvent.setup()
    renderScreen(api, { canRecount: true })

    const button = screen.getByRole('button', { name: 'Create blind recount' })
    expect(button).toBeDisabled()
    expect(screen.getByText('Select at least one line.')).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'SKU-001 — Caja demo (UN)' }))
    expect(screen.getByRole('button', { name: 'Create blind recount' })).toBeEnabled()
    expect(createRecount).not.toHaveBeenCalled()
  })

  it('shows the inline 403 mirror for non-leaders and fires no mutation', async () => {
    const createRecount = vi.fn()
    const api: InventoryApiPort = { ...mockInventoryApi, createRecount }
    renderScreen(api, { canRecount: false })

    expect(screen.getByText('Recount is limited to the cost leader.')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Create blind recount' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('checkbox', { name: 'SKU-001 — Caja demo (UN)' }),
    ).not.toBeInTheDocument()
    expect(createRecount).not.toHaveBeenCalled()
  })
})
