import { useEffect, useRef } from 'react'
import { Link, getRouteApi } from '@tanstack/react-router'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'

import { activeMemberships, ownVillageId } from '@/app/membership'
import { useSession } from '@/app/session'
import { EmptyState } from '@/components/EmptyState'
import { EnergyEstimatePanel } from '@/components/EnergyEstimatePanel'
import { ErrorState } from '@/components/ErrorState'
import { useEquipmentItem } from '@/features/farmer/useEquipment'
import { requestSchema, type RequestForm } from '@/features/farmer/requestSchema'
import { useSubmitRequest } from '@/features/farmer/useRequests'
import { formatKw, formatMoney } from '@/lib/format'

const route = getRouteApi('/_farmer/farm/equipment/$equipmentId')

const EMPTY: RequestForm = {
  quantity: '1',
  hours_per_day: '',
  days_per_week: '',
  purpose: '',
}

/**
 * Spec 6.4 — detail plus the request form, with a live estimate.
 *
 * The estimate shown here is a PREVIEW. pue_recompute_estimate writes the
 * stored row, and the request detail reads that stored figure rather than
 * recomputing — so the two can be compared instead of assumed equal.
 *
 * The inputs are bounded by `requestSchema` (QA #9). The estimate is only
 * computed from inputs that pass it: the finding's real complaint was not that
 * 99 hours was accepted, but that the screen computed a confident
 * 1,485 kWh/day from it and presented that as an answer.
 */
export function EquipmentDetailScreen() {
  const { equipmentId } = route.useParams()
  const { t } = useTranslation()
  const session = useSession()
  const query = useEquipmentItem(equipmentId)
  const submit = useSubmitRequest()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RequestForm, unknown, RequestForm>({
    defaultValues: EMPTY,
    resolver: zodResolver(requestSchema),
  })

  const item = query.item

  // Prefilled from the equipment's typicals, once. Overwriting on every render
  // would fight the farmer as they type. A ref rather than state: `reset` is
  // what re-renders, so a state flag would only add a second render and a
  // set-state-in-effect to explain away.
  const prefilled = useRef(false)
  useEffect(() => {
    if (prefilled.current || !item) return
    prefilled.current = true
    reset({
      ...EMPTY,
      hours_per_day: item.typical_hours_per_day === null ? '' : String(item.typical_hours_per_day),
      days_per_week: item.typical_days_per_week === null ? '' : String(item.typical_days_per_week),
    })
  }, [item, reset])

  // Subscribed so the estimate recalculates live, and so it can be withheld
  // while the assumptions behind it are not possible. `useWatch` rather than
  // `watch()` because the latter returns a fresh object on every render.
  const values = useWatch({ control })
  const parsed = requestSchema.safeParse(values)

  /**
   * QA #32. A withheld estimate has two quite different causes, and telling a
   * farmer to "fill in hours per day" when they have just typed 99 into it
   * asks them to do something they have already done.
   *
   * A blank is the one they can act on first, so it wins when both are true.
   */
  const anythingBlank =
    !parsed.success &&
    parsed.error.issues.some((issue) => issue.message === 'equipment.required')

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

  /**
   * QA #23. `isSubmitting` is react-hook-form's own in-flight flag and it is
   * set synchronously when the handler starts, which `submit.isPending` is
   * not — validation is asynchronous, so the mutation has not begun on the
   * tick a second submit arrives. The button below is disabled on both.
   */
  const onSubmit = handleSubmit((form) =>
    submit.mutate({
      villageId: villageId!,
      personId: personId!,
      equipmentId: item.id,
      quantity: Number(form.quantity),
      hoursPerDay: Number(form.hours_per_day),
      daysPerWeek: Number(form.days_per_week),
      purpose: form.purpose,
    }),
  )

  /** One message per reason. The schema's `message` holds an i18n key. */
  const err = (name: keyof RequestForm) => {
    const error = errors[name]
    if (!error) return null
    return (
      <p data-testid={`request-${fieldId(name)}-error`} className="text-sm text-destructive">
        {t(error.message ?? 'equipment.required')}
      </p>
    )
  }

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

      <form className="space-y-4" noValidate onSubmit={onSubmit}>
        <div className="space-y-3">
          <NumberField label={t('equipment.quantity')} testId="request-quantity">
            <input
              id="request-quantity"
              data-testid="request-quantity"
              inputMode="numeric"
              className={inputClass}
              {...register('quantity')}
            />
          </NumberField>
          {err('quantity')}

          <NumberField label={t('equipment.hours')} testId="request-hours">
            <input
              id="request-hours"
              data-testid="request-hours"
              inputMode="decimal"
              className={inputClass}
              {...register('hours_per_day')}
            />
          </NumberField>
          {err('hours_per_day')}

          <NumberField label={t('equipment.days')} testId="request-days">
            <input
              id="request-days"
              data-testid="request-days"
              inputMode="decimal"
              className={inputClass}
              {...register('days_per_week')}
            />
          </NumberField>
          {err('days_per_week')}

          <div className="space-y-1">
            <label className="block text-sm font-medium" htmlFor="request-purpose">
              {t('equipment.purpose')}
            </label>
            <textarea
              id="request-purpose"
              data-testid="request-purpose"
              rows={2}
              className={inputClass}
              {...register('purpose')}
            />
          </div>
        </div>

        {/* Recalculates live as the assumptions change — but only from
            assumptions that could be true. A figure computed from 99 hours a
            day is not an estimate, it is a wrong answer stated confidently. */}
        {parsed.success ? (
          <EnergyEstimatePanel
            ratedPowerKw={item.rated_power_kw ?? 0}
            quantity={Number(parsed.data.quantity)}
            hoursPerDay={Number(parsed.data.hours_per_day)}
            daysPerWeek={Number(parsed.data.days_per_week)}
          />
        ) : (
          <div data-testid="estimate-blocked">
            <EmptyState
              title={t(
                anythingBlank
                  ? 'equipment.estimateBlockedTitle'
                  : 'equipment.estimateImpossibleTitle',
              )}
              detail={t(
                anythingBlank
                  ? 'equipment.estimateBlockedDetail'
                  : 'equipment.estimateImpossibleDetail',
              )}
            />
          </div>
        )}

        {submit.isError && (
          <div data-testid="request-error">
            <ErrorState error={submit.error} onRetry={() => submit.reset()} />
          </div>
        )}

        <button
          type="submit"
          data-testid="request-submit"
          disabled={submit.isPending || isSubmitting || !canRequest}
          className="w-full rounded bg-primary px-3 py-2.5 font-medium text-primary-foreground disabled:opacity-60"
        >
          {submit.isPending || isSubmitting
            ? t('equipment.submitting')
            : t('equipment.submit')}
        </button>
      </form>
    </section>
  )
}

const inputClass = 'w-full rounded border border-deep/20 bg-white px-3 py-2'

function fieldId(name: keyof RequestForm) {
  // `hours_per_day` is labelled `request-hours` on screen, as the spec names
  // it; the schema keys match the COLUMNS, so the two are mapped rather than
  // derived.
  const MAP: Record<keyof RequestForm, string> = {
    quantity: 'quantity',
    hours_per_day: 'hours',
    days_per_week: 'days',
    purpose: 'purpose',
  }
  return MAP[name]
}

function NumberField({
  label,
  testId,
  children,
}: {
  label: string
  testId: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium" htmlFor={testId}>
        {label}
      </label>
      {children}
    </div>
  )
}
