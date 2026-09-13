import { useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'

import { DataTable } from '@/components/DataTable'
import { ErrorState } from '@/components/ErrorState'
import { Loading } from '@/components/controls'
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
      /*
        Never presented as measured — and the basis lives INSIDE the capacity
        cell rather than in a column of its own, so no sort can separate a
        planned figure from the word that says it is planned.
      */
      col.accessor('capacity_kw', {
        header: t('villages.colCapacity'),
        meta: { numeric: true },
        cell: (c) => (
          <span className="inline-flex flex-wrap items-baseline justify-end gap-2">
            <span className="tabular font-semibold">
              {c.getValue() === null ? DASH : formatKw(c.getValue() as number)}
            </span>
            <span
              data-testid="village-basis"
              className="type-column-label px-2 py-[3px]"
              style={{
                border: '1px solid var(--rule-2)',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--hatch), var(--paper)',
                color: 'var(--ink-2)',
                fontWeight: 700,
              }}
            >
              {c.row.original.basis === null
                ? DASH
                : t(`capacityBasis.${c.row.original.basis}`)}
            </span>
          </span>
        ),
      }),
      col.accessor('simultaneity_factor', {
        header: t('villages.colSimultaneity'),
        meta: { numeric: true },
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
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1.5">
        <h1 className="type-screen-title">{t('villages.title')}</h1>
        <p data-testid="villages-note" className="type-note" style={{ color: 'var(--ink-3)' }}>
          {t('villages.plannedNote')}
        </p>
      </header>

      {query.isLoading ? (
        <Loading testId="villages-loading" />
      ) : (
        <DataTable
          columns={columns}
          data={query.data ?? []}
          testId="villages-table"
          rowTestId="village-row"
          empty={{ title: t('villages.noneTitle'), detail: t('villages.noneDetail') }}
        />
      )}

      <p className="type-note" style={{ color: 'var(--ink-3)' }}>{t('villages.simultaneityNote')}</p>
    </section>
  )
}
