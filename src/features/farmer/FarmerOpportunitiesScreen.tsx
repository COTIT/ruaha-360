import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { StatusPill } from '@/components/StatusPill'
import { useFarmerOpportunities } from '@/features/farmer/useFarmerOpportunities'
import { formatKg } from '@/lib/format'

/**
 * Spec 6.6 — opportunities this farmer's supply is inside.
 *
 * Read-only. An opportunity is created and moved by ops; a farmer sees that
 * their harvest has been put forward, and nothing here implies they agreed to
 * anything or that money exists.
 */
export function FarmerOpportunitiesScreen() {
  const { t } = useTranslation()
  const query = useFarmerOpportunities()

  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  const rows = query.data ?? []

  return (
    <section data-testid="farmer-opportunities" className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">{t('farmerOpportunities.title')}</h1>
        {/* Not a sale, not a delivery, not a payment. Stated on every
            opportunity screen, farmer-facing most of all. */}
        <p data-testid="farmer-opportunities-note" className="text-xs text-deep/70">
          {t('farmerOpportunities.notASale')}
        </p>
      </header>

      {query.isLoading ? (
        <p data-testid="farmer-opportunities-loading" className="text-sm text-deep/60">
          {t('common.loading')}
        </p>
      ) : rows.length === 0 ? (
        <EmptyState
          title={t('farmerOpportunities.noneTitle')}
          detail={t('farmerOpportunities.noneDetail')}
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((o) => (
            <li
              key={o.id}
              data-testid="farmer-opportunity"
              className="space-y-2 rounded border border-deep/10 bg-white/70 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-deep">{o.crop_name}</p>
                <StatusPill kind="opportunity" status={o.status} />
              </div>

              {/* No buyer, no demand window: `demand_read` is staff-only, so a
                  farmer cannot see who the buyer is. Saying so is better than
                  rendering blanks where a name would go. */}
              <p className="text-xs text-deep/60">{t('farmerOpportunities.buyerWithOps')}</p>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {/* The farmer's own share leads: it is the figure that
                    concerns them. The opportunity's total is context. */}
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-deep/60">{t('farmerOpportunities.yourShare')}</dt>
                  <dd data-testid="my-contribution" className="tabular font-medium">
                    {formatKg(o.my_contribution_kg)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-deep/60">{t('farmerOpportunities.opportunityTotal')}</dt>
                  <dd data-testid="offered-total" className="tabular">
                    {formatKg(o.offered_quantity_kg)}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
