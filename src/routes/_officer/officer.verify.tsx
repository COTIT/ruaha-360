import { createFileRoute } from '@tanstack/react-router'

import { Placeholder } from '@/app/Placeholder'

export const Route = createFileRoute('/_officer/officer/verify')({
  component: () => <Placeholder route="/officer/verify" tier="tier 2" />,
})
