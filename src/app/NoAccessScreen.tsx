import { useTranslation } from 'react-i18next'

import { SignOutButton } from '@/app/SignOutButton'

// A real screen with a next step, never a blank page or a crash (spec 4.4).
export function NoAccessScreen() {
  const { t } = useTranslation()

  return (
    <section className="mx-auto max-w-md space-y-3" data-testid="no-access">
      <h1 className="text-lg font-semibold">{t('noAccess.title')}</h1>
      <p className="text-sm text-deep/70">{t('noAccess.detail')}</p>
      <SignOutButton className="rounded border border-deep/20 px-3 py-2 text-sm font-medium disabled:opacity-60" />
    </section>
  )
}
