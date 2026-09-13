import { createBrowserRouter } from 'react-router'
import type { RouteObject } from 'react-router'
import {
  LoginPage,
  DashboardPage,
  BodegasPage,
  CapturePage,
  AttemptCapturePage,
  ReviewPage,
  AdminUsersPage,
  AdminWarehousesPage,
  AdminBaselinePage,
  AdminAssignmentsPage,
} from '../pages/screens'
import { RequireAuth } from '../features/access/RequireAuth'
import { RequireAdminRoute } from './RequireAdminRoute'
import { SessionAwareShell } from './SessionAwareShell'

// Exported separately from `router` so tests can feed the same route tree
// into `createMemoryRouter` instead of the DOM-history `createBrowserRouter`.
export const routeConfig: RouteObject[] = [
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
      // Sibling of the `RequireAuth`-gated layout route, not nested inside
      // it: `RequireAdminRoute` is its own gate (admin-console F1-PR1),
      // wired once at the subtree root rather than per screen.
      {
        path: 'admin',
        Component: RequireAdminRoute,
        children: [
          { path: 'users', Component: AdminUsersPage },
          { path: 'warehouses', Component: AdminWarehousesPage },
          { path: 'baseline', Component: AdminBaselinePage },
          { path: 'assignments', Component: AdminAssignmentsPage },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routeConfig)
