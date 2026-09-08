import { Button } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useSession } from './SessionContext'

export function LogoutButton() {
  const { t } = useTranslation()
  const { session, status, logout } = useSession()
  const navigate = useNavigate()

  if (status !== 'ready' || session === null) return null

  const handleLogout = () => {
    void logout().then(() => {
      void navigate('/login')
    })
  }

  return <Button onClick={handleLogout}>{t('access.logout')}</Button>
}
