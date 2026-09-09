import { useState } from 'react'
import { Link, getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { activeMemberships, ownVillageId } from '@/app/membership'
import { useSession } from '@/app/session'
import { EmptyState } from '@/components/EmptyState'
import { EnergyEstimatePanel } from '@/components/EnergyEstimatePanel'
import { ErrorState } from '@/components/ErrorState'
import { useEquipmentItem } from '@/features/farmer/useEquipment'
import { useSubmitRequest } from '@/features/farmer/useRequests'
import { formatKw, formatMoney } from '@/lib/format'

const route = getRouteApi('/_farmer/farm/equipment/$equipmentId')

/**
 * Spec 6.4 — detail plus the request form, with a live estimate.
 *
 * The estimate shown here is a PREVIEW. pue_recompute_estimate writes the
 * stored row, and the request detail reads that stored figure rather than
 * recomputing — so the two can be compared instead of assumed equal.
 */
export function EquipmentDetailScreen() {
  const { equipmentId } = route.useParams()
  const { t } = useTranslation()
  const session = useSession()
  const query = useEquipmentItem(equipmentId)
  const submit = useSubmitRequest()

  const [quantity, setQuantity] = useState('1')
  const [hours, setHours] = useState('')
  const [days, setDays] = useState('')
  const [purpose, setPurpose] = useState('')
  const [prefilled, setPrefilled] = useState(false)

  const item = query.item

  // Prefilled from the equipment's typicals, once. Overwriting on every render
  // would fight the farmer as they type.
  if (item && !prefilled) {
    setHours(item.typical_hours_per_day === null ? '' : String(item.typical_hours_per_day))
    setDays(item.typical_days_per_week === null ? '' : String(item.typical_days_per_week))
    setPrefilled(true)
  }

  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  if (query.isLoading || session.isLoading) {
    return (
      <p data-testid="equipment-detail-loading" className="text-sm text-deep/60">
        {t('common.loading')}
      </p>
    )
  }

  // Zero rows is an answer: not listed, or outside this project's scope.
  if (!item) {
    return <EmptyState title={t('equipment.notFoundTitle')} detail={t('equipment.notFoundDetail')} />
  }

  const memberships = activeMemberships(session.data?.memberships ?? [])
  const villageId = ownVillageId(memberships)
  const personId = session.data?.appUser?.person_id ?? undefined

  if (submit.isSuccess) {
    return (
      <section className="space-y-3" data-testid="request-success">
        <h1 className="text-lg font-semibold">{t('equipment.successTitle')}</h1>
        <p className="text-sm text-deep/70">{t('equipment.successDetail')}</p>
        {submit.data?.id && (
          <Link
            to="/farm/requests/$requestId"
            params={{ requestId: submit.data.id }}
            data-testid="request-view"
            className="inline-block text-sm font-medium text-primary underline underline-offset-4"
          >
            {t('equipment.viewRequest')}
          </Link>
        )}
      </section>
    )
  }

  const canRequest = Boolean(villageId && personId)

  return (
    <section className="max-w-lg space-y-4" data-testid="equipment-detail">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">{item.name}</h1>
        <p className="text-xs text-deep/60">{item.category_name}</p>
        <p className="tabular text-sm">{formatKw(item.rated_power_kw)}</p>
        <p data-testid="equipment-price" className="tabular text-sm">
          {formatMoney(item.indicative_price, item.currency)}{' '}
          <span className="text-xs font-normal text-deep/60">({t('equipment.indicative')})</span>
        </p>
        <p className="text-xs text-deep/60">{t('equipment.notAQuotation')}</p>
      </header>

      <h2 className="text-sm font-semibold">{t('equipment.requestThis')}</h2>

      <div className="space-y-3">
        <NumberField
          label={t('equipment.quantity')}
          testId="request-quantity"
          value={quantity}
          onChange={setQuantity}
        />
        <NumberField
          label={t('equipment.hours')}
          testId="request-hours"
          value={hours}
          onChange={setHours}
        />
        <NumberField
          label={t('equipment.days')}
          testId="request-days"
          value={days}
          onChange={setDays}
        />
        <div className="space-y-1">
          <label className="block text-sm font-medium" htmlFor="request-purpose">
            {t('equipment.purpose')}
          </label>
          <textarea
            id="request-purpose"
            data-testid="request-purpose"
            rows={2}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="w-full rounded border border-deep/20 bg-white px-3 py-2"
          />
        </div>
      </div>

      {/* Recalculates live as the assumptions change. */}
      <EnergyEstimatePanel
        ratedPowerKw={item.rated_power_kw ?? 0}
        quantity={Number(quantity)}
        hoursPerDay={Number(hours)}
        daysPerWeek={Number(days)}
      />

      {submit.isError && (
        <div data-testid="request-error">
          <ErrorState error={submit.error} onRetry={() => submit.reset()} />
        </div>
      )}

      <button
        type="button"
        data-testid="request-submit"
        disabled={submit.isPending || !canRequest}
        onClick={() =>
          submit.mutate({
            villageId: villageId!,
            personId: personId!,
            equipmentId: item.id,
            quantity: Number(quantity),
            hoursPerDay: Number(hours),
            daysPerWeek: Number(days),
            purpose,
          })
        }
        className="w-full rounded bg-primary px-3 py-2.5 font-medium text-primary-foreground disabled:opacity-60"
      >
        {submit.isPending ? t('equipment.submitting') : t('equipment.submit')}
      </button>
    </section>
  )
}

function NumberField({
  label,
  testId,
  value,
  onChange,
}: {
  label: string
  testId: string
  value: string
  onChange: (next: string) => void
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium" htmlFor={testId}>
        {label}
      </label>
      <input
        id={testId}
        data-testid={testId}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-deep/20 bg-white px-3 py-2"
      />
    </div>
  )
}
