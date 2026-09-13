import { LockOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Typography } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSession } from './SessionContext'

type FormErrors = { username?: string; password?: string; form?: string }

export function LoginForm() {
  const { t } = useTranslation()
  const { login } = useSession()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [pending, setPending] = useState(false)

  const submit = async () => {
    const next: FormErrors = {}
    if (username.trim().length === 0) next.username = t('access.usernameRequired')
    if (password.length === 0) next.password = t('access.passwordRequired')
    setErrors(next)
    if (next.username !== undefined || next.password !== undefined) return
    setPending(true)
    try {
      await login({ username: username.trim(), password })
      setErrors({})
    } catch {
      setErrors({ form: t('access.invalid') })
    } finally {
      setPending(false)
    }
  }

  return (
    <section
      aria-labelledby="access-title"
      className="flex justify-center pt-6 sm:pt-12"
    >
      <Card variant="borderless" className="w-full max-w-md shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="bg-primary flex h-11 w-11 items-center justify-center rounded-full text-lg text-white">
            <LockOutlined aria-hidden />
          </span>
          <Typography.Title id="access-title" level={2} className="!mb-0">
            {t('access.title')}
          </Typography.Title>
        </div>
        <Form layout="vertical" onFinish={() => void submit()}>
          <Form.Item
            label={t('access.username')}
            htmlFor="access-username"
            validateStatus={errors.username ? 'error' : undefined}
            help={errors.username}
          >
            <Input
              id="access-username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </Form.Item>
          <Form.Item
            label={t('access.password')}
            htmlFor="access-password"
            validateStatus={errors.password ? 'error' : undefined}
            help={errors.password}
          >
            <Input.Password
              id="access-password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Form.Item>
          {errors.form ? (
            <Alert role="alert" type="error" message={errors.form} className="mb-4" />
          ) : null}
          <Form.Item className="!mb-0">
            <Button
              type="primary"
              htmlType="submit"
              loading={pending}
              block
              size="large"
            >
              {t('access.submit')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </section>
  )
}
