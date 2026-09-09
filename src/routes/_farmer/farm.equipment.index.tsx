import { createFileRoute } from '@tanstack/react-router'

import { EquipmentListScreen } from '@/features/farmer/EquipmentListScreen'

export const Route = createFileRoute('/_farmer/farm/equipment/')({
  component: EquipmentListScreen,
})
