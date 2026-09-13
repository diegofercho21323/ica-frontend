import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
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
import { useEffect } from 'react'
import { I18nextProvider } from 'react-i18next'
import { SessionProvider } from '../features/access/SessionContext'
import { mockInventoryApi } from '../shared/api/inventory/mock'
import { demoPersistence } from '../shared/lib/persistence'
import { i18n } from './i18n/config'
import { RequireAdminRoute } from './RequireAdminRoute'

function AdminStubScreen() {
  // Stands in for a real admin screen (PR2+): mounting fires a port call,
  // so "children never mount" can be proven by asserting this spy stays
  // uncalled, not just by asserting the text is absent.
  useEffect(() => {
    void mockInventoryApi.listScopes()
  }, [])
  return <p>Admin workspace</p>
}

function renderAdminAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/admin',
        Component: RequireAdminRoute,
        children: [{ index: true, Component: AdminStubScreen }],
      },
    ],
    { initialEntries: [path] },
  )
  return render(
    <I18nextProvider i18n={i18n}>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </I18nextProvider>,
  )
}

describe('RequireAdminRoute', () => {
  beforeEach(async () => {
    await clear()
    vi.restoreAllMocks()
  })

  it('renders the outlet for a demo-admin session', async () => {
    await demoPersistence.saveDemoSession({
      userId: 'admin-1',
      displayName: 'Administrador demo',
      role: 'demo-admin',
    })
    const listScopesSpy = vi.spyOn(mockInventoryApi, 'listScopes')

    renderAdminAt('/admin')

    expect(await screen.findByText('Admin workspace')).toBeInTheDocument()
    expect(listScopesSpy).toHaveBeenCalledTimes(1)
  })

  it('blocks an operator session and never mounts the outlet', async () => {
    await demoPersistence.saveDemoSession({
      userId: 'operator-1',
      displayName: 'Operador demo',
      role: 'operator',
    })
    const listScopesSpy = vi.spyOn(mockInventoryApi, 'listScopes')

    renderAdminAt('/admin')

    expect(await screen.findByText(i18n.t('admin.unauthorized'))).toBeInTheDocument()
    expect(screen.queryByText('Admin workspace')).not.toBeInTheDocument()
    expect(listScopesSpy).not.toHaveBeenCalled()
  })

  it('blocks a cost-leader session the same way', async () => {
    await demoPersistence.saveDemoSession({
      userId: 'leader-1',
      displayName: 'Líder de costos',
      role: 'cost-leader',
    })
    const listScopesSpy = vi.spyOn(mockInventoryApi, 'listScopes')

    renderAdminAt('/admin')

    expect(await screen.findByText(i18n.t('admin.unauthorized'))).toBeInTheDocument()
    expect(screen.queryByText('Admin workspace')).not.toBeInTheDocument()
    expect(listScopesSpy).not.toHaveBeenCalled()
  })
})
