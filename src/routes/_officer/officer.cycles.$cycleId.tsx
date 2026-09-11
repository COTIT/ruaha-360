import { createFileRoute } from '@tanstack/react-router'

import { OfficerCycleScreen } from '@/features/officer/OfficerRecordScreens'

export const Route = createFileRoute('/_officer/officer/cycles/$cycleId')({
  component: OfficerCycleScreen,
})
