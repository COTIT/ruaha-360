import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { useScopeNames } from '@/app/scope'
import { CoverageBar } from '@/components/CoverageBar'
import { DrillLink } from '@/components/DrillLink'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { StatusPill } from '@/components/StatusPill'
import {
  useCreateOpportunity,
  useDemand,
  useDemandMatches,
  useVillageSupply,
} from '@/features/ops/useDemand'
import { formatKg, formatMoney, formatPercent, formatPlainDate } from '@/lib/format'

const route = getRouteApi('/_ops/ops/demand/$demandId')

/**
 * Spec 7.7 — the comparison, not a match. No allocation, no ranking.
 *
 * Every figure on this screen is read from a view. The client does not
 * aggregate and does not calculate coverage (business-rules §11): coverage_pct
 * comes from v_demand_match and committed_kg from v_village_supply.
 *
 * v_demand_match produces NO ROWS when nothing overlaps, so the zero is
 * STATED rather than left to an empty table. The seeded coffee demand is
 * exactly that case, and hiding it would misrepresent the programme.
 */
export function DemandDetailScreen() {
  const { demandId } = route.useParams()
  const { t } = useTranslation()
  const demandQuery = useDemand(demandId)
  const matchQuery = useDemandMatches(demandId)
  const supplyQuery = useVillageSupply(demandQuery.demand?.crop_id)
  const scope = useScopeNames()
  const createOpportunity = useCreateOpportunity(demandId)

  const error = demandQuery.error ?? matchQuery.error ?? supplyQuery.error
  if (error) return <ErrorState error={error} onRetry={() => void demandQuery.refetch()} />

  if (demandQuery.isLoading) {
    return (
      <p data-testid="demand-detail-loading" className="text-sm text-deep/60">
        {t('common.loading')}
      </p>
    )
  }

  // Zero rows is an answer: RLS says this demand is not visible.
  if (!demandQuery.demand) {
    return <EmptyState title={t('demand.notFoundTitle')} detail={t('demand.notFoundDetail')} />
  }

  const demand = demandQuery.demand
  const matches = matchQuery.data ?? []
  const villageName = (id: string | null) =>
    (id ? scope.data?.villages[id] : undefined) ?? id ?? '—'

  // committed_kg for the village, from the view that summed it.
  const committedFor = (villageId: string | null) =>
    (supplyQuery.data ?? [])
      .filter((s) => s.village_id === villageId)
      .reduce<number | null>((sum, s) => (sum ?? 0) + (s.committed_kg ?? 0), null)

  return (
    <section className="max-w-3xl space-y-5" data-testid="demand-detail">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">{demand.buyer_name}</h1>
          <StatusPill kind="demand" status={demand.status} />
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <Row label={t('demand.colCrop')} value={demand.crop_name} />
          <Row label={t('demand.colQuantity')} value={formatKg(demand.quantity_kg)} />
          <Row
            label={t('demand.window')}
            value={`${formatPlainDate(demand.window_start)} – ${formatPlainDate(demand.window_end)}`}
          />
          <Row
            label={t('demand.colPrice')}
            value={`${formatMoney(demand.indicative_price_per_kg, demand.currency)} (${t('equipment.indicative')})`}
          />
          {demand.delivery_point && (
            <Row label={t('demand.deliveryPoint')} value={demand.delivery_point} />
          )}
          {demand.quality_note && <Row label={t('demand.qualityNote')} value={demand.quality_note} />}
        </dl>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">{t('demand.matches')}</h2>

        {matchQuery.isLoading ? (
          <p className="text-sm text-deep/60">{t('common.loading')}</p>
        ) : matches.length === 0 ? (
          // An honest zero, stated. The demand above stays on screen.
          <div data-testid="no-matching-supply">
            <EmptyState title={t('demand.noSupplyTitle')} detail={t('demand.noSupplyDetail')} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-deep/15 text-left">
                    <th scope="col" className="px-2 py-2 font-semibold">{t('demand.colVillage')}</th>
                    <th scope="col" className="px-2 py-2 font-semibold">{t('demand.colAvailable')}</th>
                    <th scope="col" className="px-2 py-2 font-semibold">{t('demand.colCoverable')}</th>
                    <th scope="col" className="px-2 py-2 font-semibold">{t('demand.colCoverage')}</th>
                    <th scope="col" className="px-2 py-2 font-semibold">{t('demand.colOpportunity')}</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((match) => (
                    <tr
                      key={match.village_id}
                      data-testid={`match-row-${match.village_id}`}
                      className="border-b border-deep/10"
                    >
                      <td className="px-2 py-2">{villageName(match.village_id)}</td>
                      <td className="tabular px-2 py-2">{formatKg(match.available_kg)}</td>
                      <td className="tabular px-2 py-2">{formatKg(match.coverable_kg)}</td>
                      <td className="tabular px-2 py-2">{formatPercent(match.coverage_pct)}</td>
                      <td className="px-2 py-2">
                        {match.opportunity_id ? (
                          <DrillLink kind="opportunity" id={match.opportunity_id}>
                            {t(`opportunityStatus.${match.opportunity_status ?? 'proposed'}`)}
                          </DrillLink>
                        ) : (
                          <button
                            type="button"
                            data-testid="create-opportunity"
                            disabled={createOpportunity.isPending}
                            onClick={() =>
                              createOpportunity.mutate({
                                villageId: match.village_id!,
                                cropId: demand.crop_id,
                                note: 'E2E-opportunity',
                              })
                            }
                            className="rounded border border-primary/40 bg-primary/5 px-2 py-1 text-xs font-medium text-primary disabled:opacity-60"
                          >
                            {createOpportunity.isPending
                              ? t('demand.creatingOpportunity')
                              : t('demand.createOpportunity')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* One bar per village: coverage is a per-village figure, and a
                single combined bar would be an aggregate the views never
                produced. */}
            {matches.map((match) => (
              <div
                key={`coverage-${match.village_id}`}
                data-testid={`coverage-${match.village_id}`}
                className="space-y-1 rounded border border-deep/10 bg-white/60 p-3"
              >
                <p className="text-xs font-medium">{villageName(match.village_id)}</p>
                <CoverageBar
                  demandKg={demand.quantity_kg}
                  availableKg={match.available_kg}
                  committedKg={supplyQuery.isLoading ? null : committedFor(match.village_id)}
                  coveragePct={match.coverage_pct}
                />
              </div>
            ))}
          </>
        )}

        {createOpportunity.isError && (
          <div data-testid="create-opportunity-error">
            <ErrorState error={createOpportunity.error} onRetry={() => createOpportunity.reset()} />
          </div>
        )}
      </section>

      {/* An opportunity is not a sale. Stated on every opportunity surface. */}
      <p className="rounded border border-deep/15 bg-white/60 px-3 py-2 text-xs text-deep/70">
        {t('demand.notASale')}
      </p>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-deep/60">{label}</dt>
      <dd className="tabular font-medium">{value}</dd>
    </div>
  )
}
