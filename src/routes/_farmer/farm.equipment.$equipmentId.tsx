import { createFileRoute } from '@tanstack/react-router'

import { EquipmentDetailScreen } from '@/features/farmer/EquipmentDetailScreen'

export const Route = createFileRoute('/_farmer/farm/equipment/$equipmentId')({
  component: EquipmentDetailScreen,
})
