import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { StatusPill } from '@/components/StatusPill'
import { useMyRequests } from '@/features/farmer/useRequests'
import { formatTimestamp } from '@/lib/format'

/** Spec 6.5 — the farmer's own requests, each with a status pill. */
export function RequestsListScreen() {
  const { t } = useTranslation()
  const query = useMyRequests()

  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  if (query.isLoading) {
    return (
      <p data-testid="requests-loading" className="text-sm text-deep/60">
        {t('common.loading')}
      </p>
    )
  }

  if (query.requests.length === 0) {
    return <EmptyState title={t('requests.noneTitle')} detail={t('requests.noneDetail')} />
  }

  return (
    <section className="space-y-3" data-testid="requests-list">
      <h1 className="text-lg font-semibold">{t('requests.title')}</h1>

      <ul className="space-y-2">
        {query.requests.map((request) => (
          <li key={request.id}>
            <Link
              to="/farm/requests/$requestId"
              params={{ requestId: request.id }}
              className="block space-y-1 rounded border border-deep/10 bg-white/70 p-3"
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-primary">{request.equipment_name}</span>
                <StatusPill kind="request" status={request.status} />
              </span>
              {request.purpose && (
                <span className="block text-xs text-deep/60">{request.purpose}</span>
              )}
              {request.submitted_at && (
                <span className="block text-xs text-deep/50">
                  {t('requests.submittedOn')} {formatTimestamp(request.submitted_at)}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
