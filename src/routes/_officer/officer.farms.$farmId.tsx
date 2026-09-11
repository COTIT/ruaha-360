import { createFileRoute } from '@tanstack/react-router'

import { OfficerFarmScreen } from '@/features/officer/OfficerRecordScreens'

export const Route = createFileRoute('/_officer/officer/farms/$farmId')({
  component: OfficerFarmScreen,
})
