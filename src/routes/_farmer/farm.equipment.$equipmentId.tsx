import { createFileRoute } from '@tanstack/react-router'

import { Placeholder } from '@/app/Placeholder'

export const Route = createFileRoute('/_farmer/farm/equipment/$equipmentId')({
  component: () => <Placeholder route="/farm/equipment/$equipmentId" tier="tier 3" />,
})
