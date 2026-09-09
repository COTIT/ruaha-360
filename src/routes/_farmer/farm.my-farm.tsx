import { createFileRoute } from '@tanstack/react-router'

import { Placeholder } from '@/app/Placeholder'

export const Route = createFileRoute('/_farmer/farm/my-farm')({
  component: () => <Placeholder route="/farm/my-farm" tier="tier 3" />,
})
