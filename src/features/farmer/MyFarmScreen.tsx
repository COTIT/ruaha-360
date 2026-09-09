import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { ProvenanceBadge } from '@/components/ProvenanceBadge'
import { useMyFarm, type MyFarm } from '@/features/farmer/useMyFarm'
import { formatArea, formatKg, formatPlainDate } from '@/lib/format'

/**
 * Spec 6.2 — read-only. Household, plots with area, crops with the current
 * expected harvest, every figure carrying its provenance.
 *
 * Nothing here can be edited: a farmer's records are changed by a field
 * officer, and offering a control the policies would refuse would be a lie.
 */
export function MyFarmScreen() {
  const { t } = useTranslation()
  const query = useMyFarm()

  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  if (query.isLoading) {
    return (
      <p data-testid="my-farm-loading" className="text-sm text-deep/60">
        {t('common.loading')}
      </p>
    )
  }

  // A real message, not an empty list: zero farms means none has been
  // registered yet, which is a normal state for a new farmer.
  if (query.farms.length === 0) {
    return <EmptyState title={t('myFarm.noFarmTitle')} detail={t('myFarm.noFarmDetail')} />
  }

  return (
    <section className="space-y-4" data-testid="my-farm">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">{t('myFarm.title')}</h1>
        <p className="text-xs text-deep/60">{t('myFarm.readOnly')}</p>
      </header>

      {query.farms.map((farm) => (
        <article
          key={farm.id}
          data-testid="farm-card"
          className="space-y-3 rounded border border-deep/10 bg-white/70 p-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold">{farm.label}</h2>
            <Badge record={farm} />
          </div>

          {farm.plots.length === 0 ? (
            <EmptyState title={t('myFarm.noPlots')} />
          ) : (
            farm.plots.map((plot) => <Plot key={plot.id} plot={plot} />)
          )}
        </article>
      ))}
    </section>
  )
}

function Plot({ plot }: { plot: MyFarm['plots'][number] }) {
  const { t } = useTranslation()

  return (
    <div data-testid="plot-card" className="space-y-2 border-t border-deep/10 pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{plot.label}</span>
        <span className="tabular text-sm text-deep/70">{formatArea(plot.area_ha, 'hectare')}</span>
        <Badge record={plot} />
      </div>

      {plot.cycles.length === 0 ? (
        <p className="text-xs text-deep/60">{t('myFarm.noCycles')}</p>
      ) : (
        plot.cycles.map((cycle) => (
          <div key={cycle.id} data-testid="cycle-card" className="ml-3 space-y-1 border-l border-deep/10 pl-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">{cycle.crop_name}</span>
              <Badge record={cycle} />
            </div>

            <p className="text-xs text-deep/60">
              {t('myFarm.window')}: {formatPlainDate(cycle.harvest_start)} –{' '}
              {formatPlainDate(cycle.harvest_end)}
            </p>

            {cycle.expected && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-deep/60">{t('myFarm.expected')}:</span>
                <span className="tabular text-sm font-medium">
                  {formatKg(cycle.expected.quantity_kg)}
                </span>
                <Badge record={cycle.expected} />
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

function Badge({
  record,
}: {
  record: {
    source: Parameters<typeof ProvenanceBadge>[0]['source']
    verification: Parameters<typeof ProvenanceBadge>[0]['verification']
    confidence: Parameters<typeof ProvenanceBadge>[0]['confidence']
    captured_at: string
  }
}) {
  return (
    <ProvenanceBadge
      source={record.source}
      verification={record.verification}
      confidence={record.confidence}
      capturedAt={record.captured_at}
    />
  )
}
