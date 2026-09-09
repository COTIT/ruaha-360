import { createFileRoute } from '@tanstack/react-router'

import { SelectRoleScreen } from '@/app/SelectRoleScreen'

export const Route = createFileRoute('/(auth)/select-role')({
  component: SelectRoleScreen,
})
