import { createFileRoute } from '@tanstack/react-router'

import { Placeholder } from '@/app/Placeholder'

export const Route = createFileRoute('/_officer/officer/register')({
  component: () => <Placeholder route="/officer/register" tier="tier 2" />,
})
