import { createFileRoute } from '@tanstack/react-router'

import { Placeholder } from '@/app/Placeholder'

export const Route = createFileRoute('/_officer/officer/people/$personId')({
  component: () => <Placeholder route="/officer/people/$personId" tier="tier 2" />,
})
