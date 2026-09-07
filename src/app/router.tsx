import { createBrowserRouter } from 'react-router'
import {
  LoginPage,
  DashboardPage,
  BodegasPage,
  CapturePlaceholderPage,
} from '../pages/screens'
import { AppShell } from '../shared/ui/layout/AppShell'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppShell,
    children: [
      { index: true, Component: LoginPage },
      { path: 'login', Component: LoginPage },
      { path: 'dashboard', Component: DashboardPage },
      { path: 'bodegas', Component: BodegasPage },
      { path: 'capture', Component: CapturePlaceholderPage },
    ],
  },
])
