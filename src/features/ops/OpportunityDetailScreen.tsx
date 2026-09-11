import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { DrillLink } from '@/components/DrillLink'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { StatusPill } from '@/components/StatusPill'
import {
  OPPORTUNITY_ACTION_TARGET,
  opportunityActions,
  releasesSupply,
  type OpportunityAction,
} from '@/features/ops/opportunityTransitions'
import {
  useAttachSupply,
  useAvailableHarvest,
  useOpportunity,
  useOpportunityStatus,
} from '@/features/ops/useOpportunity'
import { formatKg, formatPlainDate } from '@/lib/format'

const route = getRouteApi('/_ops/ops/opportunities/$opportunityId')

/** The four controls the machine can offer, in translation-key form. */
const ACTION_LABEL: Record<OpportunityAction, string> = {
  share: 'opportunity.actionShare',
  accept: 'opportunity.actionAccept',
  decline: 'opportunity.actionDecline',
  lapse: 'opportunity.actionLapse',
}

/**
 * Spec 7.8 — the opportunity and its supply lines.
 *
 * opportunity_supply -> harvest_report -> crop_cycle -> plot -> farm IS the
 * traceability claim: every line drills to the record under it.
 *
 * The over-commitment error from opportunity_supply_guard is shown as written.
 * There is deliberately no client-side pre-check — a copy of the guard drifts,
 * and the message names the real numbers.
 *
 * Status is the screen's other action. Declining or lapsing RELEASES the
 * committed supply (business-rules §7) and cannot be undone, so both go
 * through a confirmation that names the kilograms going back. There is no
 * "detach" control: `opportunity_supply` has no DELETE policy and no
 * `deleted_at`, and the release is how a wrong commitment is unwound.
 */
export function OpportunityDetailScreen() {
  const { opportunityId } = route.useParams()
  const { t } = useTranslation()
  const query = useOpportunity(opportunityId)
  const opportunity = query.opportunity
  const available = useAvailableHarvest(opportunity?.village_id, opportunity?.crop_id)
  const attach = useAttachSupply(opportunityId, opportunity?.village_id)
  const move = useOpportunityStatus(
    opportunityId,
    opportunity?.village_id,
    opportunity?.buyer_demand_id ?? undefined,
  )

  const [harvestId, setHarvestId] = useState('')
  const [kg, setKg] = useState('')
  /** The releasing action awaiting confirmation, if any. */
  const [confirming, setConfirming] = useState<OpportunityAction | null>(null)

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
  const actions = opportunityActions(opportunity.status)
  const released = actions.length === 0
  const offered = formatKg(opportunity.offered_quantity_kg)

  function act(action: OpportunityAction) {
    // Forward moves go straight through; the two that release supply and
    // cannot be reversed ask first.
    if (releasesSupply(action)) setConfirming(action)
    else move.mutate(OPPORTUNITY_ACTION_TARGET[action])
  }

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
          {/* Two quantities, and the screen's whole job is keeping them
              apart. "Quantity" named neither of them — QA #12. */}
          <Row
            label={t('opportunity.demandQuantity')}
            value={formatKg(opportunity.demand_quantity_kg)}
            rowTestId="demand-quantity-row"
          />
          <Row label={t('opportunity.offered')} value={offered} testId="offered-total" />
        </dl>
        <p data-testid="offered-total-note" className="text-xs text-deep/60">
          {t('opportunity.offeredNote')}
        </p>
      </header>

      {/* An opportunity is not a sale. Stated on every opportunity surface. */}
      <p className="rounded border border-deep/15 bg-white/60 px-3 py-2 text-xs text-deep/70">
        {t('opportunity.notASale')}
      </p>

      {released ? (
        // Declined and lapsed are terminal, so there is nothing to offer —
        // only an explanation of where the supply went. The lines stay listed
        // below: the record of what was offered is not erased.
        <p
          data-testid="released-note"
          className="rounded border border-deep/15 bg-white/60 px-3 py-2 text-xs text-deep/70"
        >
          {t('opportunity.releasedNote', { kg: offered })}
        </p>
      ) : confirming ? (
        <div
          data-testid="release-confirm"
          role="alertdialog"
          aria-label={t('opportunity.releaseTitle')}
          className="space-y-2 rounded border border-destructive/30 bg-destructive/5 p-3"
        >
          <p className="text-sm font-medium text-deep">{t('opportunity.releaseTitle')}</p>
          <p className="text-xs text-deep/70">
            {t('opportunity.releaseDetail', { kg: offered })}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="release-confirm-yes"
              onClick={() => {
                move.mutate(OPPORTUNITY_ACTION_TARGET[confirming])
                setConfirming(null)
              }}
              className="rounded bg-destructive px-3 py-2 text-sm font-medium text-white"
            >
              {t('opportunity.releaseYes')}
            </button>
            <button
              type="button"
              data-testid="release-confirm-no"
              onClick={() => setConfirming(null)}
              className="rounded border border-deep/20 px-3 py-2 text-sm font-medium"
            >
              {t('opportunity.releaseNo')}
            </button>
          </div>
        </div>
      ) : (
        <div data-testid="opportunity-actions" className="flex flex-wrap items-center gap-2">
          {actions.map((action) => (
            <button
              key={action}
              type="button"
              data-testid={`action-${action}`}
              disabled={move.isPending}
              onClick={() => act(action)}
              className={`rounded px-3 py-2 text-sm font-medium disabled:opacity-60 ${
                releasesSupply(action)
                  ? 'border border-destructive/30 text-destructive'
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              {t(ACTION_LABEL[action])}
            </button>
          ))}
          {/* One write, so one claim about it — rather than every button
              announcing that it is the one saving. */}
          {move.isPending && (
            <span data-testid="status-saving" className="text-sm text-deep/60">
              {t('opportunity.moving')}
            </span>
          )}
        </div>
      )}

      {/* The database's message, as written. §9's error contract. */}
      {move.isError && (
        <div data-testid="status-error">
          <ErrorState error={move.error} onRetry={() => move.reset()} />
        </div>
      )}

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

        {released ? (
          // committed_kg only sums live opportunities, so a line attached
          // here would be a commitment against nothing.
          <div data-testid="attach-closed">
            <EmptyState
              title={t('opportunity.attachClosedTitle')}
              detail={t('opportunity.attachClosedDetail')}
            />
          </div>
        ) : available.isLoading ? (
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
                    {/* Both figures named, in sentence case: an unlabelled
                        leading number on this screen is exactly the ambiguity
                        the rest of it exists to avoid. QA #12. */}
                    {t('opportunity.harvestOption', {
                      expected: formatKg(r.quantity_kg),
                      available: formatKg(r.available_kg),
                    })}
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

function Row({
  label,
  value,
  testId,
  rowTestId,
}: {
  label: string
  value: string
  testId?: string
  rowTestId?: string
}) {
  return (
    <div data-testid={rowTestId} className="flex items-baseline justify-between gap-3">
      <dt className="text-deep/60">{label}</dt>
      <dd data-testid={testId} className="tabular font-medium">
        {value}
      </dd>
    </div>
  )
}
