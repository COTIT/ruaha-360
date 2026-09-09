import { useTranslation } from 'react-i18next'

import { isDemoData } from '@/lib/supabase'

/**
 * Driven by VITE_DATA_MODE, never by a database column: the demo instance and
 * any future live instance are different databases, so there is no is_demo
 * flag to read.
 */
export function DemoBanner() {
  const { t } = useTranslation()
  if (!isDemoData) return null

  return (
    <div
      data-testid="demo-banner"
      className="bg-accent px-4 py-1.5 text-center text-xs font-medium text-accent-foreground"
    >
      <span className="font-semibold">{t('demoBanner.label')}</span>
      {' — '}
      {t('demoBanner.detail')}
    </div>
  )
}
