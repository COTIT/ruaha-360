import { createFileRoute } from '@tanstack/react-router'

import { Placeholder } from '@/app/Placeholder'

export const Route = createFileRoute('/_officer/officer')({
  component: () => <Placeholder route="/officer — officer surface" tier="tier 2" />,
})
