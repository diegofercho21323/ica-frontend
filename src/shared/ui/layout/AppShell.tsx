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
    { key: 'login', label: navLink('login', '/login', t('app.login')) },
    {
      key: 'dashboard',
      label: navLink('dashboard', '/dashboard', t('app.dashboard')),
    },
    {
      key: 'warehouses',
      label: navLink('warehouses', '/bodegas', t('app.warehouses')),
    },
    {
      key: 'capture',
      label: navLink('capture', '/capture', t('app.capture')),
    },
  ]
  const anonItems = [
    { key: 'login', label: navLink('login', '/login', t('app.login')) },
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
        <Typography.Text>{t('app.title')}</Typography.Text>
        {headerActions ? <span className="ml-4">{headerActions}</span> : null}
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
