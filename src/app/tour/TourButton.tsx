import { useTranslation } from 'react-i18next'

import { BUTTON_SECONDARY } from '@/components/controlStyles'
import { useTour } from '@/app/tour/tourContext'

/**
 * The way back to the tour.
 *
 * In the header rather than on a screen: the tours cross screens, and a control
 * that appears on only one of them is one nobody finds twice. Labelled rather
 * than an icon alone — the same rule the nav follows, for the same reason.
 */
export function TourButton() {
  const { t } = useTranslation()
  const { start, available } = useTour()

  if (!available) return null

  return (
    <button
      type="button"
      data-testid="tour-restart"
      onClick={start}
      style={{ ...BUTTON_SECONDARY, fontSize: 14, padding: '8px 12px' }}
    >
      {t('tour.restart')}
    </button>
  )
}
