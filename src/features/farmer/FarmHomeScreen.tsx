import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Card, Loading, ProductNote } from '@/components/controls'
import { StatusPill } from '@/components/StatusPill'
import { useFarmerOpportunities } from '@/features/farmer/useFarmerOpportunities'
import { useMyFarm } from '@/features/farmer/useMyFarm'
import { useMyRequests } from '@/features/farmer/useRequests'

type LinkTo = Parameters<typeof Link>[0]['to']

function Figure({ label, value, testId }: { label: string; value: number; testId: string }) {
  return (
    <div
      className="flex min-w-0 flex-col gap-0.5 px-3 py-2.5"
      style={{
        flex: '1 1 0',
        border: '1px solid var(--rule)',
        borderRadius: 'var(--radius-control)',
        background: 'var(--sand-2)',
      }}
    >
      <p className="type-note" style={{ color: 'var(--ink-2)' }}>
        {label}
      </p>
      <p data-testid={testId} className="tabular" style={{ fontSize: 22, fontWeight: 600 }}>
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
    return <Loading testId="farm-home-loading" />
  }

  const farms = farmQuery.farms ?? []
  const requests = requestsQuery.requests ?? []
  const opportunityCount = (opportunities.data ?? []).length

  // No farm yet is a real state with a next step, not a blank list: a farmer
  // whose officer has not registered them yet cannot do anything else here.
  if (farms.length === 0) {
    return (
      <section data-testid="farm-home" className="flex flex-col gap-4">
        <h1 className="type-screen-title">{t('farmHome.title')}</h1>
        <EmptyState title={t('farmHome.noFarmTitle')} detail={t('farmHome.noFarmDetail')} />
      </section>
    )
  }

  const plots = farms.flatMap((f) => f.plots ?? [])
  const cycles = plots.flatMap((p) => p.cycles ?? [])
  // useMyRequests orders by created_at descending, so the first is the latest.
  const latest = requests[0]

  return (
    <section data-testid="farm-home" className="flex flex-col gap-4">
      <h1 className="type-screen-title">{t('farmHome.title')}</h1>

      <Card className="flex flex-col gap-3.5 p-4">
      <section data-testid="farm-home-summary" className="flex flex-col gap-3.5">
        <p style={{ fontSize: 17, fontWeight: 600 }}>{farms.map((f) => f.label).join(' · ')}</p>
        <div className="flex gap-2.5">
          <Figure label={t('farmHome.farms')} value={farms.length} testId="summary-farms" />
          <Figure label={t('farmHome.plots')} value={plots.length} testId="summary-plots" />
          <Figure label={t('farmHome.cycles')} value={cycles.length} testId="summary-cycles" />
        </div>
        <Link to={'/farm/my-farm' as LinkTo} style={FARM_ACTION}>
          {t('farmHome.openMyFarm')}
        </Link>
      </section>
      </Card>

      <Card className="flex flex-col gap-2.5 p-4">
        <h2 className="type-section" style={{ color: 'var(--ink-3)' }}>
          {t('farmHome.latestRequest')}
        </h2>
        {latest ? (
          <div data-testid="farm-home-latest-request" className="flex flex-col items-start gap-2">
            <span style={{ fontSize: 16, fontWeight: 600 }}>{latest.equipment_name}</span>
            <StatusPill kind="request" status={latest.status} />
          </div>
        ) : (
          <p data-testid="farm-home-no-requests" style={{ fontSize: 15, color: 'var(--ink-2)' }}>
            {t('farmHome.noRequests')}
          </p>
        )}
        <Link to={'/farm/equipment' as LinkTo} style={FARM_ACTION}>
          {t('farmHome.browseEquipment')}
        </Link>
      </Card>

      <Card className="flex flex-col gap-2.5 p-4">
      <section data-testid="farm-home-opportunities" className="flex flex-col gap-2.5">
        <h2 className="type-section" style={{ color: 'var(--ink-3)' }}>
          {t('farmHome.opportunities')}
        </h2>
        <p style={{ fontSize: 15 }}>
          {opportunityCount === 0
            ? t('farmHome.noOpportunities')
            : t('farmHome.opportunityCount', { count: opportunityCount })}
        </p>
        {/* Even as a count, an opportunity must not read as a completed deal. */}
        <ProductNote>{t('farmHome.notASale')}</ProductNote>
        <Link
          to={'/farm/opportunities' as LinkTo}
          data-testid="farm-home-opportunities-link"
          style={FARM_ACTION}
        >
          {t('farmHome.openOpportunities')}
        </Link>
      </section>
      </Card>
    </section>
  )
}

/**
 * A full-width 48px action. On this surface every link that leads somewhere is
 * a target, not a phrase to find in a sentence.
 */
const FARM_ACTION = {
  display: 'flex',
  minHeight: 48,
  alignItems: 'center',
  justifyContent: 'center',
  border: '1.5px solid var(--rule-2)',
  borderRadius: 'var(--radius-control)',
  background: 'var(--paper)',
  color: 'var(--primary-ink)',
  fontSize: 15,
  fontWeight: 600,
  textWrap: 'balance' as const,
}
