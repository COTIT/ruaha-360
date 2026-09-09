import { createFileRoute } from '@tanstack/react-router'

import { Placeholder } from '@/app/Placeholder'

export const Route = createFileRoute('/_farmer/farm/opportunities')({
  component: () => <Placeholder route="/farm/opportunities" tier="tier 5" />,
})
