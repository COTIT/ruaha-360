import { useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'

import { DataTable } from '@/components/DataTable'
import { ErrorState } from '@/components/ErrorState'
import { useVillageCapacity, type VillageCapacity } from '@/features/ops/useOpsReference'
import { formatKw, formatPlainDate } from '@/lib/format'

/** Absent is not zero: a village with no capacity row has no figure, not 0 kW. */
const DASH = '—'

/**
 * Spec 7.9 — villages, with `village_capacity` showing `basis` and
 * `simultaneity_factor` EXPLICITLY.
 *
 * Capacity is planned, never measured. `capacity_basis` has no 'measured'
 * value on purpose, and the basis is rendered beside every figure so a planned
 * number can never be read as a metered one.
 */
export function VillagesScreen() {
  const { t } = useTranslation()
  const query = useVillageCapacity()

  const columns = useMemo(() => {
    const col = createColumnHelper<VillageCapacity>()
    return [
      col.accessor('name', { header: t('villages.colName') }),
      col.accessor('code', { header: t('villages.colCode') }),
      col.accessor('capacity_kw', {
        header: t('villages.colCapacity'),
        cell: (c) => (
          <span className="tabular">
            {c.getValue() === null ? DASH : formatKw(c.getValue() as number)}
          </span>
        ),
      }),
      // Never presented as measured. The basis travels with the figure.
      col.accessor('basis', {
        header: t('villages.colBasis'),
        cell: (c) => (
          <span data-testid="village-basis">
            {c.getValue() === null ? DASH : t(`capacityBasis.${c.getValue()}`)}
          </span>
        ),
      }),
      col.accessor('simultaneity_factor', {
        header: t('villages.colSimultaneity'),
        cell: (c) => <span className="tabular">{c.getValue() ?? DASH}</span>,
      }),
      col.accessor('effective_from', {
        header: t('villages.colEffectiveFrom'),
        cell: (c) => (c.getValue() ? formatPlainDate(c.getValue() as string) : DASH),
      }),
    ]
  }, [t])

  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">{t('villages.title')}</h1>
        <p data-testid="villages-note" className="text-xs text-deep/60">
          {t('villages.plannedNote')}
        </p>
      </header>

      {query.isLoading ? (
        <p data-testid="villages-loading" className="text-sm text-deep/60">
          {t('common.loading')}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={query.data ?? []}
          testId="villages-table"
          rowTestId="village-row"
          empty={{ title: t('villages.noneTitle'), detail: t('villages.noneDetail') }}
        />
      )}

      <p className="text-xs text-deep/60">{t('villages.simultaneityNote')}</p>
    </section>
  )
}
