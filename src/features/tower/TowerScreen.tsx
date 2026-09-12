import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { useScopeNames } from '@/app/scope'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Figure, TowerTile } from '@/features/tower/TowerTile'
import {
  useTowerEnergy,
  useTowerMarket,
  useTowerPipeline,
  useTowerProduction,
  useTowerQuality,
} from '@/features/tower/useTower'
import { validateVillageSearch } from '@/features/tower/towerSearch'
import { formatArea, formatKg, formatKw, formatKwh, formatMoney, formatPercent, formatPlainDate } from '@/lib/format'

const route = getRouteApi('/_ops/ops/tower/')

/**
 * Spec 8.1 — the overview: a village selector and five tiles.
 *
 * Built last, from connected records. Every figure comes from a view; the
 * client does not aggregate. The labelling rules on this screen are product
 * requirements rather than copy preferences, so each is stated inline.
 */
export function TowerScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  // Validated at the point of use: the router hands back raw search params.
  const { village } = validateVillageSearch(route.useSearch())
  const scope = useScopeNames()

  const production = useTowerProduction(village)
  const pipeline = useTowerPipeline(village)
  const energy = useTowerEnergy(village)
  const market = useTowerMarket(village)
  const quality = useTowerQuality(village)

  const error =
    production.error ?? pipeline.error ?? energy.error ?? market.error ?? quality.error ?? scope.error
  if (error) return <ErrorState error={error} onRetry={() => void production.refetch()} />

  const search = { village }

  return (
    <section className="space-y-4" data-testid="tower">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">{t('tower.title')}</h1>
        <label className="text-sm">
          <span className="mr-2 text-deep/60">{t('tower.village')}</span>
          <select
            data-testid="tower-village"
            value={village ?? ''}
            onChange={(e) =>
              void navigate({
                to: '/ops/tower',
                search: { village: e.target.value || undefined },
                replace: true,
              })
            }
            className="rounded border border-deep/20 bg-white px-2 py-1"
          >
            <option value="">{t('tower.chooseVillage')}</option>
            {Object.entries(scope.data?.villages ?? {}).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </header>

      {!village ? (
        <EmptyState title={t('tower.noVillageTitle')} detail={t('tower.noVillageDetail')} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* ── Production ───────────────────────────────── */}
          <TowerTile
            id="production"
            title={t('tower.production')}
            note={t('tower.productionNote')}
            drillTo="/ops/tower/production"
            drillSearch={search}
            loading={production.isLoading}
          >
            {production.isLoading ? (
              <Loading />
            ) : (production.data ?? []).length === 0 ? (
              <EmptyState title={t('tower.noDataTitle')} detail={t('tower.noDataDetail')} />
            ) : (
              <ul className="space-y-2">
                {(production.data ?? []).map((row) => (
                  <li key={`${row.crop_id}-${row.window_month}`} className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {row.crop_name} · {formatPlainDate(row.window_month)}
                    </p>
                    <Figure label={t('tower.expected')} value={formatKg(row.expected_kg)} />
                    <Figure label={t('tower.actual')} value={formatKg(row.actual_kg)} />
                    {row.cycle_area_ha !== null && (
                      <Figure
                        label={t('tower.plantedArea')}
                        value={formatArea(row.cycle_area_ha, 'hectare')}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
            {/* Never "land area": intercropping means cycle areas can exceed
                the village's hectares. */}
            <p className="text-xs text-deep/50">{t('tower.plantedAreaNote')}</p>
          </TowerTile>

          {/* ── PUE pipeline ─────────────────────────────── */}
          <TowerTile
            id="pue"
            title={t('tower.pue')}
            note={t('tower.pueNote')}
            drillTo="/ops/requests"
            drillSearch={{}}
            loading={pipeline.isLoading}
          >
            {pipeline.isLoading ? (
              <Loading />
            ) : (pipeline.data ?? []).length === 0 ? (
              <EmptyState title={t('tower.noDataTitle')} detail={t('tower.noDataDetail')} />
            ) : (
              <ul className="space-y-1">
                {(pipeline.data ?? []).map((row) => (
                  <li key={`${row.status}-${row.currency}`}>
                    <Figure
                      label={`${t(`requestStatus.${row.status ?? 'draft'}`)} · ${row.request_count ?? 0} ${t('tower.requests')}`}
                      value={`${formatMoney(row.indicative_value, row.currency ?? 'TZS')} (${t('equipment.indicative')})`}
                    />
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-deep/50">{t('tower.indicativeValueNote')}</p>
          </TowerTile>

          {/* ── Energy ───────────────────────────────────── */}
          <TowerTile
            id="energy"
            title={t('tower.energy')}
            drillTo="/ops/tower/energy"
            drillSearch={search}
            loading={energy.isLoading}
          >
            {energy.isLoading ? (
              <Loading />
            ) : !energy.data ? (
              <EmptyState title={t('tower.noCapacityTitle')} detail={t('tower.noCapacityDetail')} />
            ) : (
              <div className="space-y-2">
                {/* Capacity is PLANNED, never measured. Always with its basis. */}
                <Figure
                  label={t('tower.capacity')}
                  value={formatKw(energy.data.capacity_kw)}
                  testId="tower-capacity"
                  note={`${t('tower.basis')}: ${t(`capacityBasis.${energy.data.capacity_basis ?? 'planned'}`)}`}
                />
                <Figure
                  label={t('tower.prospectivePeak')}
                  value={formatKw(energy.data.prospective_peak_kw)}
                  testId="tower-prospective-peak"
                  note={t('tower.prospectiveNote')}
                />
                <Figure
                  label={t('tower.approvedPeak')}
                  value={formatKw(energy.data.approved_peak_kw)}
                  testId="tower-approved-peak"
                  note={t('tower.approvedNote')}
                />
                <Figure
                  label={t('tower.headroom')}
                  value={formatKw(energy.data.headroom_kw)}
                  testId="tower-headroom"
                />
                {/* The factor sits with the peaks it was applied to. */}
                <Figure
                  label={t('tower.simultaneity')}
                  value={String(energy.data.simultaneity_factor ?? '')}
                  testId="tower-simultaneity"
                  note={t('tower.simultaneityNote')}
                />
                <Figure
                  label={t('estimate.perWeek')}
                  value={formatKwh(energy.data.approved_kwh_per_week)}
                />
                {/* Prospective and approved are never summed. */}
                <p className="text-xs font-medium text-deep/70">{t('tower.neverSummed')}</p>
              </div>
            )}
          </TowerTile>

          {/* ── Market ───────────────────────────────────── */}
          <TowerTile
            id="market"
            title={t('tower.market')}
            note={t('tower.marketNote')}
            drillTo="/ops/tower/market"
            drillSearch={search}
            loading={market.isLoading}
          >
            {market.isLoading ? (
              <Loading />
            ) : (market.data?.matches ?? []).length === 0 ? (
              <EmptyState title={t('tower.noDataTitle')} detail={t('tower.noDataDetail')} />
            ) : (
              <ul className="space-y-2">
                {(market.data?.matches ?? []).map((row) => (
                  <li key={row.buyer_demand_id} className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {row.buyer_name} · {row.crop_name}
                    </p>
                    <Figure label={t('tower.openDemand')} value={formatKg(row.demand_kg)} />
                    <Figure label={t('tower.available')} value={formatKg(row.available_kg)} />
                    <Figure label={t('tower.coverage')} value={formatPercent(row.coverage_pct)} />
                  </li>
                ))}
              </ul>
            )}
          </TowerTile>

          {/* ── Data quality ─────────────────────────────── */}
          <TowerTile id="quality" title={t('tower.quality')} note={t('tower.qualityNote')}>
            {quality.isLoading ? (
              <Loading />
            ) : !quality.data ? (
              <EmptyState title={t('tower.noDataTitle')} detail={t('tower.noDataDetail')} />
            ) : (
              <div className="space-y-2">
                <Figure
                  label={t('tower.personsVerified')}
                  value={`${quality.data.persons_verified ?? 0} / ${quality.data.persons ?? 0}`}
                />
                <Figure
                  label={t('tower.farmsWithGps')}
                  value={`${quality.data.farms_with_gps ?? 0} / ${quality.data.farms ?? 0}`}
                />
                <Figure
                  label={t('tower.cyclesWithEstimate')}
                  value={`${quality.data.cycles_with_estimate ?? 0} / ${quality.data.cycles ?? 0}`}
                />
              </div>
            )}
          </TowerTile>
        </div>
      )}
    </section>
  )
}

function Loading() {
  const { t } = useTranslation()
  return <p className="text-sm text-deep/60">{t('common.loading')}</p>
}
