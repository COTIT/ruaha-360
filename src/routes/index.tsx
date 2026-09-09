import { createFileRoute, redirect } from '@tanstack/react-router'

import { resolveLanding } from '@/app/membership'
import { ensureSession } from '@/app/session'

export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    const session = await ensureSession(context.queryClient)
    if (!session) throw redirect({ to: '/login' })
    throw redirect({ to: resolveLanding(session.memberships).to, replace: true })
  },
})
