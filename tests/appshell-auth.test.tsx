import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../src/app/App'
import { i18n } from '../src/app/i18n/config'

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
  await screen.findByRole('button', { name: i18n.t('access.logout') })
}

function railNav() {
  return screen.getByRole('navigation', { name: i18n.t('app.title') })
}

function expectAnonymousNav(nav: HTMLElement) {
  expect(
    within(nav).getByRole('link', { name: i18n.t('app.login') }),
  ).toBeVisible()
  expect(
    within(nav).queryByRole('link', { name: i18n.t('app.dashboard') }),
  ).not.toBeInTheDocument()
  expect(
    within(nav).queryByRole('link', { name: i18n.t('app.warehouses') }),
  ).not.toBeInTheDocument()
  expect(
    within(nav).queryByRole('link', { name: i18n.t('app.capture') }),
  ).not.toBeInTheDocument()
}

function expectAuthenticatedNav(nav: HTMLElement) {
  expect(
    within(nav).getByRole('link', { name: i18n.t('app.dashboard') }),
  ).toBeVisible()
  expect(
    within(nav).getByRole('link', { name: i18n.t('app.warehouses') }),
  ).toBeVisible()
  // "Iniciar sesión" and "Captura" are gone once authenticated: logout is
  // its own header action, and Bodegas already starts capture directly.
  expect(
    within(nav).queryByRole('link', { name: i18n.t('app.login') }),
  ).not.toBeInTheDocument()
  expect(
    within(nav).queryByRole('link', { name: i18n.t('app.capture') }),
  ).not.toBeInTheDocument()
}

describe('app shell auth-gated navigation (F6-P1)', () => {
  beforeEach(async () => {
    await clear()
  })

  it('anonymous shell shows only brand ICA and Iniciar sesión on the rail', async () => {
    render(<App />)
    await screen.findByRole('banner')

    expect(screen.getByText(i18n.t('app.title'))).toBeVisible()
    expectAnonymousNav(railNav())
  })

  it('anonymous drawer shows only Iniciar sesión', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('banner')

    await user.click(screen.getByRole('button', { name: i18n.t('app.title') }))
    const drawer = await screen.findByRole('dialog', {
      name: i18n.t('app.title'),
    })
    expectAnonymousNav(drawer)
  })

  it('authenticated shell reveals Panel and Bodegas (no Iniciar sesión, no Captura) on rail and drawer', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loginAs(user, 'operador', 'operador')

    expectAuthenticatedNav(railNav())

    await user.click(screen.getByRole('button', { name: i18n.t('app.title') }))
    const drawer = await screen.findByRole('dialog', {
      name: i18n.t('app.title'),
    })
    expectAuthenticatedNav(drawer)
  })
})
