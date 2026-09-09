import { createFileRoute } from '@tanstack/react-router'

import { Placeholder } from '@/app/Placeholder'

export const Route = createFileRoute('/_farmer/farm/requests/')({
  component: () => <Placeholder route="/farm/requests" tier="tier 3" />,
})
