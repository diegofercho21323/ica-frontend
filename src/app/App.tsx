import { RouterProvider } from 'react-router'
import { PwaStatus } from './pwa/registerSW'
import { Providers } from './providers'
import { router } from './router'

export function App() {
  return (
    <Providers>
      <PwaStatus />
      <RouterProvider router={router} />
    </Providers>
  )
}
