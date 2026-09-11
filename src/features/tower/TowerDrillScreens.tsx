import { Link, getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { DrillLink } from '@/components/DrillLink'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { StatusPill } from '@/components/StatusPill'
import { partitionEnergyRows, type EnergyRow } from '@/features/tower/energyRows'
import { validateVillageSearch } from '@/features/tower/towerSearch'
import {
  useTowerEnergy,
  useTowerEnergyRows,
  useTowerMarket,
  useTowerProduction,
  useTowerProductionRows,
} from '@/features/tower/useTower'
import { formatArea, formatKg, formatKw, formatPercent, formatPlainDate } from '@/lib/format'

/**
 * Spec 8.2 — each drill-down is a table that ends in a link to an actual row.
 *
 * "If a number cannot be traced, it does not belong on the screen." So every
 * row here carries a DrillLink to the record underneath it.
 */

const productionRoute = getRouteApi('/_ops/ops/tower/production')
const energyRoute = getRouteApi('/_ops/ops/tower/energy')
const marketRoute = getRouteApi('/_ops/ops/tower/market')

function BackToTower({ village }: { village: string | undefined }) {
  const { t } = useTranslation()
  return (
    <Link
      to="/ops/tower"
      search={{ village } as never}
      className="text-sm font-medium text-primary underline underline-offset-4"
    >
      {t('tower.backToTower')}
    </Link>
  )
}

export function TowerProductionScreen() {
  const { t } = useTranslation()
  const { village } = validateVillageSearch(productionRoute.useSearch())
  const totals = useTowerProduction(village)
  const cycles = useTowerProductionRows(village)

  const error = totals.error ?? cycles.error
  if (error) return <ErrorState error={error} onRetry={() => void cycles.refetch()} />

  return (
    <section className="space-y-4">
      <BackToTower village={village} />
      <h1 className="text-lg font-semibold">{t('tower.productionDrill')}</h1>

      {/* The grouped figures the tile shows, so the drill-down and the
          headline are visibly the same numbers. */}
      {!totals.isLoading && (totals.data ?? []).length > 0 && (
        <ul className="flex flex-wrap gap-3 text-xs">
          {(totals.data ?? []).map((row) => (
            <li
              key={`${row.crop_id}-${row.window_month}`}
              className="rounded border border-deep/10 bg-white/60 px-2 py-1"
            >
              {row.crop_name} · {formatPlainDate(row.window_month)} ·{' '}
              <span className="tabular font-medium">{formatKg(row.expected_kg)}</span>
            </li>
          ))}
        </ul>
      )}

      {cycles.isLoading ? (
        <p className="text-sm text-deep/60">{t('common.loading')}</p>
      ) : (cycles.data ?? []).length === 0 ? (
        <EmptyState title={t('tower.noDataTitle')} detail={t('tower.noDataDetail')} />
      ) : (
        <div className="overflow-x-auto">
          <table data-testid="production-table" className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-deep/15 text-left">
                <Th>{t('tower.colCrop')}</Th>
                <Th>{t('opportunity.colFarmer')}</Th>
                <Th>{t('opportunity.colPlot')}</Th>
                <Th>{t('tower.colWindow')}</Th>
                <Th>{t('tower.plantedArea')}</Th>
                <Th>{t('tower.colExpected')}</Th>
                <Th>{t('tower.colActual')}</Th>
              </tr>
            </thead>
            <tbody>
              {(cycles.data ?? []).map((row) => (
                <tr key={row.id} data-testid="production-row" className="border-b border-deep/10">
                  <td data-testid="production-cycle" className="px-2 py-2">
                    {/* Ends in a link to an actual row: this crop cycle. */}
                    <DrillLink kind="cycle" id={row.id}>
                      {row.crop_name}
                    </DrillLink>
                  </td>
                  <td className="px-2 py-2">
                    <DrillLink kind="person" id={row.person_id}>
                      {row.farmer ?? '—'}
                    </DrillLink>
                  </td>
                  <td className="px-2 py-2">{row.plot_label ?? '—'}</td>
                  <td className="px-2 py-2">
                    {formatPlainDate(row.harvest_start)} – {formatPlainDate(row.harvest_end)}
                  </td>
                  <td className="tabular px-2 py-2">{formatArea(row.area_ha, 'hectare')}</td>
                  <td className="tabular px-2 py-2">{formatKg(row.expected_kg)}</td>
                  <td className="tabular px-2 py-2">{formatKg(row.actual_kg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-deep/50">{t('tower.plantedAreaNote')}</p>
    </section>
  )
}

/**
 * One energy figure and the rows behind it.
 *
 * `rawKw` and `peakKw` both come from `v_village_energy` — the sum is NOT
 * computed from the rows. Business-rules §11 puts village aggregates in the
 * database, and showing a client-side total here would be a second source of
 * truth that could disagree with the tile the user just clicked.
 */
function EnergyGroup({
  testId,
  title,
  note,
  rows,
  rawKw,
  factor,
  peakKw,
  peakTestId,
}: {
  testId: string
  title: string
  note: string
  rows: EnergyRow[]
  rawKw: number | null
  factor: number | null
  peakKw: number | null
  peakTestId: string
}) {
  const { t } = useTranslation()

  return (
    <tbody data-testid={testId} className="border-b-2 border-deep/15">
      <tr className="bg-deep/5">
        <th colSpan={4} className="px-2 py-2 text-left">
          <span className="font-semibold text-deep">{title}</span>
          <span className="ml-2 font-normal text-xs text-deep/60">{note}</span>
        </th>
      </tr>

      {rows.length === 0 ? (
        <tr>
          <td colSpan={4} className="px-2 py-3 text-sm text-deep/60">
            {t('tower.noneInFigure')}
          </td>
        </tr>
      ) : (
        rows.map((row) => (
          <tr key={row.id} data-testid="energy-row" className="border-b border-deep/10">
            <td className="px-2 py-2">{row.applicant}</td>
            <td className="px-2 py-2">{row.equipment_name}</td>
            <td className="px-2 py-2">
              <StatusPill kind="request" status={row.status} />
            </td>
            <td className="tabular px-2 py-2">
              {/* Ends in the request itself. */}
              <DrillLink kind="request" id={row.id}>
                {formatKw(row.est_power_kw)}
              </DrillLink>
            </td>
          </tr>
        ))
      )}

      {/* The arithmetic stated on screen, so the rows above visibly reconcile
          with the headline the user clicked to get here. */}
      <tr className="text-sm">
        <td colSpan={3} className="px-2 py-2 text-right text-deep/70">
          {t('tower.sumOfPeaks')} <span className="tabular">{formatKw(rawKw)}</span>
          {factor !== null && (
            <> {t('tower.timesFactor', { factor })} </>
          )}
        </td>
        <td data-testid={peakTestId} className="tabular px-2 py-2 font-semibold">
          {formatKw(peakKw)}
        </td>
      </tr>
    </tbody>
  )
}

export function TowerEnergyScreen() {
  const { t } = useTranslation()
  const { village } = validateVillageSearch(energyRoute.useSearch())
  const rows = useTowerEnergyRows(village)
  const totals = useTowerEnergy(village)

  const error = rows.error ?? totals.error
  if (error) return <ErrorState error={error} onRetry={() => void rows.refetch()} />

  const { prospective, approved, excluded } = partitionEnergyRows(rows.data ?? [])
  const energy = totals.data
  const isLoading = rows.isLoading || totals.isLoading

  return (
    <section className="space-y-3">
      <BackToTower village={village} />
      <h1 className="text-lg font-semibold">{t('tower.energyDrill')}</h1>

      {isLoading ? (
        <p className="text-sm text-deep/60">{t('common.loading')}</p>
      ) : (rows.data ?? []).length === 0 ? (
        <EmptyState title={t('tower.noDataTitle')} detail={t('tower.noDataDetail')} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table data-testid="energy-table" className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-deep/15 text-left">
                  <Th>{t('tower.colApplicant')}</Th>
                  <Th>{t('tower.colEquipment')}</Th>
                  <Th>{t('tower.colStatus')}</Th>
                  <Th>{t('tower.colPeak')}</Th>
                </tr>
              </thead>

              {/* Grouped by the figure each row feeds. Ungrouped, the column
                  added to a number that appeared nowhere on the Tower. */}
              <EnergyGroup
                testId="energy-group-prospective"
                title={t('tower.prospectivePeak')}
                note={t('tower.prospectiveNote')}
                rows={prospective}
                rawKw={energy?.prospective_kw_raw ?? null}
                factor={energy?.simultaneity_factor ?? null}
                peakKw={energy?.prospective_peak_kw ?? null}
                peakTestId="energy-prospective-peak"
              />

              <EnergyGroup
                testId="energy-group-approved"
                title={t('tower.approvedPeak')}
                note={t('tower.approvedNote')}
                rows={approved}
                rawKw={energy?.approved_kw_raw ?? null}
                factor={energy?.simultaneity_factor ?? null}
                peakKw={energy?.approved_peak_kw ?? null}
                peakTestId="energy-approved-peak"
              />
            </table>
          </div>

          {/* Prospective and approved are never added together. */}
          <p className="text-xs font-medium text-deep/70">{t('tower.neverSummed')}</p>

          {/* Draft, rejected and withdrawn requests feed neither figure. Said
              out loud rather than silently omitted, so the pipeline does not
              look smaller here than on the tile that counts every status. */}
          {excluded.length > 0 && (
            <p data-testid="energy-excluded" className="text-xs text-deep/60">
              {t('tower.excludedFromFigures', { count: excluded.length })}
            </p>
          )}
        </>
      )}
      <p className="text-xs text-deep/50">{t('estimate.isEstimate')}</p>
    </section>
  )
}

export function TowerMarketScreen() {
  const { t } = useTranslation()
  const { village } = validateVillageSearch(marketRoute.useSearch())
  const query = useTowerMarket(village)

  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  const matches = query.data?.matches ?? []

  return (
    <section className="space-y-3">
      <BackToTower village={village} />
      <h1 className="text-lg font-semibold">{t('tower.marketDrill')}</h1>

      {query.isLoading ? (
        <p className="text-sm text-deep/60">{t('common.loading')}</p>
      ) : matches.length === 0 ? (
        <EmptyState title={t('demand.noSupplyTitle')} detail={t('demand.noSupplyDetail')} />
      ) : (
        <div className="overflow-x-auto">
          <table data-testid="market-table" className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-deep/15 text-left">
                <Th>{t('tower.colBuyer')}</Th>
                <Th>{t('tower.colCrop')}</Th>
                <Th>{t('tower.colDemand')}</Th>
                <Th>{t('tower.colAvailable')}</Th>
                <Th>{t('tower.colCoverage')}</Th>
                <Th>{t('tower.colOpportunity')}</Th>
              </tr>
            </thead>
            <tbody>
              {matches.map((row) => (
                <tr
                  key={`${row.buyer_demand_id}-${row.village_id}`}
                  data-testid="market-row"
                  className="border-b border-deep/10"
                >
                  <td className="px-2 py-2">
                    <DrillLink kind="demand" id={row.buyer_demand_id}>
                      {row.buyer_name}
                    </DrillLink>
                  </td>
                  <td className="px-2 py-2">{row.crop_name}</td>
                  <td className="tabular px-2 py-2">{formatKg(row.demand_kg)}</td>
                  <td className="tabular px-2 py-2">{formatKg(row.available_kg)}</td>
                  <td className="tabular px-2 py-2">{formatPercent(row.coverage_pct)}</td>
                  <td data-testid="market-opportunity" className="px-2 py-2">
                    {/* Ends in the opportunity's supply lines, which are the
                        records the coverage figure is built from. */}
                    <DrillLink kind="opportunity" id={row.opportunity_id}>
                      {row.opportunity_id
                        ? t(`opportunityStatus.${row.opportunity_status ?? 'proposed'}`)
                        : '—'}
                    </DrillLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-deep/50">{t('demand.notASale')}</p>
    </section>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="px-2 py-2 font-semibold">
      {children}
    </th>
  )
}
