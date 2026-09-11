import { useTranslation } from 'react-i18next'

import { useScopeNames } from '@/app/scope'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { ProvenanceBadge } from '@/components/ProvenanceBadge'
import { VerifyButton } from '@/features/officer/VerifyButton'
import { useVerifyFromQueue, useVerifyQueue } from '@/features/officer/useVerifyQueue'

/**
 * Spec 5.7 — the officer's verify queue: records still carrying
 * `unverified` or `pending` in their villages.
 *
 * Verification is a deliberate act with the verifier's name attached
 * (business-rules §5), never a checkbox inside an edit form — so each row is
 * its own decision, and verifying one leaves the rest alone.
 */
export function VerifyQueueScreen() {
  const { t } = useTranslation()
  const query = useVerifyQueue()
  const verify = useVerifyFromQueue()
  const scope = useScopeNames()

  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  const rows = query.data ?? []

  return (
    <section data-testid="verify-queue" className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">{t('verifyQueue.title')}</h1>
        <p className="text-xs text-deep/60">{t('verifyQueue.intro')}</p>
      </header>

      {/* app_verify's own message if it refuses — shown as written, never
          replaced with a generic failure (business-rules §9). */}
      {verify.error && <ErrorState error={verify.error} />}

      {query.isLoading ? (
        <p data-testid="verify-queue-loading" className="text-sm text-deep/60">
          {t('common.loading')}
        </p>
      ) : rows.length === 0 ? (
        // Nothing outstanding is a result worth stating plainly, not a blank
        // list and never an error.
        <EmptyState title={t('verifyQueue.noneTitle')} detail={t('verifyQueue.noneDetail')} />
      ) : (
        <>
          <p data-testid="verify-queue-count" className="text-sm text-deep/70">
            {t('verifyQueue.outstanding', { count: rows.length })}
          </p>

          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={`${row.table}:${row.id}`}
                data-testid="verify-queue-row"
                data-table={row.table}
                className="flex flex-wrap items-center justify-between gap-3 rounded border border-deep/10 bg-white/70 p-3"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium text-deep">
                    <span className="mr-2 rounded bg-deep/10 px-1.5 py-0.5 text-xs font-normal text-deep/70">
                      {t(`verifyQueue.table.${row.table}`)}
                    </span>
                    {row.label}
                  </p>
                  <p className="text-xs text-deep/60">
                    {scope.data?.villages[row.village_id] ?? row.village_id}
                  </p>
                  <ProvenanceBadge
                    source={row.source}
                    verification={row.verification}
                    confidence={row.confidence ?? undefined}
                    capturedAt={row.captured_at}
                  />
                </div>

                <VerifyButton
                  table={row.table}
                  id={row.id}
                  verification={row.verification}
                  pending={verify.isPending}
                  onVerify={(target) => verify.mutate(target)}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
