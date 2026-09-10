import { createFileRoute } from '@tanstack/react-router'

import { OpsRequestsScreen } from '@/features/ops/OpsRequestsScreen'
import { validateRequestSearch } from '@/features/ops/requestSearch'

export const Route = createFileRoute('/_ops/ops/requests/')({
  // Spec 7.2: filter state lives in the URL as VALIDATED search params, so a
  // stale bookmark degrades to the unfiltered view instead of breaking.
  validateSearch: validateRequestSearch,
  component: OpsRequestsScreen,
})
