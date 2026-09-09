import { createFileRoute } from '@tanstack/react-router'

import { Placeholder } from '@/app/Placeholder'

export const Route = createFileRoute('/_ops/ops/villages')({
  component: () => <Placeholder route="/ops/villages" tier="tier 5" />,
})
