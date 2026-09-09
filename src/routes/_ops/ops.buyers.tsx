import { createFileRoute } from '@tanstack/react-router'

import { Placeholder } from '@/app/Placeholder'

export const Route = createFileRoute('/_ops/ops/buyers')({
  component: () => <Placeholder route="/ops/buyers" tier="tier 5" />,
})
