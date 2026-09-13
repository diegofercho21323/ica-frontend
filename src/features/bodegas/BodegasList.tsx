import { PlayCircleOutlined, ShopOutlined } from '@ant-design/icons'
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
      void navigate(`/capture/${attempt.id}?mode=${attempt.mode}`)
    },
    onError: () => {
      setStartError(t('attempt.startError'))
    },
  })

  const titleHeading = (
    <Typography.Title level={3} className="!mb-0 flex items-center gap-2">
      <ShopOutlined aria-hidden />
      {t('app.warehouses')}
    </Typography.Title>
  )

  if (isPending) {
    return (
      <section aria-busy="true" className="flex flex-col gap-4">
        {titleHeading}
        <div role="status">{t('app.loadingPlaceholder')}</div>
      </section>
    )
  }

  if (isError) {
    return (
      <section className="flex flex-col gap-4">
        {titleHeading}
        <Alert message={t('app.warehousesError')} role="alert" type="error" showIcon />
      </section>
    )
  }

  const scopes = data ?? []

  if (scopes.length === 0) {
    return (
      <section className="flex flex-col gap-4">
        {titleHeading}
        <div role="status">{t('app.emptyWarehouses')}</div>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      {titleHeading}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-on-surface-secondary m-0 text-sm">
          {t('app.warehousesCount', { count: scopes.length })}
        </p>
        <Radio.Group
          aria-label={t('attempt.modeLabel')}
          optionType="button"
          buttonStyle="solid"
          value={mode}
          onChange={(event) => setMode(event.target.value as AttemptMode)}
          options={[
            { value: 'guided', label: t('attempt.modeGuided') },
            { value: 'manual', label: t('attempt.modeManual') },
          ]}
        />
      </div>
      {startError ? (
        <Alert message={startError} role="alert" type="error" showIcon />
      ) : null}
      <List
        dataSource={scopes}
        grid={{ gutter: 16, xs: 1, sm: 2, lg: 3 }}
        renderItem={(scope) => (
          <List.Item key={scope.id}>
            <Card variant="borderless" className="shadow-sm">
              <div className="flex flex-col gap-3">
                <Typography.Text strong className="text-base">
                  {scope.name}
                </Typography.Text>
                <Button
                  type="primary"
                  block
                  icon={<PlayCircleOutlined aria-hidden />}
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
