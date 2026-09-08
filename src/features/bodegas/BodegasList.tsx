import { useQuery } from '@tanstack/react-query'
import { Alert, Card, List, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { mockInventoryApi } from '../../shared/api/inventory/mock'

export function BodegasList() {
  const { t } = useTranslation()
  const { data, isError, isPending } = useQuery({
    queryKey: ['scopes'],
    queryFn: () => mockInventoryApi.listScopes(),
  })

  if (isPending) {
    return (
      <section aria-busy="true">
        <Typography.Title>{t('app.warehouses')}</Typography.Title>
        <div role="status">{t('app.loadingPlaceholder')}</div>
      </section>
    )
  }

  if (isError) {
    return (
      <section>
        <Typography.Title>{t('app.warehouses')}</Typography.Title>
        <Alert message={t('app.warehousesError')} role="alert" type="error" />
      </section>
    )
  }

  const scopes = data ?? []

  if (scopes.length === 0) {
    return (
      <section>
        <Typography.Title>{t('app.warehouses')}</Typography.Title>
        <div role="status">{t('app.emptyWarehouses')}</div>
      </section>
    )
  }

  return (
    <section>
      <Typography.Title>{t('app.warehouses')}</Typography.Title>
      <p>{t('app.warehousesCount', { count: scopes.length })}</p>
      <List
        dataSource={scopes}
        grid={{ gutter: 16, xs: 1, sm: 2, lg: 3 }}
        renderItem={(scope) => (
          <List.Item key={scope.id}>
            <Card>{scope.name}</Card>
          </List.Item>
        )}
      />
    </section>
  )
}
