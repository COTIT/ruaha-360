import { createFileRoute } from '@tanstack/react-router'

import { Placeholder } from '@/app/Placeholder'

export const Route = createFileRoute('/(auth)/select-role')({
  component: () => <Placeholder route="/select-role" tier="tier 1" />,
})
