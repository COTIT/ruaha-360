import { createFileRoute } from '@tanstack/react-router'

import { Placeholder } from '@/app/Placeholder'

export const Route = createFileRoute('/(auth)/login')({
  component: () => <Placeholder route="/login" tier="tier 1" />,
})
