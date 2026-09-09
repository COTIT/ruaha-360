import { createFileRoute } from '@tanstack/react-router'

import { Placeholder } from '@/app/Placeholder'

export const Route = createFileRoute('/_officer/officer/people/')({
  component: () => <Placeholder route="/officer/people" tier="tier 2" />,
})
