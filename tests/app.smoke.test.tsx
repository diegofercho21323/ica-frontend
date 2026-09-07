import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { App } from '../src/app/App'
import { i18n } from '../src/app/i18n/config'
import { Providers } from '../src/app/providers'
import { router } from '../src/app/router'

describe('application shell', () => {
  it('navigates via click and Enter with observed URL/heading and exact t() placeholders', async () => {
    const user = userEvent.setup()
    render(<App />)

    const navigation = await screen.findByRole('navigation', { name: 'ICA' })
    expect(screen.getByRole('main')).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent(
      i18n.t('app.shellPlaceholder'),
    )
    expect(i18n.t('app.shellPlaceholder')).toBe(
      'Esta pantalla estará disponible en el siguiente bloque MVP.',
    )

    await user.click(
      within(navigation).getByRole('link', { name: 'Panel principal' }),
    )
    expect(window.location.pathname).toBe('/dashboard')
    expect(
      await screen.findByRole('heading', { name: 'Panel principal' }),
    ).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent(
      i18n.t('app.dashboardPlaceholder'),
    )
    expect(i18n.t('app.dashboardPlaceholder')).toBe(
      'Tus asignaciones aparecerán aquí cuando estén listas.',
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

  it.each([
    {
      path: '/bodegas',
      heading: 'Bodegas',
      key: 'app.emptyWarehouses',
      copy: 'No hay bodegas disponibles para esta demo.',
    },
    {
      path: '/capture',
      heading: 'Captura',
      key: 'app.capturePlaceholder',
      copy: 'La captura estará disponible en el siguiente bloque MVP.',
    },
  ])(
    'renders direct URL entry at $path with placeholder and no guard redirect',
    async ({ path, heading, key, copy }) => {
      const directRouter = createMemoryRouter(router.routes, {
        initialEntries: [path],
      })
      render(
        <Providers>
          <RouterProvider router={directRouter} />
        </Providers>,
      )

      expect(
        await screen.findByRole('heading', { name: heading }),
      ).toBeVisible()
      expect(directRouter.state.location.pathname).toBe(path)
      expect(screen.getByRole('alert')).toHaveTextContent(i18n.t(key))
      expect(i18n.t(key)).toBe(copy)
    },
  )
})
