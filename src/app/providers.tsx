import { ConfigProvider } from 'antd'
import { QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { I18nextProvider } from 'react-i18next'
import { i18n } from './i18n/config'
import { createQueryClient } from '../shared/lib/query'
import { SessionProvider } from '../features/access/SessionContext'
import { theme } from './theme'
import { InventoryApiProvider, resolveInventoryApi } from './inventory'

const queryClient = createQueryClient()
const inventoryApi = resolveInventoryApi()

export function Providers({ children }: PropsWithChildren) {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={theme}>
          <InventoryApiProvider api={inventoryApi}>
            <SessionProvider>{children}</SessionProvider>
          </InventoryApiProvider>
        </ConfigProvider>
      </QueryClientProvider>
    </I18nextProvider>
  )
}
