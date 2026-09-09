import { createRootRouteWithContext } from '@tanstack/react-router'

import { RootLayout } from '@/app/RootLayout'
import type { RouterContext } from '@/app/router'

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})
