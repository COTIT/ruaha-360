import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_ops/ops/demand')({
  component: () => <Outlet />,
})
