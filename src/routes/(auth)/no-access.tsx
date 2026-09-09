import { createFileRoute } from '@tanstack/react-router'

import { Placeholder } from '@/app/Placeholder'

export const Route = createFileRoute('/(auth)/no-access')({
  component: () => <Placeholder route="/no-access" tier="tier 1" />,
})
