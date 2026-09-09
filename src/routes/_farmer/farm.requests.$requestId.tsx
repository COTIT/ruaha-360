import { createFileRoute } from '@tanstack/react-router'

import { RequestDetailScreen } from '@/features/farmer/RequestDetailScreen'

export const Route = createFileRoute('/_farmer/farm/requests/$requestId')({
  component: RequestDetailScreen,
})
