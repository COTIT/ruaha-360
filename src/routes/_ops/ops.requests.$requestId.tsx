import { createFileRoute } from '@tanstack/react-router'

import { OpsRequestReviewScreen } from '@/features/ops/OpsRequestReviewScreen'

export const Route = createFileRoute('/_ops/ops/requests/$requestId')({
  component: OpsRequestReviewScreen,
})
