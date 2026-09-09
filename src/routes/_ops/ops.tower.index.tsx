import { createFileRoute } from '@tanstack/react-router'

import { Placeholder } from '@/app/Placeholder'

export const Route = createFileRoute('/_ops/ops/tower/')({
  component: () => <Placeholder route="/ops/tower — overview" tier="tier 6" />,
})
