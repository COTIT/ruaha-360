import { useTranslation } from 'react-i18next'

import { formatKg, formatPercent } from '@/lib/format'

export interface CoverageBarProps {
  demandKg: number | null
  availableKg: number | null
  committedKg: number | null
  coveragePct: number | null
}

/**
 * Demand against available supply, with the already-committed slice visible —
 * spec §9.1.
 *
 * The committed slice is the whole point: supply that looks available in a
 * total is not available if it is already promised to a live opportunity.
 *
 * Coverage is NOT computed here. v_demand_match calculates it, and this
 * renders what it was handed — so a disagreement between the percentage and
 * the figures is a view bug to fix in SQL, not something to paper over in the
 * client.
 */
export function CoverageBar({
  demandKg,
  availableKg,
  committedKg,
  coveragePct,
}: CoverageBarProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm text-deep/60">{t('coverage.label')}</span>
        <span data-testid="coverage-pct" className="tabular text-sm font-semibold">
          {formatPercent(coveragePct)}
        </span>
      </div>

      {coveragePct !== null && (
        <div
          role="meter"
          aria-label={t('coverage.label')}
          aria-valuenow={coveragePct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 w-full overflow-hidden rounded-full bg-deep/10"
        >
          <div
            className="h-full rounded-full bg-accent"
            // Capped so an over-supplied demand does not overflow the track;
            // the figure itself is still reported unmodified above.
            style={{ width: `${Math.min(Math.max(coveragePct, 0), 100)}%` }}
          />
        </div>
      )}

      <dl className="grid gap-y-1 text-xs">
        <Row label={t('coverage.demand')} testId="coverage-demand" value={formatKg(demandKg)} />
        <Row
          label={t('coverage.available')}
          testId="coverage-available"
          value={formatKg(availableKg)}
        />
        <Row
          label={t('coverage.committed')}
          testId="coverage-committed"
          value={formatKg(committedKg)}
        />
      </dl>

      <p className="text-xs text-deep/60">{t('coverage.committedNote')}</p>
    </div>
  )
}

function Row({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-deep/60">{label}</dt>
      <dd data-testid={testId} className="tabular font-medium">
        {value}
      </dd>
    </div>
  )
}
