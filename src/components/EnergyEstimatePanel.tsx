import { useTranslation } from 'react-i18next'

import { computeEstimate } from '@/features/farmer/energyEstimate'
import { formatKw, formatKwh } from '@/lib/format'

export interface EnergyEstimatePanelProps {
  ratedPowerKw: number
  quantity: number
  hoursPerDay: number
  daysPerWeek: number
}

/**
 * Shows the inputs, the arithmetic and the outputs — spec §9.1.
 *
 * Mirrors energy_estimate's generated columns exactly. If the two ever
 * disagree, this component is wrong. It is a PREVIEW only: the stored figure
 * is written by pue_recompute_estimate, which is the sole writer of
 * energy_estimate — clients hold no write policy on it at all.
 *
 * Always labelled an estimate. It is not measured consumption and not a
 * commitment.
 */
export function EnergyEstimatePanel({
  ratedPowerKw,
  quantity,
  hoursPerDay,
  daysPerWeek,
}: EnergyEstimatePanelProps) {
  const { t } = useTranslation()
  const estimate = computeEstimate({ ratedPowerKw, quantity, hoursPerDay, daysPerWeek })

  const shown = (value: number) => (Number.isFinite(value) ? value : 0)

  return (
    <section
      data-testid="estimate-panel"
      className="space-y-3 rounded border border-dashed border-deep/30 bg-white/60 p-4"
    >
      <header className="space-y-1">
        <h3 className="text-sm font-semibold">{t('estimate.title')}</h3>
        <p className="text-xs font-medium text-deep/70">{t('estimate.isEstimate')}</p>
        <p data-testid="estimate-basis" className="text-xs text-deep/60">
          {t('estimate.basis')}
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <Item label={t('estimate.ratedPower')} testId="estimate-rated-power">
          {formatKw(ratedPowerKw)}
        </Item>
        <Item label={t('estimate.quantity')} testId="estimate-quantity">
          {String(shown(quantity))}
        </Item>
        <Item label={t('estimate.hours')} testId="estimate-hours">
          {String(shown(hoursPerDay))}
        </Item>
        <Item label={t('estimate.days')} testId="estimate-days">
          {String(shown(daysPerWeek))}
        </Item>
      </dl>

      <dl className="grid gap-y-1 border-t border-deep/10 pt-3 text-sm">
        <Item label={t('estimate.peak')} testId="estimate-power" strong>
          {formatKw(estimate.estPowerKw)}
        </Item>
        <Item label={t('estimate.perDay')} testId="estimate-kwh-day" strong>
          {formatKwh(estimate.estKwhPerDay)}
        </Item>
        <Item label={t('estimate.perWeek')} testId="estimate-kwh-week" strong>
          {formatKwh(estimate.estKwhPerWeek)}
        </Item>
      </dl>

      <p className="text-xs text-deep/60">{t('estimate.peakNote')}</p>
    </section>
  )
}

function Item({
  label,
  testId,
  children,
  strong,
}: {
  label: string
  testId: string
  children: React.ReactNode
  strong?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-deep/60">{label}</dt>
      {/* tabular-nums wherever figures stack (spec §14). */}
      <dd data-testid={testId} className={`tabular ${strong ? 'font-medium' : ''}`}>
        {children}
      </dd>
    </div>
  )
}
