import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { ProvenanceBadge } from '@/components/ProvenanceBadge'
import { useCycleDetail, useFarmDetail } from '@/features/officer/useOfficerRecords'
import { formatArea, formatKg, formatPlainDate } from '@/lib/format'

const farmRoute = getRouteApi('/_officer/officer/farms/$farmId')
const cycleRoute = getRouteApi('/_officer/officer/cycles/$cycleId')

/**
 * Both screens are READ-ONLY for the demo. Spec 5.5 and 5.6 describe write
 * surfaces — add plot, GPS capture, harvest supersede — and those are deferred
 * deliberately. These exist now because the Tower's production drill links
 * here, and spec §8.2 makes a headline that cannot be traced a headline that
 * does not belong on the screen.
 */

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-deep/60">{label}</p>
      <p className="text-sm text-deep">{value}</p>
    </div>
  )
}

export function OfficerFarmScreen() {
  const { t } = useTranslation()
  const { farmId } = farmRoute.useParams()
  const query = useFarmDetail(farmId)

  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  if (query.isLoading) {
    return (
      <p data-testid="farm-detail-loading" className="text-sm text-deep/60">
        {t('common.loading')}
      </p>
    )
  }

  const farm = query.data
  // Zero rows is an answer: the farm does not exist, or RLS puts it outside
  // this officer's villages. Never an error.
  if (!farm) {
    return <EmptyState title={t('farmDetail.notFoundTitle')} detail={t('farmDetail.notFoundDetail')} />
  }

  return (
    <section data-testid="farm-detail" className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-lg font-semibold">{farm.label}</h1>
        <ProvenanceBadge
          source={farm.source}
          verification={farm.verification}
          confidence={farm.confidence ?? undefined}
          capturedAt={farm.captured_at}
        />
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Detail
          label={t('farmDetail.gps')}
          value={
            farm.latitude !== null && farm.longitude !== null
              ? `${farm.latitude}, ${farm.longitude}`
              : t('farmDetail.noGps')
          }
        />
        <Detail label={t('farmDetail.plotCount')} value={farm.plots.length} />
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-deep/70">{t('farmDetail.plots')}</h2>
        {farm.plots.length === 0 ? (
          <EmptyState title={t('farmDetail.noPlotsTitle')} detail={t('farmDetail.noPlotsDetail')} />
        ) : (
          <ul className="space-y-2">
            {farm.plots.map((plot) => (
              <li
                key={plot.id}
                data-testid="farm-plot"
                className="rounded border border-deep/10 bg-white/70 p-3"
              >
                <p className="text-sm font-medium text-deep">
                  {plot.label}
                  <span className="tabular ml-2 font-normal text-deep/70">
                    {formatArea(plot.area_ha, 'hectare')}
                  </span>
                </p>
                <div className="mt-1">
                  <ProvenanceBadge
                    source={plot.source}
                    verification={plot.verification}
                    confidence={plot.confidence ?? undefined}
                    capturedAt={plot.captured_at}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export function OfficerCycleScreen() {
  const { t } = useTranslation()
  const { cycleId } = cycleRoute.useParams()
  const query = useCycleDetail(cycleId)

  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  if (query.isLoading) {
    return (
      <p data-testid="cycle-detail-loading" className="text-sm text-deep/60">
        {t('common.loading')}
      </p>
    )
  }

  const cycle = query.data
  if (!cycle) {
    return (
      <EmptyState title={t('cycleDetail.notFoundTitle')} detail={t('cycleDetail.notFoundDetail')} />
    )
  }

  // The measure follows crop.measured_by, so exactly one of these is set.
  const measure =
    cycle.area_ha !== null
      ? formatArea(cycle.area_ha, 'hectare')
      : cycle.tree_count !== null
        ? t('cycleDetail.trees', { count: cycle.tree_count })
        : cycle.unit_count !== null
          ? t('cycleDetail.units', { count: cycle.unit_count })
          : '—'

  return (
    <section data-testid="cycle-detail" className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-lg font-semibold">
          {cycle.crop_name}
          {cycle.plot_label && <span className="font-normal text-deep/60"> · {cycle.plot_label}</span>}
        </h1>
        <ProvenanceBadge
          source={cycle.source}
          verification={cycle.verification}
          confidence={cycle.confidence ?? undefined}
          capturedAt={cycle.captured_at}
        />
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Detail label={t('cycleDetail.measure')} value={measure} />
        <Detail label={t('cycleDetail.status')} value={t(`cycleStatus.${cycle.status}`)} />
        <Detail
          label={t('cycleDetail.window')}
          value={`${formatPlainDate(cycle.harvest_start)} – ${formatPlainDate(cycle.harvest_end)}`}
        />
        {/* Free text until a season taxonomy is agreed (S22). Shown verbatim. */}
        <Detail label={t('cycleDetail.season')} value={cycle.season_label ?? '—'} />
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-deep/70">{t('cycleDetail.harvests')}</h2>
        {/* A harvest figure is a series, not a value: superseded rows stay
            visible and labelled so a revised estimate has an audit trail. */}
        <p className="text-xs text-deep/60">{t('cycleDetail.seriesNote')}</p>

        {cycle.harvests.length === 0 ? (
          <EmptyState
            title={t('cycleDetail.noHarvestsTitle')}
            detail={t('cycleDetail.noHarvestsDetail')}
          />
        ) : (
          <ul className="space-y-2">
            {cycle.harvests.map((h) => (
              <li
                key={h.id}
                data-testid="cycle-harvest"
                data-current={h.is_current}
                className={`rounded border p-3 ${
                  h.is_current ? 'border-deep/10 bg-white/70' : 'border-deep/10 bg-deep/5'
                }`}
              >
                <p className="text-sm text-deep">
                  <span className="mr-2 rounded bg-deep/10 px-1.5 py-0.5 text-xs">
                    {t(`harvestKind.${h.kind}`)}
                  </span>
                  <span className="tabular font-medium">{formatKg(h.quantity_kg)}</span>
                  {!h.is_current && (
                    <span className="ml-2 text-xs text-deep/60">({t('cycleDetail.superseded')})</span>
                  )}
                </p>
                <div className="mt-1">
                  <ProvenanceBadge
                    source={h.source}
                    verification={h.verification}
                    confidence={h.confidence ?? undefined}
                    capturedAt={h.captured_at}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
