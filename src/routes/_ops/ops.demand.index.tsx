import { createFileRoute } from '@tanstack/react-router'

import { Placeholder } from '@/app/Placeholder'

export const Route = createFileRoute('/_ops/ops/demand/')({
  component: () => <Placeholder route="/ops/demand" tier="tier 5" />,
})
