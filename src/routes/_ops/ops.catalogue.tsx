import { createFileRoute } from '@tanstack/react-router'

import { CatalogueScreen } from '@/features/ops/CatalogueScreen'

export const Route = createFileRoute('/_ops/ops/catalogue')({
  component: CatalogueScreen,
})
