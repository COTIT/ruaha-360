import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_farmer/farm/requests')({
  component: () => <Outlet />,
})
