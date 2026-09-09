import { createFileRoute } from '@tanstack/react-router'

import { Placeholder } from '@/app/Placeholder'

export const Route = createFileRoute('/_ops/ops/tower/market')({
  component: () => <Placeholder route="/ops/tower/market" tier="tier 6" />,
})
