import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { ErrorState } from '@/components/ErrorState'
import { useOpsHome } from '@/features/ops/useOpsHome'

type LinkTo = Parameters<typeof Link>[0]['to']

/**
 * One queue count, and the list it belongs to.
 *
 * Every figure is a link: a count an ops user cannot act on is a statistic,
 * and this screen exists to start work rather than to report on it.
 */
function Queue({
  label,
  value,
  detail,
  to,
  search,
  testId,
}: {
  label: string
  value: number
  detail: string
  to: string
  search?: Record<string, string>
  testId: string
}) {
  return (
    <Link
      to={to as LinkTo}
      search={search as never}
      data-testid={testId}
      className="block rounded border border-deep/10 bg-white/70 p-4 hover:border-primary/40"
    >
      <p className="text-xs text-deep/60">{label}</p>
      <p className="tabular mt-1 text-2xl font-semibold text-deep">{value}</p>
      <p className="mt-1 text-xs text-deep/60">{detail}</p>
    </Link>
  )
}

/**
 * Spec 7.1 — the ops home. Queue counts: requests awaiting review, open
 * demands, unverified records.
 */
export function OpsHomeScreen() {
  const { t } = useTranslation()
  const { data, isLoading, error, refetch } = useOpsHome()

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />

  if (isLoading || !data) {
    return (
      <p data-testid="ops-home-loading" className="text-sm text-deep/60">
        {t('common.loading')}
      </p>
    )
  }

  return (
    <section data-testid="ops-home" className="space-y-4">
      <h1 className="text-lg font-semibold">{t('opsHome.title')}</h1>

      <div className="grid gap-3 sm:grid-cols-3">
        <Queue
          testId="ops-queue-requests"
          label={t('opsHome.awaitingReview')}
          value={data.awaitingReview}
          detail={t('opsHome.awaitingReviewDetail')}
          to="/ops/requests"
          search={{ status: 'submitted' }}
        />
        <Queue
          testId="ops-queue-demands"
          label={t('opsHome.openDemands')}
          value={data.openDemands}
          detail={t('opsHome.openDemandsDetail')}
          to="/ops/demand"
        />
        {/* Verification is the officer's job, and ops may read that queue —
            SURFACE_ROLES.officer includes ops and admin. */}
        <Queue
          testId="ops-queue-verification"
          label={t('opsHome.outstandingRecords')}
          value={data.outstandingRecords}
          detail={t('opsHome.outstandingRecordsDetail')}
          to="/officer/verify"
        />
      </div>
    </section>
  )
}
