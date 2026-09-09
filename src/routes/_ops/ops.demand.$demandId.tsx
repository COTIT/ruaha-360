import { createFileRoute } from '@tanstack/react-router'

import { Placeholder } from '@/app/Placeholder'

export const Route = createFileRoute('/_ops/ops/demand/$demandId')({
  component: () => <Placeholder route="/ops/demand/$demandId" tier="tier 5" />,
})
