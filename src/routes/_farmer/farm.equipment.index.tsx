import { createFileRoute } from '@tanstack/react-router'

import { Placeholder } from '@/app/Placeholder'

export const Route = createFileRoute('/_farmer/farm/equipment/')({
  component: () => <Placeholder route="/farm/equipment" tier="tier 3" />,
})
