import { createFileRoute } from '@tanstack/react-router'

import { Placeholder } from '@/app/Placeholder'

export const Route = createFileRoute('/_officer/officer/farms/$farmId')({
  component: () => <Placeholder route="/officer/farms/$farmId" tier="tier 2" />,
})
