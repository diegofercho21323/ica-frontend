import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { InventoryApiProvider } from '../../shared/api/inventory/api-context'
import { HttpError } from '../../shared/api/inventory/errors'
import { mockInventoryApi } from '../../shared/api/inventory/mock'
import type { Receipt } from '../../shared/api/inventory/models'
import type { InventoryApiPort } from '../../shared/api/inventory/port'
import type { SubmissionQueueEntry } from '../../shared/lib/submission-queue'
import {
  ReceiptView,
  RetryButton,
  SubmissionQueue,
  submissionHistoryKey,
  type SubmissionQueueStrings,
} from './SubmissionQueue'

const STRINGS: SubmissionQueueStrings = {
  titleLabel: 'Submission queue',
  emptyLabel: 'No submissions yet.',
  stateLabels: {
    pending: 'Pending sync',
    synced: 'Synced',
    conflict: 'Conflict — action needed',
  },
  attemptLabel: (id) => `Attempt ${id}`,
  keyLabel: (key) => `Key ${key}`,
  retryLabel: 'Retry submit',
  retryingLabel: 'Retrying…',
  resolveLabel: 'Resolve conflict — start new attempt',
  resolvingLabel: 'Resolving…',
  resolvedLabel: 'Conflict resolved — submission synced.',
  lockedLabel: 'Attempt locked — no edits allowed.',
  submittedLabel: 'Submission synced.',
  submitFailedLabel: 'Submit failed.',
  conflictAnnounceLabel: 'Conflict — deliberate recovery required.',
  receiptStatusLabels: { SUCCEEDED: 'Succeeded', FAILED: 'Failed' },
  payloadHashLabel: (hash) => `Payload ${hash}`,
  erpReferenceLabel: (reference) => `ERP ${reference}`,
  noReferenceLabel: 'No ERP reference yet.',
}

const pendingFailed: SubmissionQueueEntry = {
  attemptId: 'att-1',
  idempotencyKey: 'retry-key',
  state: 'pending',
  queuedAt: 2,
  receipt: {
    key: 'retry-key',
    status: 'FAILED',
    payload_hash: 'cafef00d',
    erp_reference: null,
  },
}

const syncedDone: SubmissionQueueEntry = {
  attemptId: 'att-1',
  idempotencyKey: 'done-key',
  state: 'synced',
  queuedAt: 1,
  receipt: {
    key: 'done-key',
    status: 'SUCCEEDED',
    payload_hash: 'deadbeef',
    erp_reference: 'erp-att-1-v1',
  },
}

const conflicted: SubmissionQueueEntry = {
  attemptId: 'att-1',
  idempotencyKey: 'clash-key',
  state: 'conflict',
  queuedAt: 3,
  detail: 'IDEMPOTENCY_CONFLICT',
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

const stubApi = (submit: (attemptId: string, key: string) => Promise<Receipt>) => {
  const calls: Array<{ attemptId: string; key: string }> = []
  const api: InventoryApiPort = {
    ...mockInventoryApi,
    submit: async (attemptId, key) => {
      calls.push({ attemptId, key })
      return submit(attemptId, key)
    },
  }
  return { api, calls }
}

const renderQueue = (
  api: InventoryApiPort,
  entries: SubmissionQueueEntry[],
  locked = false,
) =>
  render(
    <SubmissionQueue
      sessionId="sess-1"
      initialEntries={entries}
      locked={locked}
      strings={STRINGS}
    />,
    { wrapper: (props) => Providers({ api, ...props }) },
  )

describe('SubmissionQueue UI (F4-PR1)', () => {
  it('lists every queue state with distinct text, never color-only', () => {
    const { api } = stubApi(async () => syncedDone.receipt as Receipt)
    renderQueue(api, [pendingFailed, syncedDone, conflicted])
    expect(screen.getByText('Submission queue')).toBeInTheDocument()
    expect(screen.getByText('Pending sync')).toBeInTheDocument()
    expect(screen.getByText('Synced')).toBeInTheDocument()
    expect(screen.getByText('Conflict — action needed')).toBeInTheDocument()
    // Text + icon per state: each Status renders role=status, never color alone.
    expect(screen.getAllByRole('status').length).toBeGreaterThanOrEqual(3)
  })

  it('shows the synced receipt payload_hash and ERP reference verbatim', () => {
    const { api } = stubApi(async () => syncedDone.receipt as Receipt)
    renderQueue(api, [syncedDone])
    expect(screen.getByText('Payload deadbeef')).toBeInTheDocument()
    expect(screen.getByText('ERP erp-att-1-v1')).toBeInTheDocument()
    expect(screen.getByText('Succeeded')).toBeInTheDocument()
  })

  it('shows the no-reference label for FAILED receipts without inventing one', () => {
    const { api } = stubApi(async () => pendingFailed.receipt as Receipt)
    renderQueue(api, [pendingFailed])
    expect(screen.getByText('Payload cafef00d')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
    expect(screen.getByText('No ERP reference yet.')).toBeInTheDocument()
    expect(screen.queryByText(/ERP erp-/)).not.toBeInTheDocument()
  })

  it('retries with the same Idempotency-Key and announces the receipt', async () => {
    const receipt: Receipt = {
      key: 'retry-key',
      status: 'SUCCEEDED',
      payload_hash: 'cafef00d',
      erp_reference: 'erp-att-1-v2',
    }
    const { api, calls } = stubApi(async () => receipt)
    const user = userEvent.setup()
    renderQueue(api, [pendingFailed])
    await user.click(screen.getByRole('button', { name: 'Retry submit' }))
    expect(calls).toEqual([{ attemptId: 'att-1', key: 'retry-key' }])
    expect(await screen.findByText('Submission synced.')).toBeInTheDocument()
    expect(await screen.findByText('ERP erp-att-1-v2')).toBeInTheDocument()
  })

  it('routes each pending entry to its own key, oldest first', async () => {
    const older: SubmissionQueueEntry = {
      ...pendingFailed,
      idempotencyKey: 'older-key',
      queuedAt: 1,
      receipt: { ...(pendingFailed.receipt as Receipt), key: 'older-key' },
    }
    const { api, calls } = stubApi(async (_attemptId, key) => ({
      key,
      status: 'SUCCEEDED',
      payload_hash: `${key}-hash`,
      erp_reference: null,
    }))
    const user = userEvent.setup()
    renderQueue(api, [pendingFailed, older])
    const buttons = screen.getAllByRole('button', { name: 'Retry submit' })
    expect(buttons).toHaveLength(2)
    await user.click(buttons[0])
    expect(calls).toEqual([{ attemptId: 'att-1', key: 'older-key' }])
  })

  it('marks 409 as conflict with exactly one request and never auto-retries', async () => {
    const { api, calls } = stubApi(async () => {
      throw new HttpError(409, 'IDEMPOTENCY_CONFLICT', 'same key, different body')
    })
    const user = userEvent.setup()
    renderQueue(api, [pendingFailed])
    await user.click(screen.getByRole('button', { name: 'Retry submit' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Conflict — deliberate recovery required.',
    )
    expect(await screen.findByText('Conflict — action needed')).toBeInTheDocument()
    expect(calls).toHaveLength(1)
    expect(
      screen.queryByRole('button', { name: 'Retry submit' }),
    ).not.toBeInTheDocument()
  })

  it('offers retry only for pending entries, never synced or conflict', () => {
    const { api } = stubApi(async () => syncedDone.receipt as Receipt)
    renderQueue(api, [pendingFailed, syncedDone, conflicted])
    expect(
      screen.getAllByRole('button', { name: 'Retry submit' }),
    ).toHaveLength(1)
  })

  it('offers a deliberate resolve action for conflicts, submitting under a brand-new key', async () => {
    const receipt: Receipt = {
      key: 'brand-new-key',
      status: 'SUCCEEDED',
      payload_hash: 'resolved-hash',
      erp_reference: 'erp-att-1-v3',
    }
    const { api, calls } = stubApi(async (_attemptId, key) => ({
      ...receipt,
      key,
    }))
    const user = userEvent.setup()
    renderQueue(api, [conflicted])
    expect(
      screen.queryByRole('button', { name: 'Retry submit' }),
    ).not.toBeInTheDocument()
    const resolveButton = screen.getByRole('button', {
      name: 'Resolve conflict — start new attempt',
    })
    await user.click(resolveButton)
    expect(calls).toHaveLength(1)
    expect(calls[0].attemptId).toBe('att-1')
    expect(calls[0].key).not.toBe('clash-key')
    expect(
      await screen.findByText('Conflict resolved — submission synced.'),
    ).toBeInTheDocument()
    expect(await screen.findByText('Synced')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: 'Resolve conflict — start new attempt',
      }),
    ).not.toBeInTheDocument()
  })

  it('never resolves a conflict automatically — a second 409 stays a conflict, no silent retry loop', async () => {
    const { api, calls } = stubApi(async () => {
      throw new HttpError(409, 'IDEMPOTENCY_CONFLICT', 'still clashing')
    })
    const user = userEvent.setup()
    renderQueue(api, [conflicted])
    await user.click(
      screen.getByRole('button', { name: 'Resolve conflict — start new attempt' }),
    )
    expect(calls).toHaveLength(1)
    expect(await screen.findByText('Conflict — action needed')).toBeInTheDocument()
    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('Conflict — deliberate recovery required.')
  })

  it('disables the resolve action on locked attempts and names the lock', () => {
    const { api } = stubApi(async () => syncedDone.receipt as Receipt)
    renderQueue(api, [conflicted], true)
    expect(
      screen.getByRole('button', { name: 'Resolve conflict — start new attempt' }),
    ).toBeDisabled()
    expect(
      screen.getByText('Attempt locked — no edits allowed.'),
    ).toBeInTheDocument()
  })

  it('disables retry on locked attempts and names the lock', () => {
    const { api } = stubApi(async () => syncedDone.receipt as Receipt)
    renderQueue(api, [pendingFailed], true)
    expect(screen.getByRole('button', { name: 'Retry submit' })).toBeDisabled()
    expect(
      screen.getByText('Attempt locked — no edits allowed.'),
    ).toBeInTheDocument()
  })

  it('renders the empty queue without crash and without retry affordance', () => {
    const { api } = stubApi(async () => syncedDone.receipt as Receipt)
    renderQueue(api, [])
    expect(screen.getByText('No submissions yet.')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Retry submit' }),
    ).not.toBeInTheDocument()
  })

  it('namespaces history keys by session_id, never bare attempt inference', () => {
    expect(submissionHistoryKey('sess-1')).toEqual(['submission-history', 'sess-1'])
    expect(submissionHistoryKey('sess-2')).not.toEqual(
      submissionHistoryKey('sess-1'),
    )
  })

  it('RetryButton reports the entry key unchanged on click', async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()
    render(
      <RetryButton
        attemptId="att-9"
        idempotencyKey="same-key"
        retryLabel="Retry submit"
        retryingLabel="Retrying…"
        onRetry={onRetry}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Retry submit' }))
    expect(onRetry).toHaveBeenCalledWith({
      attemptId: 'att-9',
      idempotencyKey: 'same-key',
    })
  })

  it('ReceiptView renders status, hash, and reference from props only', () => {
    render(
      <ReceiptView
        receipt={syncedDone.receipt as Receipt}
        statusLabel="Succeeded"
        hashText="Payload deadbeef"
        referenceText="ERP erp-att-1-v1"
      />,
    )
    expect(screen.getByText('Succeeded')).toBeInTheDocument()
    expect(screen.getByText('Payload deadbeef')).toBeInTheDocument()
    expect(screen.getByText('ERP erp-att-1-v1')).toBeInTheDocument()
  })
})
