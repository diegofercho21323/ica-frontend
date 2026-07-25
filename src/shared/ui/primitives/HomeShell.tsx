import { Alert, Layout, Typography } from 'antd'
import { useTranslation } from 'react-i18next'

export function HomeShell() {
  const { t } = useTranslation()

  return (
    <Layout>
      <Layout.Header>
        <Typography.Text>{t('app.title')}</Typography.Text>
      </Layout.Header>
      <Layout.Content>
        <main>
          <Typography.Title level={1}>{t('app.description')}</Typography.Title>
          <Typography.Paragraph>{t('app.foundation')}</Typography.Paragraph>
          <Alert message={t('app.demoNotice')} type="info" showIcon />
        </main>
      </Layout.Content>
    </Layout>
  )
}
