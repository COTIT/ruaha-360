import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { DrillLink } from '@/components/DrillLink'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { StatusPill } from '@/components/StatusPill'
import {
  useAttachSupply,
  useAvailableHarvest,
  useOpportunity,
} from '@/features/ops/useOpportunity'
import { formatKg, formatPlainDate } from '@/lib/format'

const route = getRouteApi('/_ops/ops/opportunities/$opportunityId')

/**
 * Spec 7.8 — the opportunity and its supply lines.
 *
 * opportunity_supply -> harvest_report -> crop_cycle -> plot -> farm IS the
 * traceability claim: every line drills to the record under it.
 *
 * The over-commitment error from opportunity_supply_guard is shown as written.
 * There is deliberately no client-side pre-check — a copy of the guard drifts,
 * and the message names the real numbers.
 */
export function OpportunityDetailScreen() {
  const { opportunityId } = route.useParams()
  const { t } = useTranslation()
  const query = useOpportunity(opportunityId)
  const opportunity = query.opportunity
  const available = useAvailableHarvest(opportunity?.village_id, opportunity?.crop_id)
  const attach = useAttachSupply(opportunityId, opportunity?.village_id)

  const [harvestId, setHarvestId] = useState('')
  const [kg, setKg] = useState('')

  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  if (query.isLoading) {
    return (
      <p data-testid="opportunity-loading" className="text-sm text-deep/60">
        {t('common.loading')}
      </p>
    )
  }

  // Zero rows is an answer: RLS says this opportunity is not visible.
  if (!opportunity) {
    return <EmptyState title={t('opportunity.notFoundTitle')} detail={t('opportunity.notFoundDetail')} />
  }

  const rows = available.data ?? []
  const selected = rows.find((r) => r.harvest_report_id === harvestId)

  return (
    <section className="max-w-3xl space-y-5" data-testid="opportunity-detail">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">
            {opportunity.buyer_name} · {opportunity.village_name}
          </h1>
          <StatusPill kind="opportunity" status={opportunity.status} />
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <Row label={t('demand.colCrop')} value={opportunity.crop_name} />
          <Row
            label={t('demand.colQuantity')}
            value={formatKg(opportunity.demand_quantity_kg)}
          />
          <Row
            label={t('opportunity.offered')}
            value={formatKg(opportunity.offered_quantity_kg)}
            testId="offered-total"
          />
        </dl>
        <p data-testid="offered-total-note" className="text-xs text-deep/60">
          {t('opportunity.offeredNote')}
        </p>
      </header>

      {/* An opportunity is not a sale. Stated on every opportunity surface. */}
      <p className="rounded border border-deep/15 bg-white/60 px-3 py-2 text-xs text-deep/70">
        {t('opportunity.notASale')}
      </p>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">{t('opportunity.supplyLines')}</h2>

        {opportunity.supply.length === 0 ? (
          <EmptyState
            title={t('opportunity.noSupplyTitle')}
            detail={t('opportunity.noSupplyDetail')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-deep/15 text-left">
                  <th scope="col" className="px-2 py-2 font-semibold">{t('opportunity.colFarmer')}</th>
                  <th scope="col" className="px-2 py-2 font-semibold">{t('opportunity.colPlot')}</th>
                  <th scope="col" className="px-2 py-2 font-semibold">{t('opportunity.colCycle')}</th>
                  <th scope="col" className="px-2 py-2 font-semibold">{t('opportunity.colContributed')}</th>
                </tr>
              </thead>
              <tbody>
                {opportunity.supply.map((line) => (
                  <tr
                    key={line.harvest_report_id}
                    data-testid="supply-row"
                    className="border-b border-deep/10"
                  >
                    <td className="px-2 py-2">
                      <DrillLink kind="person" id={line.person_id}>
                        {line.farmer ?? '—'}
                      </DrillLink>
                    </td>
                    <td className="px-2 py-2">{line.plot_label ?? '—'}</td>
                    <td className="px-2 py-2">
                      <DrillLink kind="cycle" id={line.crop_cycle_id}>
                        {line.crop_name}
                      </DrillLink>
                    </td>
                    <td className="tabular px-2 py-2">{formatKg(line.contributed_kg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="max-w-lg space-y-3 rounded border border-deep/10 bg-white/60 p-4">
        <h2 className="text-sm font-semibold">{t('opportunity.attachTitle')}</h2>

        {available.isLoading ? (
          <p className="text-sm text-deep/60">{t('common.loading')}</p>
        ) : rows.length === 0 ? (
          <EmptyState
            title={t('opportunity.noneAvailableTitle')}
            detail={t('opportunity.noneAvailableDetail')}
          />
        ) : (
          <>
            <div className="space-y-1">
              <label className="block text-sm font-medium" htmlFor="attach-harvest">
                {t('opportunity.attachHarvest')}
              </label>
              <select
                id="attach-harvest"
                data-testid="attach-harvest"
                value={harvestId}
                onChange={(e) => setHarvestId(e.target.value)}
                className="w-full rounded border border-deep/20 bg-white px-3 py-2"
              >
                <option value="">{t('opportunity.chooseHarvest')}</option>
                {/* Fully committed figures stay listed. Hiding them would be a
                    client-side pre-check of the guard. */}
                {rows.map((r) => (
                  <option key={r.harvest_report_id} value={r.harvest_report_id ?? ''}>
                    {formatKg(r.quantity_kg)} · {formatKg(r.available_kg)} {t('coverage.available')}
                    {r.harvest_start ? ` · ${formatPlainDate(r.harvest_start)}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium" htmlFor="attach-kg">
                {t('opportunity.attachKg')}
              </label>
              <input
                id="attach-kg"
                data-testid="attach-kg"
                inputMode="decimal"
                value={kg}
                onChange={(e) => setKg(e.target.value)}
                className="w-full rounded border border-deep/20 bg-white px-3 py-2"
              />
            </div>

            {attach.isError && (
              <div data-testid="attach-error">
                <ErrorState error={attach.error} onRetry={() => attach.reset()} />
              </div>
            )}

            <button
              type="button"
              data-testid="attach-submit"
              disabled={attach.isPending || !selected || kg === ''}
              onClick={() =>
                attach.mutate({
                  harvestReportId: selected!.harvest_report_id!,
                  cropCycleId: selected!.crop_cycle_id!,
                  contributedKg: Number(kg),
                })
              }
              className="rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {attach.isPending ? t('opportunity.attaching') : t('opportunity.attach')}
            </button>
          </>
        )}
      </section>
    </section>
  )
}

function Row({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-deep/60">{label}</dt>
      <dd data-testid={testId} className="tabular font-medium">
        {value}
      </dd>
    </div>
  )
}
