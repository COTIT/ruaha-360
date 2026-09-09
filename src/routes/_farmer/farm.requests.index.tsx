import { createFileRoute } from '@tanstack/react-router'

import { RequestsListScreen } from '@/features/farmer/RequestsListScreen'

export const Route = createFileRoute('/_farmer/farm/requests/')({
  component: RequestsListScreen,
})
