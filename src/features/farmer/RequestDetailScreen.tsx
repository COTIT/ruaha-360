import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { StatusPill } from '@/components/StatusPill'
import { useFarmerTransition, useRequest } from '@/features/farmer/useRequests'
import { farmerActions } from '@/features/ops/transitions'
import { formatKw, formatKwh, formatTimestamp } from '@/lib/format'

const route = getRouteApi('/_farmer/farm/requests/$requestId')

/**
 * Spec 6.5 — the equipment, the assumptions, the STORED estimate, and the
 * decision note once decided.
 *
 * The estimate here is read from energy_estimate, not recomputed: the trigger
 * is its only writer, and showing the stored row is what lets the preview and
 * the stored figure be compared rather than assumed identical.
 *
 * A submitted request is not editable. pue_request_guard freezes the content
 * once it leaves draft, so no edit control is offered — rendering one would be
 * a lie about what is possible.
 */
export function RequestDetailScreen() {
  const { requestId } = route.useParams()
  const { t } = useTranslation()
  const query = useRequest(requestId)
  const transition = useFarmerTransition(requestId, query.request?.village_id ?? undefined)

  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  if (query.isLoading) {
    return (
      <p data-testid="request-detail-loading" className="text-sm text-deep/60">
        {t('common.loading')}
      </p>
    )
  }

  // Zero rows is an answer: RLS says this request is not visible.
  if (!query.request) {
    return <EmptyState title={t('requests.notFoundTitle')} detail={t('requests.notFoundDetail')} />
  }

  const request = query.request
  const estimate = request.estimate
  const frozen = request.status !== 'draft'
  const actions = farmerActions(request.status)

  return (
    <section className="max-w-lg space-y-4" data-testid="request-detail">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">{request.equipment_name}</h1>
          <StatusPill kind="request" status={request.status} />
        </div>
        {request.purpose && <p className="text-sm text-deep/70">{request.purpose}</p>}
        {request.submitted_at && (
          <p className="text-xs text-deep/50">
            {t('requests.submittedOn')} {formatTimestamp(request.submitted_at)}
          </p>
        )}
      </header>

      <section className="space-y-1">
        <h2 className="text-sm font-semibold">{t('requests.assumptions')}</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <Row label={t('equipment.quantity')} value={String(request.quantity)} />
          <Row label={t('equipment.hours')} value={String(request.hours_per_day ?? '—')} />
          <Row label={t('equipment.days')} value={String(request.days_per_week ?? '—')} />
        </dl>
      </section>

      <section className="space-y-1">
        <h2 className="text-sm font-semibold">{t('requests.storedEstimate')}</h2>
        {estimate ? (
          <dl className="grid gap-y-1 text-sm">
            <Row
              label={t('estimate.peak')}
              value={formatKw(estimate.est_power_kw)}
              testId="stored-estimate-power"
            />
            <Row
              label={t('estimate.perDay')}
              value={formatKwh(estimate.est_kwh_per_day)}
              testId="stored-estimate-kwh-day"
            />
            <Row
              label={t('estimate.perWeek')}
              value={formatKwh(estimate.est_kwh_per_week)}
              testId="stored-estimate-kwh-week"
            />
          </dl>
        ) : (
          <EmptyState title={t('requests.noEstimate')} detail={t('requests.noEstimateDetail')} />
        )}
        <p className="text-xs text-deep/60">{t('estimate.isEstimate')}</p>
      </section>

      {request.decision_note && (
        <section className="space-y-1">
          <h2 className="text-sm font-semibold">{t('requests.decision')}</h2>
          <p className="text-sm text-deep/80">{request.decision_note}</p>
          {request.decided_at && (
            <p className="text-xs text-deep/50">{formatTimestamp(request.decided_at)}</p>
          )}
        </section>
      )}

      {frozen && (
        <p className="rounded border border-deep/15 bg-white/60 px-3 py-2 text-xs text-deep/70">
          {t('requests.frozen')}
        </p>
      )}

      {/* What the applicant may do from here — business-rules §2's role
          matrix, mirrored by farmerActions. A draft can be submitted or
          withdrawn; a submitted request withdrawn; anything under review or
          decided offers nothing, because it is no longer theirs to move. */}
      {actions.length > 0 && (
        <section className="space-y-2">
          {transition.error && (
            <p
              data-testid="request-action-error"
              role="alert"
              className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-deep/80"
            >
              {transition.error.message}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <button
                key={action}
                type="button"
                data-testid={`request-action-${action}`}
                disabled={transition.isPending}
                onClick={() => transition.mutate(action)}
                className={
                  action === 'submit'
                    ? 'rounded bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60'
                    : 'rounded border border-deep/20 bg-white px-4 py-2 text-sm font-medium text-deep/80 disabled:opacity-60'
                }
              >
                {t(`requests.action.${action}`)}
              </button>
            ))}
          </div>

          {request.status === 'draft' && (
            <p className="text-xs text-deep/60">{t('requests.draftNote')}</p>
          )}
        </section>
      )}
    </section>
  )
}

function Row({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-deep/60">{label}</dt>
      <dd data-testid={testId} className="tabular font-medium">
        {value}
      </dd>
    </div>
  )
}
