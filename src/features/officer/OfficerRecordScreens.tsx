import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { ProvenanceBadge } from '@/components/ProvenanceBadge'
import { railColour } from '@/components/controlStyles'
import { Loading } from '@/components/controls'
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
    <div
      className="flex min-w-0 flex-col gap-0.5 px-3.5 py-2.5"
      style={{
        flex: '1 1 160px',
        border: '1px solid var(--rule)',
        borderRadius: 'var(--radius-control)',
        background: 'var(--sand-2)',
      }}
    >
      <p className="type-note" style={{ color: 'var(--ink-2)' }}>
        {label}
      </p>
      <p className="tabular" style={{ fontSize: 15, fontWeight: 500 }}>
        {value}
      </p>
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
      <Loading testId="farm-detail-loading" />
    )
  }

  const farm = query.data
  // Zero rows is an answer: the farm does not exist, or RLS puts it outside
  // this officer's villages. Never an error.
  if (!farm) {
    return <EmptyState title={t('farmDetail.notFoundTitle')} detail={t('farmDetail.notFoundDetail')} />
  }

  return (
    <section data-testid="farm-detail" className="flex max-w-2xl flex-col gap-4">
      <header className="flex flex-wrap items-center gap-2.5">
        <h1 className="type-screen-title">{farm.label}</h1>
        <ProvenanceBadge
          source={farm.source}
          verification={farm.verification}
          confidence={farm.confidence ?? undefined}
          capturedAt={farm.captured_at}
        />
      </header>

      <div className="flex flex-wrap gap-2.5">
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

      <div className="flex flex-col gap-2.5">
        <h2 className="type-section" style={{ color: 'var(--ink-3)' }}>
          {t('farmDetail.plots')}
        </h2>
        {farm.plots.length === 0 ? (
          <EmptyState title={t('farmDetail.noPlotsTitle')} detail={t('farmDetail.noPlotsDetail')} />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {farm.plots.map((plot) => (
              <li
                key={plot.id}
                data-testid="farm-plot"
                className="flex flex-col gap-2 p-4"
                style={{
                  border: '1px solid var(--rule)',
                  borderLeft: `3px solid ${railColour(plot.verification)}`,
                  borderRadius: 'var(--radius-card)',
                  background: 'var(--paper)',
                }}
              >
                <p className="flex flex-wrap items-baseline gap-2.5">
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{plot.label}</span>
                  <span className="tabular" style={{ fontSize: 14, color: 'var(--ink-2)' }}>
                    {formatArea(plot.area_ha, 'hectare')}
                  </span>
                </p>
                <ProvenanceBadge
                  compact
                  source={plot.source}
                  verification={plot.verification}
                  confidence={plot.confidence ?? undefined}
                  capturedAt={plot.captured_at}
                />
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
      <Loading testId="cycle-detail-loading" />
    )
  }

  const cycle = query.cycle
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
      <header className="flex flex-wrap items-center gap-2.5">
        <h1 className="type-screen-title">
          {cycle.crop_name}
          {cycle.plot_label && (
            <span style={{ fontWeight: 400, color: 'var(--ink-2)' }}> · {cycle.plot_label}</span>
          )}
        </h1>
        <ProvenanceBadge
          source={cycle.source}
          verification={cycle.verification}
          confidence={cycle.confidence ?? undefined}
          capturedAt={cycle.captured_at}
        />
      </header>

      <div className="flex flex-wrap gap-2.5">
        <Detail label={t('cycleDetail.measure')} value={measure} />
        <Detail label={t('cycleDetail.status')} value={t(`cycleStatus.${cycle.status}`)} />
        <Detail
          label={t('cycleDetail.window')}
          value={`${formatPlainDate(cycle.harvest_start)} – ${formatPlainDate(cycle.harvest_end)}`}
        />
        {/* Free text until a season taxonomy is agreed (S22). Shown verbatim. */}
        <Detail label={t('cycleDetail.season')} value={cycle.season_label ?? '—'} />
      </div>

      <div className="flex flex-col gap-2.5">
        <h2 className="type-section" style={{ color: 'var(--ink-3)' }}>
          {t('cycleDetail.harvests')}
        </h2>
        {/* A harvest figure is a series, not a value: superseded rows stay
            visible and labelled so a revised estimate has an audit trail. */}
        <p className="type-note" style={{ color: 'var(--ink-3)', textWrap: 'pretty' }}>
          {t('cycleDetail.seriesNote')}
        </p>

        {cycle.harvests.length === 0 ? (
          <EmptyState
            title={t('cycleDetail.noHarvestsTitle')}
            detail={t('cycleDetail.noHarvestsDetail')}
          />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {cycle.harvests.map((h) => (
              <li
                key={h.id}
                data-testid="cycle-harvest"
                data-current={h.is_current}
                className="flex flex-col gap-2 p-4"
                style={{
                  /*
                    The current figure is outlined in blue; a superseded one is
                    hatched and struck through. The 3,200 kg the Tower excludes
                    stays visible and is obviously not counted.
                  */
                  border: h.is_current
                    ? '1.5px solid var(--primary)'
                    : '1px solid var(--rule-2)',
                  borderRadius: 'var(--radius-card)',
                  background: h.is_current ? 'var(--paper)' : 'var(--hatch), var(--sand-2)',
                }}
              >
                <p className="flex flex-wrap items-baseline gap-2.5">
                  <span
                    className="type-note px-2 py-0.5"
                    style={{
                      border: '1px solid var(--rule-2)',
                      borderRadius: 'var(--radius-pill)',
                      background: 'var(--paper)',
                      color: 'var(--ink-2)',
                    }}
                  >
                    {t(`harvestKind.${h.kind}`)}
                  </span>
                  <span
                    className="tabular font-semibold"
                    style={{
                      fontSize: 17,
                      ...(h.is_current
                        ? {}
                        : { textDecoration: 'line-through', color: 'var(--ink-2)' }),
                    }}
                  >
                    {formatKg(h.quantity_kg)}
                  </span>
                  {!h.is_current && (
                    <span className="type-note" style={{ color: 'var(--ink-3)' }}>
                      {t('cycleDetail.superseded')}
                    </span>
                  )}
                </p>
                <ProvenanceBadge
                  compact
                  source={h.source}
                  verification={h.verification}
                  confidence={h.confidence ?? undefined}
                  capturedAt={h.captured_at}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
