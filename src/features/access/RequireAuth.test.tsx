import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'

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
import { RequireAuth } from './RequireAuth'
import { SessionProvider } from './SessionContext'

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <h1>Página de acceso</h1> },
      {
        Component: RequireAuth,
        children: [{ path: '/dashboard', element: <h1>Panel principal</h1> }],
      },
    ],
    { initialEntries: [path] },
  )
  render(
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>,
  )
  return router
}

describe('RequireAuth', () => {
  beforeEach(async () => {
    await clear()
  })

  it('redirects anonymous visits to /login preserving the origin', async () => {
    const router = renderAt('/dashboard')

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login')
    })
    expect(await screen.findByRole('heading', { name: 'Página de acceso' })).toBeVisible()
    expect(router.state.location.state).toEqual({ from: '/dashboard' })
  })

  it('renders the outlet when a session exists', async () => {
    await demoPersistence.saveDemoSession({
      userId: 'operator-1',
      displayName: 'Operador demo',
      role: 'operator',
    })
    const router = renderAt('/dashboard')

    expect(await screen.findByRole('heading', { name: 'Panel principal' })).toBeVisible()
    expect(router.state.location.pathname).toBe('/dashboard')
  })
})
