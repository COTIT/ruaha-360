import { createFileRoute } from '@tanstack/react-router'

import { Placeholder } from '@/app/Placeholder'

export const Route = createFileRoute('/_farmer/farm/requests/$requestId')({
  component: () => <Placeholder route="/farm/requests/$requestId" tier="tier 3" />,
})
