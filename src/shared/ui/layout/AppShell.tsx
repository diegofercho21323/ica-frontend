import {
  DashboardOutlined,
  LoginOutlined,
  QrcodeOutlined,
  ShopOutlined,
} from '@ant-design/icons'
import { Button, Drawer, Grid, Layout, Menu, Typography } from 'antd'
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'

const HEADER_HEIGHT = 64

function pathnameToKey(pathname: string): string {
  if (pathname.startsWith('/dashboard')) return 'dashboard'
  if (pathname.startsWith('/bodegas')) return 'warehouses'
  if (pathname.startsWith('/capture')) return 'capture'
  // Review/recount nest under the capture flow but have no nav item of
  // their own — no menu key means no item gets falsely highlighted.
  if (pathname.startsWith('/attempts')) return 'review'
  return 'login'
}

export function AppShell({
  headerActions,
  authenticated = false,
}: {
  headerActions?: ReactNode
  authenticated?: boolean
}) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  // Single menu per viewport: rail owns ≥lg, drawer owns <lg.
  // useBreakpoint resolves in a layout effect before paint, so there is
  // no flash of the trigger on desktop; in tests matchMedia is mocked
  // mobile-like (all false) and the trigger stays rendered.
  const screens = Grid.useBreakpoint()
  const showDrawerTrigger = !screens.lg
  const activeKey = pathnameToKey(pathname)
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(false)

  useEffect(() => {
    if (open) {
      wasOpen.current = true
    } else if (wasOpen.current) {
      wasOpen.current = false
      triggerRef.current?.focus()
    }
  }, [open])

  const close = () => setOpen(false)
  const handleSpaceActivate = (event: KeyboardEvent<HTMLAnchorElement>) => {
    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault()
      event.currentTarget.click()
    }
  }
  const navLink = (key: string, to: string, label: string) => (
    <Link
      to={to}
      aria-current={activeKey === key ? 'page' : undefined}
      onClick={close}
      onKeyDown={handleSpaceActivate}
    >
      {label}
    </Link>
  )
  // Post-login navigation: without a session only the brand and the login
  // entry are visible. The session itself lives in features/access, which
  // shared/ must not import (FSD), so the app shell receives it as a prop
  // from an app-layer wrapper (see src/app/router.tsx).
  const authedItems = [
    {
      key: 'login',
      icon: <LoginOutlined aria-hidden />,
      label: navLink('login', '/login', t('app.login')),
    },
    {
      key: 'dashboard',
      icon: <DashboardOutlined aria-hidden />,
      label: navLink('dashboard', '/dashboard', t('app.dashboard')),
    },
    {
      key: 'warehouses',
      icon: <ShopOutlined aria-hidden />,
      label: navLink('warehouses', '/bodegas', t('app.warehouses')),
    },
    {
      key: 'capture',
      icon: <QrcodeOutlined aria-hidden />,
      label: navLink('capture', '/capture', t('app.capture')),
    },
  ]
  const anonItems = [
    {
      key: 'login',
      icon: <LoginOutlined aria-hidden />,
      label: navLink('login', '/login', t('app.login')),
    },
  ]
  const navigation = (onNavigate?: () => void) => (
    <Menu
      mode="inline"
      selectedKeys={[activeKey]}
      onClick={onNavigate}
      items={authenticated ? authedItems : anonItems}
    />
  )
  return (
    <Layout>
      <Layout.Header
        className="flex items-center gap-3 px-4"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          height: HEADER_HEIGHT,
          lineHeight: `${HEADER_HEIGHT}px`,
        }}
      >
        {showDrawerTrigger && (
          <Button
            ref={triggerRef}
            aria-label={t('app.title')}
            onClick={() => setOpen(true)}
          >
            ☰
          </Button>
        )}
        <div className="flex flex-1 items-center gap-3">
          <span
            className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg font-bold text-white"
            aria-hidden
          >
            T
          </span>
          <span className="flex flex-col leading-none">
            <Typography.Text strong className="!leading-tight">
              {t('app.title')}
            </Typography.Text>
            <Typography.Text
              type="secondary"
              className="!text-[11px] uppercase tracking-wider"
            >
              {t('app.byDucore')}
            </Typography.Text>
          </span>
        </div>
        {headerActions ?? null}
      </Layout.Header>
      <Drawer
        open={open}
        placement="left"
        title={t('app.title')}
        onClose={close}
        extra={
          <Button aria-label={t('app.closeMenu')} onClick={close}>
            ✕
          </Button>
        }
      >
        <Typography.Title level={5}>{t('app.navPrimary')}</Typography.Title>
        <nav aria-label={t('app.navPrimary')}>{navigation(close)}</nav>
      </Drawer>
      <Layout hasSider>
        <Layout.Sider
          width={200}
          breakpoint="lg"
          collapsedWidth="0"
          trigger={null}
          theme="light"
        >
          <nav aria-label={t('app.title')}>{navigation()}</nav>
        </Layout.Sider>
        <Layout.Content
          style={{
            paddingTop: 16,
            paddingLeft: 16,
            paddingRight: 16,
            overflowX: 'clip',
          }}
        >
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  )
}
