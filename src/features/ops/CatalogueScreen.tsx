import { useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'

import { DataTable } from '@/components/DataTable'
import { ErrorState } from '@/components/ErrorState'
import { IndicativePill, Loading } from '@/components/controls'
// Shared reference data, not a farmer-only concern: the same catalogue rows
// drive the farmer's request form (§6.3) and this ops list (§7.4), scoped the
// same way by equipment_read -> app_projects(). One hook, two readers.
import { useEquipmentList, type EquipmentItem } from '@/features/farmer/useEquipment'
import { formatKw, formatMoney } from '@/lib/format'

/** A figure that is genuinely absent reads as absent, never as zero. */
const DASH = '—'

/**
 * Spec 7.4 — `/ops/catalogue`. **T1 for read; editing is T2** and deliberately
 * not offered, because "the seed provides the catalogue for the demo".
 *
 * `rated_power_kw` and `indicative_price` are nullable. A null rated power
 * causes `pue_recompute_estimate` to DELETE the estimate rather than zero it
 * (business-rules §3), so rendering null as "0.000 kW" here would describe a
 * different piece of equipment than the one the database holds.
 */
export function CatalogueScreen() {
  const { t } = useTranslation()
  const query = useEquipmentList()

  const columns = useMemo(() => {
    const col = createColumnHelper<EquipmentItem>()
    return [
      col.accessor('name', { header: t('catalogue.colName') }),
      col.accessor('category_name', { header: t('catalogue.colCategory') }),
      col.accessor('rated_power_kw', {
        meta: { numeric: true },
        header: t('catalogue.colPower'),
        cell: (c) => (
          <span className="tabular">
            {c.getValue() === null ? DASH : formatKw(c.getValue() as number)}
          </span>
        ),
      }),
      col.accessor('typical_hours_per_day', {
        meta: { numeric: true },
        header: t('catalogue.colHours'),
        cell: (c) => <span className="tabular">{c.getValue() ?? DASH}</span>,
      }),
      col.accessor('typical_days_per_week', {
        meta: { numeric: true },
        header: t('catalogue.colDays'),
        cell: (c) => <span className="tabular">{c.getValue() ?? DASH}</span>,
      }),
      col.accessor('indicative_price', {
        header: t('catalogue.colPrice'),
        meta: { numeric: true },
        cell: (c) => (
          /* The tag travels with the number, and absent stays absent. */
          <span
            data-testid="catalogue-price"
            className="inline-flex flex-wrap items-baseline justify-end gap-2"
          >
            {c.getValue() === null ? (
              <span className="tabular">{DASH}</span>
            ) : (
              <>
                <span className="tabular font-semibold">
                  {formatMoney(c.getValue() as number, c.row.original.currency)}
                </span>
                <IndicativePill />
              </>
            )}
          </span>
        ),
      }),
    ]
  }, [t])

  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1.5">
        <h1 className="type-screen-title">{t('catalogue.title')}</h1>
        {/* Prices are indicative, never quotations. Stated once for the whole
            table as well as on every row. */}
        <p data-testid="catalogue-note" className="type-note" style={{ color: 'var(--ink-3)' }}>
          {t('equipment.notAQuotation')}
        </p>
      </header>

      {query.isLoading ? (
        <Loading testId="catalogue-loading" />
      ) : (
        <DataTable
          columns={columns}
          data={query.items}
          testId="catalogue-table"
          rowTestId="catalogue-row"
          empty={{ title: t('equipment.noneTitle'), detail: t('equipment.noneDetail') }}
        />
      )}
    </section>
  )
}
