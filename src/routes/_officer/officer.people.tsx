import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_officer/officer/people')({
  component: () => <Outlet />,
})
