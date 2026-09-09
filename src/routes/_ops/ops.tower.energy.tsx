import { createFileRoute } from '@tanstack/react-router'

import { Placeholder } from '@/app/Placeholder'

export const Route = createFileRoute('/_ops/ops/tower/energy')({
  component: () => <Placeholder route="/ops/tower/energy" tier="tier 6" />,
})
