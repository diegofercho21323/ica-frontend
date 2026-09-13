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
import { I18nextProvider } from 'react-i18next'
import { SessionProvider } from '../features/access/SessionContext'
import { mockInventoryApi } from '../shared/api/inventory/mock'
import { demoPersistence } from '../shared/lib/persistence'
import { i18n } from './i18n/config'
import { routeConfig } from './router'

function renderAt(path: string) {
  const router = createMemoryRouter(routeConfig, { initialEntries: [path] })
  render(
    <I18nextProvider i18n={i18n}>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </I18nextProvider>,
  )
  return router
}

describe('router — admin subtree (F1-PR1)', () => {
  beforeEach(async () => {
    await clear()
    vi.restoreAllMocks()
  })

  it('mounts the admin/users placeholder for a demo-admin session', async () => {
    await demoPersistence.saveDemoSession({
      userId: 'admin-1',
      displayName: 'Administrador demo',
      role: 'demo-admin',
    })

    renderAt('/admin/users')

    expect(await screen.findByText(i18n.t('admin.nav.users'))).toBeInTheDocument()
  })

  it('blocks an operator directly, as a sibling of RequireAuth (no redirect to /login)', async () => {
    // No session saved: anonymous. If /admin were nested under RequireAuth
    // this would redirect to /login instead of rendering the gate's own
    // unauthorized label.
    const listScopesSpy = vi.spyOn(mockInventoryApi, 'listScopes')

    const router = renderAt('/admin/users')

    expect(await screen.findByText(i18n.t('admin.unauthorized'))).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/users')
    expect(screen.queryByText(i18n.t('admin.nav.users'))).not.toBeInTheDocument()
    expect(listScopesSpy).not.toHaveBeenCalled()
  })

  it('blocks an authenticated operator from every admin child route', async () => {
    await demoPersistence.saveDemoSession({
      userId: 'operator-1',
      displayName: 'Operador demo',
      role: 'operator',
    })
    const listScopesSpy = vi.spyOn(mockInventoryApi, 'listScopes')

    renderAt('/admin/warehouses')

    expect(await screen.findByText(i18n.t('admin.unauthorized'))).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('admin.nav.warehouses'))).not.toBeInTheDocument()
    expect(listScopesSpy).not.toHaveBeenCalled()
  })
})
