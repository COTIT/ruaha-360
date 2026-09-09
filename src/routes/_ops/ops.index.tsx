import { createFileRoute } from '@tanstack/react-router'

import { Placeholder } from '@/app/Placeholder'

export const Route = createFileRoute('/_ops/ops/')({
  component: () => <Placeholder route="/ops — ops surface" tier="tier 4/5" />,
})
