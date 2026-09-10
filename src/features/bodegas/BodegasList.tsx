import { useMutation, useQuery } from '@tanstack/react-query'
import { Alert, Button, Card, List, Radio, Typography } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { mockInventoryApi } from '../../shared/api/inventory/mock'
import type { AttemptMode } from '../../shared/api/inventory/models'

export function BodegasList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [mode, setMode] = useState<AttemptMode>('guided')
  const [startError, setStartError] = useState<string | null>(null)
  const { data, isError, isPending } = useQuery({
    queryKey: ['scopes'],
    queryFn: () => mockInventoryApi.listScopes(),
  })
  const startMutation = useMutation({
    mutationFn: (scopeId: string) => mockInventoryApi.startAttempt(scopeId, mode),
    onSuccess: (attempt) => {
      setStartError(null)
      void navigate(`/capture/${attempt.id}`)
    },
    onError: () => {
      setStartError(t('attempt.startError'))
    },
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
      <Radio.Group
        aria-label={t('attempt.modeLabel')}
        value={mode}
        onChange={(event) => setMode(event.target.value as AttemptMode)}
        options={[
          { value: 'guided', label: t('attempt.modeGuided') },
          { value: 'manual', label: t('attempt.modeManual') },
        ]}
      />
      {startError ? (
        <Alert message={startError} role="alert" type="error" />
      ) : null}
      <List
        dataSource={scopes}
        grid={{ gutter: 16, xs: 1, sm: 2, lg: 3 }}
        renderItem={(scope) => (
          <List.Item key={scope.id}>
            <Card>
              {scope.name}
              <div>
                <Button
                  type="primary"
                  loading={startMutation.isPending}
                  onClick={() => startMutation.mutate(scope.id)}
                >
                  {startMutation.isPending
                    ? t('attempt.starting')
                    : t('attempt.start')}
                </Button>
              </div>
            </Card>
          </List.Item>
        )}
      />
    </section>
  )
}
