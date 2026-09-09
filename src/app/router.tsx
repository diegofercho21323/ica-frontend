import { createBrowserRouter } from 'react-router'
import {
  LoginPage,
  DashboardPage,
  BodegasPage,
  CapturePage,
  AttemptCapturePage,
  ReviewPage,
} from '../pages/screens'
import { RequireAuth } from '../features/access/RequireAuth'
import { SessionAwareShell } from './SessionAwareShell'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <SessionAwareShell />,
    children: [
      { index: true, Component: LoginPage },
      { path: 'login', Component: LoginPage },
      {
        Component: RequireAuth,
        children: [
          { path: 'dashboard', Component: DashboardPage },
          { path: 'bodegas', Component: BodegasPage },
          { path: 'capture', Component: CapturePage },
          { path: 'capture/:attemptId', Component: AttemptCapturePage },
          { path: 'attempts/:id/review', Component: ReviewPage },
        ],
      },
    ],
  },
])
