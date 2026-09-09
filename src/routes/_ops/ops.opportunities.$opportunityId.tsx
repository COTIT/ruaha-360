import { createFileRoute } from '@tanstack/react-router'

import { Placeholder } from '@/app/Placeholder'

export const Route = createFileRoute('/_ops/ops/opportunities/$opportunityId')({
  component: () => <Placeholder route="/ops/opportunities/$opportunityId" tier="tier 5" />,
})
