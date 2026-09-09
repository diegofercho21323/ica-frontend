import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('idb-keyval', () => {
  const store = new Map<string, unknown>()
  return {
    createStore: vi.fn(() => ({})),
    get: vi.fn((key: string) => Promise.resolve(store.get(key))),
    set: vi.fn((key: string, value: unknown) => {
      store.set(key, value)
      return Promise.resolve()
    }),
    del: vi.fn((key: string) => {
      store.delete(key)
      return Promise.resolve()
    }),
    clear: vi.fn(() => {
      store.clear()
      return Promise.resolve()
    }),
  }
})

import { clear } from 'idb-keyval'
import { demoPersistence } from '../../shared/lib/persistence'
import { RequireRole } from './RequireRole'
import { SessionProvider } from './SessionContext'

function renderWithSession(unauthorizedLabel: string) {
  return render(
    <SessionProvider>
      <RequireRole allowedRoles={['cost-leader']} unauthorizedLabel={unauthorizedLabel}>
        <p>Leader workspace</p>
      </RequireRole>
    </SessionProvider>,
  )
}

describe('RequireRole (F4-PR2)', () => {
  beforeEach(async () => {
    await clear()
  })

  it('renders the leader workspace for the cost-leader role', async () => {
    await demoPersistence.saveDemoSession({
      userId: 'leader-1',
      displayName: 'Líder de costos',
      role: 'cost-leader',
    })
    renderWithSession('No autorizado para el reconteo.')

    expect(await screen.findByText('Leader workspace')).toBeInTheDocument()
    expect(
      screen.queryByText('No autorizado para el reconteo.'),
    ).not.toBeInTheDocument()
  })

  it('blocks operators with an inline message and never renders the workspace', async () => {
    await demoPersistence.saveDemoSession({
      userId: 'operator-1',
      displayName: 'Operador demo',
      role: 'operator',
    })
    const { container } = renderWithSession('No autorizado para el reconteo.')

    expect(
      await screen.findByText('No autorizado para el reconteo.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Leader workspace')).not.toBeInTheDocument()
    expect(container.textContent).not.toContain('Leader workspace')
  })

  it('blocks demo-admin too: the server enforces recount as leader-only', async () => {
    await demoPersistence.saveDemoSession({
      userId: 'admin-1',
      displayName: 'Administrador demo',
      role: 'demo-admin',
    })
    renderWithSession('No autorizado para el reconteo.')

    expect(
      await screen.findByText('No autorizado para el reconteo.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Leader workspace')).not.toBeInTheDocument()
  })
})
