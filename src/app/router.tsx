import { createBrowserRouter } from 'react-router'
import { HomeShell } from '../shared/ui/primitives/HomeShell'

export const router = createBrowserRouter([{ path: '/', Component: HomeShell }])
