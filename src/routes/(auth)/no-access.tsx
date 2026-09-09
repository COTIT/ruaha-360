import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { signOut } from '@/app/session'

// A real screen with a next step, never a blank page or a crash (spec 4.4).
export const Route = createFileRoute('/(auth)/no-access')({
  component: NoAccessScreen,
})

function NoAccessScreen() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return (
    <section className="mx-auto max-w-md space-y-3" data-testid="no-access">
      <h1 className="text-lg font-semibold">{t('noAccess.title')}</h1>
      <p className="text-sm text-deep/70">{t('noAccess.detail')}</p>
      <button
        type="button"
        data-testid="sign-out"
        className="rounded border border-deep/20 px-3 py-2 text-sm font-medium"
        onClick={async () => {
          await signOut(queryClient)
          await navigate({ to: '/login', replace: true })
        }}
      >
        {t('noAccess.signOut')}
      </button>
    </section>
  )
}
