import { createBrowserRouter } from 'react-router'
import {
  LoginPage,
  DashboardPage,
  BodegasPage,
  CapturePage,
} from '../pages/screens'
import { LogoutButton } from '../features/access/LogoutButton'
import { RequireAuth } from '../features/access/RequireAuth'
import { AppShell } from '../shared/ui/layout/AppShell'

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <AppShell headerActions={<LogoutButton />} />
    ),
    children: [
      { index: true, Component: LoginPage },
      { path: 'login', Component: LoginPage },
      {
        Component: RequireAuth,
        children: [
          { path: 'dashboard', Component: DashboardPage },
          { path: 'bodegas', Component: BodegasPage },
          { path: 'capture', Component: CapturePage },
        ],
      },
    ],
  },
])
