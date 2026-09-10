import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { StatusPill } from '@/components/StatusPill'
import {
  requiresDecisionNote,
  reviewerActions,
  type ReviewerAction,
} from '@/features/ops/transitions'
import { useOpsRequest, useReviewAction, useVillageEnergy } from '@/features/ops/useOpsRequests'
import { formatKw, formatKwh, formatTimestamp } from '@/lib/format'

const route = getRouteApi('/_ops/ops/requests/$requestId')

/**
 * Spec 7.3 — the review screen.
 *
 * Offers only legal transitions and surfaces the trigger's message verbatim if
 * one is raised anyway. The status machine itself lives in pue_request_guard;
 * this decides which controls exist, and an "illegal transition" error
 * reaching a user means this screen offered something it should not have.
 */
export function OpsRequestReviewScreen() {
  const { requestId } = route.useParams()
  const { t } = useTranslation()
  const query = useOpsRequest(requestId)
  const energy = useVillageEnergy(query.request?.village_id)
  const review = useReviewAction(requestId, query.request?.village_id)

  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState(false)

  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  if (query.isLoading) {
    return (
      <p data-testid="ops-review-loading" className="text-sm text-deep/60">
        {t('common.loading')}
      </p>
    )
  }

  // Zero rows is an answer: RLS says this request is not visible.
  if (!query.request) {
    return <EmptyState title={t('ops.notFoundTitle')} detail={t('ops.notFoundDetail')} />
  }

  const request = query.request
  const estimate = request.estimate
  const actions = reviewerActions(request.status)

  const run = (action: ReviewerAction) => {
    if (requiresDecisionNote(action) && note.trim() === '') {
      setNoteError(true)
      return
    }
    setNoteError(false)
    review.mutate({ action, note: requiresDecisionNote(action) ? note.trim() : undefined })
  }

  return (
    <section className="max-w-2xl space-y-5" data-testid="request-review">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">{request.equipment_name}</h1>
          <StatusPill kind="request" status={request.status} />
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <Row label={t('ops.applicant')} value={request.applicant} />
          <Row label={t('ops.village')} value={request.village_name} />
          <Row label={t('ops.farm')} value={request.farm_label ?? '—'} />
          {request.submitted_at && (
            <Row label={t('ops.colSubmitted')} value={formatTimestamp(request.submitted_at)} />
          )}
        </dl>
        {request.purpose && <p className="text-sm text-deep/70">{request.purpose}</p>}
      </header>

      <section className="space-y-1" data-testid="review-estimate">
        <h2 className="text-sm font-semibold">{t('ops.snapshotted')}</h2>
        <p className="text-xs text-deep/60">{t('ops.snapshottedNote')}</p>
        {estimate ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <Row label={t('estimate.ratedPower')} value={formatKw(estimate.rated_power_kw)} />
            <Row label={t('estimate.quantity')} value={String(estimate.quantity)} />
            <Row label={t('estimate.hours')} value={String(estimate.hours_per_day)} />
            <Row label={t('estimate.days')} value={String(estimate.days_per_week)} />
            <Row label={t('estimate.peak')} value={formatKw(estimate.est_power_kw)} />
            <Row label={t('estimate.perWeek')} value={formatKwh(estimate.est_kwh_per_week)} />
          </dl>
        ) : (
          <EmptyState title={t('requests.noEstimate')} detail={t('requests.noEstimateDetail')} />
        )}
        <p className="text-xs text-deep/60">{t('estimate.isEstimate')}</p>
      </section>

      <section className="space-y-1">
        <h2 className="text-sm font-semibold">{t('ops.headroom')}</h2>
        {energy.isLoading ? (
          <p className="text-sm text-deep/60">{t('common.loading')}</p>
        ) : energy.data ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <Row label={t('ops.capacity')} value={formatKw(energy.data.capacity_kw)} />
            {/* Capacity is PLANNED, never measured. Always shown with its basis. */}
            <Row
              label={t('ops.capacityBasis')}
              value={t(`capacityBasis.${energy.data.capacity_basis}`)}
              testId="review-capacity-basis"
            />
            <Row
              label={t('ops.approvedPeak')}
              value={formatKw(energy.data.approved_peak_kw)}
              testId="review-approved-peak"
            />
            <Row
              label={t('ops.prospectivePeak')}
              value={formatKw(energy.data.prospective_peak_kw)}
            />
            <Row
              label={t('ops.headroom')}
              value={formatKw(energy.data.headroom_kw)}
              testId="review-headroom"
            />
            <Row
              label={t('ops.simultaneity')}
              value={String(energy.data.simultaneity_factor)}
            />
          </dl>
        ) : (
          <EmptyState title={t('ops.noHeadroom')} detail={t('ops.noHeadroomDetail')} />
        )}
        {/* Prospective and approved are separate figures, never summed. */}
        <p className="text-xs text-deep/60">{t('ops.neverSummed')}</p>
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

      {review.isError && (
        <div data-testid="review-error">
          <ErrorState error={review.error} onRetry={() => review.reset()} />
        </div>
      )}

      {actions.length === 0 ? (
        <p className="text-sm text-deep/60">{t('ops.noActions')}</p>
      ) : (
        <section className="space-y-3">
          {actions.some(requiresDecisionNote) && (
            <div className="space-y-1">
              <label className="block text-sm font-medium" htmlFor="decision-note">
                {t('ops.decisionNote')}
              </label>
              <textarea
                id="decision-note"
                data-testid="decision-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                aria-invalid={noteError || undefined}
                className="w-full rounded border border-deep/20 bg-white px-3 py-2"
              />
              {noteError && (
                <p data-testid="decision-note-error" role="alert" className="text-sm text-destructive">
                  {t('ops.decisionNoteRequired')}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <button
                key={action}
                type="button"
                data-testid={`action-${action}`}
                disabled={review.isPending}
                onClick={() => run(action)}
                className="rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {review.isPending ? t('ops.working') : t(`ops.${camel(action)}`)}
              </button>
            ))}
          </div>
        </section>
      )}
    </section>
  )
}

function camel(action: ReviewerAction): string {
  return action === 'start_review' ? 'startReview' : action
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
