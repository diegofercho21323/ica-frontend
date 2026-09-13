import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../src/app/App'
import { i18n } from '../src/app/i18n/config'
import { theme } from '../src/app/theme'
import { tokens } from '../src/app/tokens'

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

describe('visual shell base', () => {
  beforeEach(async () => {
    await clear()
  })
  it('resolves Tallycore light tokens from ThemeConfig with no hardcoded brand in shell', () => {
    expect(tokens.colorPrimary).toBe('#0B5CD6')
    expect(tokens.borderRadius).toBe(8)
    expect(tokens.fontFamily).toMatch(/inter/i)
    expect(tokens.colorBgContainer).toBe('#FFFFFF')
    const seed = theme.token ?? {}
    expect(seed.colorPrimary).toBe('#0B5CD6')
    expect(seed.borderRadius).toBe(8)
    expect(String(seed.fontFamily)).toMatch(/inter/i)
    const layout = theme.components?.Layout ?? {}
    expect(layout.headerBg).toBe(tokens.colorBgContainer)
    expect(layout.siderBg).toBe(tokens.colorBgLayout)
    expect(layout.lightSiderBg).toBe(tokens.colorBgLayout)
    expect(layout.bodyBg).toBe(tokens.colorBgLayout)
    expect(layout.headerColor).toBe(tokens.colorText)
  })

  it('offsets content below the sticky header with no horizontal overflow', async () => {
    render(<App />)
    const banner = await screen.findByRole('banner')
    const main = await screen.findByRole('main')
    const headerStyle = getComputedStyle(banner)
    const contentStyle = getComputedStyle(main)
    expect(headerStyle.position).toBe('sticky')
    expect(headerStyle.top).toBe('0px')
    expect(Number.parseFloat(contentStyle.paddingTop)).toBeGreaterThan(0)
    // Heading box must sit below the sticky header box at 390px.
    const headerBox = banner.getBoundingClientRect()
    const heading = await screen.findByRole('heading')
    const headingBox = heading.getBoundingClientRect()
    expect(headingBox.top).toBeGreaterThanOrEqual(headerBox.bottom)
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390)
  })

  it('marks exactly one active route with selected state and aria-current on the rail', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loginAs(user, 'operador', 'operador')
    const navigation = await screen.findByRole('navigation', {
      name: i18n.t('app.title'),
    })
    await user.click(within(navigation).getByRole('link', { name: 'Bodegas' }))
    await screen.findByRole('heading', { name: 'Bodegas' })
    const current = screen.getAllByRole('link', { current: 'page' })
    expect(current).toHaveLength(1)
    expect(current[0]).toHaveTextContent('Bodegas')
  })

  it('structures the drawer with title, nav group, and labeled close while keeping close-on-navigate and focus return', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loginAs(user, 'operador', 'operador')
    const trigger = screen.getByRole('button', { name: i18n.t('app.title') })
    await user.click(trigger)
    const drawer = await screen.findByRole('dialog', {
      name: i18n.t('app.title'),
    })
    expect(
      within(drawer).getByRole('heading', { name: i18n.t('app.navPrimary') }),
    ).toBeVisible()
    const closeButton = within(drawer).getByRole('button', {
      name: i18n.t('app.closeMenu'),
    })
    expect(i18n.t('app.closeMenu')).not.toBe('app.closeMenu')
    await user.click(
      within(drawer).getByRole('link', { name: 'Panel principal' }),
    )
    await screen.findByRole('heading', { name: 'Panel principal' })
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger)
    })
    expect(closeButton).toBeDefined()
  })

  it('keeps the Sider in normal flow beside Content under a full-width header', async () => {
    const { container } = render(<App />)
    const banner = await screen.findByRole('banner')
    const main = await screen.findByRole('main')
    const aside = container.querySelector('aside')
    expect(aside).not.toBeNull()
    // Sider and Content share one inner Layout; the header sits above it.
    expect(aside?.parentElement).toBe(main.parentElement)
    expect(banner.parentElement).not.toBe(aside?.parentElement)
  })

  it('renders full rail labels (no collapsed icon-only menu without icons)', async () => {
    const { container } = render(<App />)
    await screen.findByRole('banner')
    const aside = container.querySelector('aside')
    const railMenu = within(aside as HTMLElement).getByRole('menu')
    expect(railMenu.className).not.toMatch(/inline-collapsed/)
  })

  it('hides the floating Sider zero-width trigger below lg (drawer owns mobile nav)', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: () => ({
        matches: true,
        media: '',
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    })
    const { container } = render(<App />)
    await screen.findByRole('banner')
    expect(
      container.querySelector('.ant-layout-sider-zero-width-trigger'),
    ).toBeNull()
  })
})
