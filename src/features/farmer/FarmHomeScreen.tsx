import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { StatusPill } from '@/components/StatusPill'
import { useFarmerOpportunities } from '@/features/farmer/useFarmerOpportunities'
import { useMyFarm } from '@/features/farmer/useMyFarm'
import { useMyRequests } from '@/features/farmer/useRequests'

type LinkTo = Parameters<typeof Link>[0]['to']

function Figure({ label, value, testId }: { label: string; value: number; testId: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-deep/60">{label}</p>
      <p data-testid={testId} className="tabular text-lg font-semibold text-deep">
        {value}
      </p>
    </div>
  )
}

/**
 * Spec 6.1 — the farmer's home: status summary, latest request status, and any
 * opportunity their supply is inside.
 *
 * Composed from the three queries the other farmer screens already make rather
 * than adding a fourth. This bundle runs on the weakest hardware in the system
 * and this is the first screen it loads.
 */
export function FarmHomeScreen() {
  const { t } = useTranslation()
  const farmQuery = useMyFarm()
  const requestsQuery = useMyRequests()
  const opportunities = useFarmerOpportunities()

  const error = farmQuery.error ?? requestsQuery.error ?? opportunities.error
  if (error) {
    return <ErrorState error={error} onRetry={() => void farmQuery.refetch()} />
  }

  if (farmQuery.isLoading || requestsQuery.isLoading || opportunities.isLoading) {
    return (
      <p data-testid="farm-home-loading" className="text-sm text-deep/60">
        {t('common.loading')}
      </p>
    )
  }

  const farms = farmQuery.farms ?? []
  const requests = requestsQuery.requests ?? []
  const opportunityCount = (opportunities.data ?? []).length

  // No farm yet is a real state with a next step, not a blank list: a farmer
  // whose officer has not registered them yet cannot do anything else here.
  if (farms.length === 0) {
    return (
      <section data-testid="farm-home" className="space-y-4">
        <h1 className="text-lg font-semibold">{t('farmHome.title')}</h1>
        <EmptyState title={t('farmHome.noFarmTitle')} detail={t('farmHome.noFarmDetail')} />
      </section>
    )
  }

  const plots = farms.flatMap((f) => f.plots ?? [])
  const cycles = plots.flatMap((p) => p.cycles ?? [])
  // useMyRequests orders by created_at descending, so the first is the latest.
  const latest = requests[0]

  return (
    <section data-testid="farm-home" className="space-y-5">
      <h1 className="text-lg font-semibold">{t('farmHome.title')}</h1>

      <section
        data-testid="farm-home-summary"
        className="space-y-3 rounded border border-deep/10 bg-white/70 p-4"
      >
        <p className="font-medium text-deep">{farms.map((f) => f.label).join(' · ')}</p>
        <div className="grid grid-cols-3 gap-3">
          <Figure label={t('farmHome.farms')} value={farms.length} testId="summary-farms" />
          <Figure label={t('farmHome.plots')} value={plots.length} testId="summary-plots" />
          <Figure label={t('farmHome.cycles')} value={cycles.length} testId="summary-cycles" />
        </div>
        <Link
          to={'/farm/my-farm' as LinkTo}
          className="inline-block text-sm font-medium text-primary underline underline-offset-4"
        >
          {t('farmHome.openMyFarm')}
        </Link>
      </section>

      <section className="space-y-2 rounded border border-deep/10 bg-white/70 p-4">
        <h2 className="text-sm font-semibold">{t('farmHome.latestRequest')}</h2>
        {latest ? (
          <div data-testid="farm-home-latest-request" className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-deep">{latest.equipment_name}</span>
            <StatusPill kind="request" status={latest.status} />
          </div>
        ) : (
          <p data-testid="farm-home-no-requests" className="text-sm text-deep/60">
            {t('farmHome.noRequests')}
          </p>
        )}
        <Link
          to={'/farm/equipment' as LinkTo}
          className="inline-block text-sm font-medium text-primary underline underline-offset-4"
        >
          {t('farmHome.browseEquipment')}
        </Link>
      </section>

      <section
        data-testid="farm-home-opportunities"
        className="space-y-2 rounded border border-deep/10 bg-white/70 p-4"
      >
        <h2 className="text-sm font-semibold">{t('farmHome.opportunities')}</h2>
        <p className="text-sm text-deep">
          {opportunityCount === 0
            ? t('farmHome.noOpportunities')
            : t('farmHome.opportunityCount', { count: opportunityCount })}
        </p>
        {/* Even as a count, an opportunity must not read as a completed deal. */}
        <p className="text-xs text-deep/60">{t('farmHome.notASale')}</p>
        <Link
          to={'/farm/opportunities' as LinkTo}
          data-testid="farm-home-opportunities-link"
          className="inline-block text-sm font-medium text-primary underline underline-offset-4"
        >
          {t('farmHome.openOpportunities')}
        </Link>
      </section>
    </section>
  )
}
