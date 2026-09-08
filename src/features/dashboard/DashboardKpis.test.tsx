import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import i18n from 'i18next'
import type { PropsWithChildren } from 'react'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { describe, expect, it } from 'vitest'
import { KpiCard } from '../../shared/ui/primitives/KpiCard'
import { DashboardKpis } from './DashboardKpis'

void i18n.use(initReactI18next).init({
  resources: {
    es: {
      translation: {
        app: {
          kpiTotal: 'Total de SKUs',
          kpiCounted: 'Contadas',
          kpiPending: 'Pendientes',
          kpiProgress: 'Avance',
        },
      },
    },
  },
  lng: 'es',
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
})

function Providers({ children }: PropsWithChildren) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </I18nextProvider>
  )
}

describe('KpiCard', () => {
  it('renders label, value, and unit via Statistic', () => {
    render(<KpiCard label="Total SKUs" value="5" unit="SKUs" />, { wrapper: Providers })
    expect(screen.getByText('Total SKUs')).toBeVisible()
    expect(screen.getByText('5')).toBeVisible()
    expect(screen.getByText('SKUs')).toBeVisible()
  })

  it('exposes an aria-busy loading state without business logic', () => {
    const { container } = render(<KpiCard label="Avance" value="60" unit="%" loading />, {
      wrapper: Providers,
    })
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })
})

describe('DashboardKpis', () => {
  it('renders 4 cards with exact 5/3/2/60 values from the fixture', async () => {
    render(<DashboardKpis />, { wrapper: Providers })
    expect(await screen.findByText('5')).toBeVisible()
    expect(screen.getByText('3')).toBeVisible()
    expect(screen.getByText('2')).toBeVisible()
    expect(screen.getByText('60')).toBeVisible()
    expect(screen.getByText(i18n.t('app.kpiTotal'))).toBeVisible()
    expect(screen.getByText(i18n.t('app.kpiCounted'))).toBeVisible()
    expect(screen.getByText(i18n.t('app.kpiPending'))).toBeVisible()
    expect(screen.getByText(i18n.t('app.kpiProgress'))).toBeVisible()
  })

  it('lays out cards in a responsive 1→2→4 grid via AntD Row/Col', async () => {
    const { container } = render(<DashboardKpis />, { wrapper: Providers })
    await screen.findByText('5')
    const row = container.querySelector('section .ant-row')
    expect(row).not.toBeNull()
    const cols = container.querySelectorAll('section .ant-col')
    expect(cols).toHaveLength(4)
    for (const col of Array.from(cols)) {
      expect(col.className).toContain('ant-col-xs-24')
      expect(col.className).toContain('ant-col-sm-12')
      expect(col.className).toContain('ant-col-lg-6')
    }
  })
})
