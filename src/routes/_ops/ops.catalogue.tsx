import { createFileRoute } from '@tanstack/react-router'

import { Placeholder } from '@/app/Placeholder'

export const Route = createFileRoute('/_ops/ops/catalogue')({
  component: () => <Placeholder route="/ops/catalogue" tier="tier 4" />,
})
