import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { routeTree } from '@/routeTree.gen'
import '@/i18n'

// The one smoke test for session 1: the route tree compiles, the shell mounts
// and a placeholder route resolves. Real coverage arrives with the features.
test('app shell renders and /ops/tower resolves', async () => {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/ops/tower'] }),
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router as never} />
    </QueryClientProvider>,
  )

  expect(await screen.findByText('Ruaha 360')).toBeInTheDocument()
  expect(await screen.findByText(/Control Tower/)).toBeInTheDocument()
})
