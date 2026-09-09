import { createFileRoute } from '@tanstack/react-router'

import { Placeholder } from '@/app/Placeholder'

export const Route = createFileRoute('/_farmer/farm/')({
  component: () => <Placeholder route="/farm — home" tier="tier 3" />,
})
