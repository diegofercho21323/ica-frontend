import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import type { UserEvent } from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { vi } from 'vitest'
import { App } from '../src/app/App'
import { i18n } from '../src/app/i18n/config'
import { Providers } from '../src/app/providers'
import { router } from '../src/app/router'

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

async function loginAs(user: UserEvent, username: string, password: string) {
  expect(
    await screen.findByRole('heading', { name: i18n.t('access.title') }),
  ).toBeVisible()
  await user.click(screen.getByLabelText(i18n.t('access.username')))
  await user.keyboard(username)
  await user.click(screen.getByLabelText(i18n.t('access.password')))
  await user.keyboard(`${password}{Enter}`)
  // LoginPage redirects to the guard's `from` target, which varies with the
  // shared router history — only assert we left /login authenticated.
  await waitFor(() => {
    expect(window.location.pathname).not.toBe('/login')
  })
  expect(
    screen.getByRole('button', { name: i18n.t('access.logout') }),
  ).toBeVisible()
}

describe('application shell', () => {
  beforeEach(async () => {
    await clear()
  })

  it('logs in via keyboard and navigates with observed URL/heading and exact t() placeholders', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: i18n.t('access.title') }),
    ).toBeVisible()
    await loginAs(user, 'operador', 'operador')
    await user.click(
      within(await screen.findByRole('navigation', { name: 'ICA' })).getByRole('link', {
        name: 'Panel principal',
      }),
    )
    expect(
      await screen.findByRole('heading', { name: 'Panel principal' }),
    ).toBeVisible()
    expect(await screen.findByText(i18n.t('app.kpiTotal'))).toBeVisible()
    expect(screen.getByText(i18n.t('app.kpiCounted'))).toBeVisible()
    expect(screen.getByText(i18n.t('app.kpiPending'))).toBeVisible()
    expect(screen.getByText(i18n.t('app.kpiProgress'))).toBeVisible()

    const navigation = await screen.findByRole('navigation', { name: 'ICA' })
    expect(screen.getByRole('main')).toBeVisible()

    expect(window.location.pathname).toBe('/dashboard')
    expect(
      await screen.findByRole('heading', { name: 'Panel principal' }),
    ).toBeVisible()
    expect(await screen.findByText('5')).toBeVisible()
    expect(screen.getByText('3')).toBeVisible()
    expect(screen.getByText('2')).toBeVisible()
    expect(screen.getByText('60')).toBeVisible()
    expect(document.body.textContent).not.toContain(
      i18n.t('app.dashboardPlaceholder'),
    )

    within(navigation).getByRole('link', { name: 'Bodegas' }).focus()
    await user.keyboard('{Enter}')
    expect(window.location.pathname).toBe('/bodegas')
    expect(
      await screen.findByRole('heading', { name: 'Bodegas' }),
    ).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent(
      i18n.t('app.emptyWarehouses'),
    )
    expect(i18n.t('app.emptyWarehouses')).toBe(
      'No hay bodegas disponibles para esta demo.',
    )
  })

  it('activates the Captura link with Space and shows exact capturePlaceholder via t()', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loginAs(user, 'lider', 'lider')

    const navigation = await screen.findByRole('navigation', { name: 'ICA' })
    within(navigation).getByRole('link', { name: 'Captura' }).focus()
    await user.keyboard(' ')

    expect(window.location.pathname).toBe('/capture')
    expect(
      await screen.findByRole('heading', { name: 'Captura' }),
    ).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent(
      i18n.t('app.capturePlaceholder'),
    )
    expect(i18n.t('app.capturePlaceholder')).toBe(
      'La captura estará disponible en el siguiente bloque MVP.',
    )
  })

  it('closes the mobile drawer on link activation and returns focus to the menu trigger', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loginAs(user, 'admin', 'admin')

    const trigger = screen.getByRole('button', { name: 'ICA' })
    await user.click(trigger)
    const drawer = await screen.findByRole('dialog')
    within(drawer).getByRole('link', { name: 'Panel principal' }).focus()
    await user.keyboard('{Enter}')

    expect(window.location.pathname).toBe('/dashboard')
    expect(
      await screen.findByRole('heading', { name: 'Panel principal' }),
    ).toBeVisible()
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger)
    })
  })

  it('transitions via desktop sidebar links with no drawer state change on >=lg', async () => {
    const user = userEvent.setup()
    window.innerWidth = 1280
    render(<App />)
    await loginAs(user, 'operador', 'operador')

    const navigation = await screen.findByRole('navigation', { name: 'ICA' })
    await user.click(within(navigation).getByRole('link', { name: 'Bodegas' }))

    expect(window.location.pathname).toBe('/bodegas')
    expect(
      await screen.findByRole('heading', { name: 'Bodegas' }),
    ).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent(
      i18n.t('app.emptyWarehouses'),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('exposes banner, nav, and main landmarks with the t() header title', async () => {
    render(<App />)

    const banner = await screen.findByRole('banner')
    expect(within(banner).getByText(i18n.t('app.title'))).toBeVisible()
    expect(
      screen.getByRole('navigation', { name: i18n.t('app.title') }),
    ).toBeVisible()
    expect(screen.getByRole('main')).toBeVisible()
  })

  it('renders drawer and header titles from t() with no hardcoded copy', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(
      within(await screen.findByRole('banner')).getByText(i18n.t('app.title')),
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: i18n.t('app.title') }))
    const drawer = await screen.findByRole('dialog', {
      name: i18n.t('app.title'),
    })
    expect(within(drawer).getByText(i18n.t('app.title'))).toBeVisible()
  })

  it('logs out back to /login with the session cleared', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loginAs(user, 'operador', 'operador')

    await user.click(screen.getByRole('button', { name: i18n.t('access.logout') }))

    expect(
      await screen.findByRole('heading', { name: i18n.t('access.title') }),
    ).toBeVisible()
    expect(window.location.pathname).toBe('/login')
  })

  it.each([{ path: '/dashboard' }, { path: '/bodegas' }, { path: '/capture' }])(
    'redirects anonymous direct URL entry at $path to /login',
    async ({ path }) => {
      const directRouter = createMemoryRouter(router.routes, {
        initialEntries: [path],
      })
      render(
        <Providers>
          <RouterProvider router={directRouter} />
        </Providers>,
      )

      expect(directRouter.state.location.pathname).toBe(path)
      await waitFor(() => {
        expect(directRouter.state.location.pathname).toBe('/login')
      })
      expect(
        await screen.findByRole('heading', { name: i18n.t('access.title') }),
      ).toBeVisible()
    },
  )
})
