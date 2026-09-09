import { createFileRoute } from '@tanstack/react-router'

import { Placeholder } from '@/app/Placeholder'

export const Route = createFileRoute('/_officer/officer/cycles/$cycleId')({
  component: () => <Placeholder route="/officer/cycles/$cycleId" tier="tier 2" />,
})
