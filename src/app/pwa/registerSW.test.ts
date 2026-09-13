import { cleanup, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { createElement, type ReactElement } from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '../i18n/config'

// The generated hook is vite-plugin-pwa's build-time output (`virtual:pwa-register/react`).
// It only exists after `vite build`/`vite dev` runs the plugin, so it is mocked here —
// this is the one seam between our code and the generated service-worker glue.
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: vi.fn(),
}))

import { useRegisterSW } from 'virtual:pwa-register/react'
import { PwaStatus, usePwaLifecycle } from './registerSW'

function renderWithI18n(node: ReactElement) {
  return render(createElement(I18nextProvider, { i18n }, node))
}

function mockLifecycle(overrides: {
  needRefresh?: boolean
  offlineReady?: boolean
  updateServiceWorker?: () => Promise<void>
}) {
  vi.mocked(useRegisterSW).mockReturnValue({
    needRefresh: [overrides.needRefresh ?? false, vi.fn()],
    offlineReady: [overrides.offlineReady ?? false, vi.fn()],
    updateServiceWorker: overrides.updateServiceWorker ?? vi.fn(),
  })
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('vite.config.ts: generateSW precache manifest for the app shell', () => {
  const viteConfigSource = readFileSync('vite.config.ts', 'utf8')

  it('registers vite-plugin-pwa using the generateSW strategy (not injectManifest)', () => {
    expect(viteConfigSource).toMatch(/from ['"]vite-plugin-pwa['"]/)
    expect(viteConfigSource).toMatch(/VitePWA\(/)
    expect(viteConfigSource).not.toMatch(/injectManifest/)
  })

  it('controls the update prompt itself instead of auto-reloading silently', () => {
    // registerType: 'prompt' + injectRegister: false hands lifecycle control to
    // our own registerSW.tsx module (onNeedRefresh/onOfflineReady), instead of
    // vite-plugin-pwa's default silent auto-update.
    expect(viteConfigSource).toMatch(/registerType:\s*['"]prompt['"]/)
  })
})

describe('usePwaLifecycle: exposes the update-prompt lifecycle', () => {
  it('reflects needRefresh from the generated hook', () => {
    mockLifecycle({ needRefresh: true, offlineReady: false })
    const { result } = renderHook(() => usePwaLifecycle())
    expect(result.current.needRefresh).toBe(true)
    expect(result.current.offlineReady).toBe(false)
  })

  it('reflects offlineReady from the generated hook (distinct state, triangulation)', () => {
    mockLifecycle({ needRefresh: false, offlineReady: true })
    const { result } = renderHook(() => usePwaLifecycle())
    expect(result.current.needRefresh).toBe(false)
    expect(result.current.offlineReady).toBe(true)
  })

  it('exposes updateServiceWorker from the generated hook', () => {
    const updateServiceWorker = vi.fn().mockResolvedValue(undefined)
    mockLifecycle({ updateServiceWorker })
    const { result } = renderHook(() => usePwaLifecycle())
    expect(result.current.updateServiceWorker).toBe(updateServiceWorker)
  })
})

describe('PwaStatus: cached route renders queued/offline state, never a raw network error', () => {
  it('renders nothing when online and no update is pending', () => {
    mockLifecycle({ offlineReady: true })
    const { container } = renderWithI18n(createElement(PwaStatus))
    expect(container).toBeEmptyDOMElement()
  })

  it('renders an offline-queued notice instead of a network error once the shell is precached and offline', () => {
    mockLifecycle({ offlineReady: true })
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false)
    renderWithI18n(createElement(PwaStatus))
    const notice = screen.getByRole('status')
    expect(notice).toHaveTextContent(i18n.t('app.pwa.offlineTitle'))
    expect(screen.queryByText(/network error/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/failed to fetch/i)).not.toBeInTheDocument()
  })

  it('renders one primary update action when a new version is available', async () => {
    const updateServiceWorker = vi.fn().mockResolvedValue(undefined)
    mockLifecycle({ needRefresh: true, updateServiceWorker })
    renderWithI18n(createElement(PwaStatus))
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(1)
    await userEvent.click(buttons[0])
    expect(updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('prioritizes the update prompt over the offline notice when both are true', () => {
    mockLifecycle({ needRefresh: true, offlineReady: true })
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false)
    renderWithI18n(createElement(PwaStatus))
    expect(screen.getByText(i18n.t('app.pwa.updateTitle'))).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('app.pwa.offlineTitle'))).not.toBeInTheDocument()
  })
})
