import { useMemo } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'

import { useScopeNames } from '@/app/scope'
import { DataTable } from '@/components/DataTable'
import { ErrorState } from '@/components/ErrorState'
import { CONTROL } from '@/components/controlStyles'
import { Loading } from '@/components/controls'
import { StatusPill } from '@/components/StatusPill'
import { validateRequestSearch } from '@/features/ops/requestSearch'
import { useOpsRequests, type OpsRequest } from '@/features/ops/useOpsRequests'
import type { RequestStatus } from '@/features/ops/transitions'
import { formatKw, formatTimestamp } from '@/lib/format'

const route = getRouteApi('/_ops/ops/requests/')

const STATUSES: RequestStatus[] = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'withdrawn',
]

/**
 * Spec 7.2 — the pipeline.
 *
 * Filter state lives in the URL as validated search params, so a filtered view
 * is shareable, reloadable and back-buttonable. Filters are applied to the
 * QUERY, not to rendered rows.
 */
export function OpsRequestsScreen() {
  const { t } = useTranslation()
  // Validated HERE, at the point of use, rather than trusting the router to
  // have sanitised it. validateSearch does run on the route, but
  // getRouteApi().useSearch() returns the raw params in this router version,
  // so an unfiltered `status=not-a-status` reached PostgREST and came back as
  // "invalid input value for enum pue_status". The query builder must never
  // receive unvalidated input.
  const search = validateRequestSearch(route.useSearch())
  const navigate = useNavigate()
  const query = useOpsRequests(search)
  const scope = useScopeNames()

  const columns = useMemo(() => {
    const col = createColumnHelper<OpsRequest>()
    return [
      col.accessor('applicant', { header: t('ops.colApplicant') }),
      col.accessor('village_name', { header: t('ops.colVillage') }),
      col.accessor('equipment_name', { header: t('ops.colEquipment') }),
      col.accessor((r) => r.estimate?.est_power_kw ?? null, {
        id: 'est_kw',
        header: t('ops.colEstKw'),
        cell: (c) => formatKw(c.getValue() as number | null),
      }),
      col.accessor('status', {
        header: t('ops.colStatus'),
        cell: (c) => <StatusPill kind="request" status={c.getValue()} />,
      }),
      col.accessor('submitted_at', {
        header: t('ops.colSubmitted'),
        cell: (c) => formatTimestamp(c.getValue()),
      }),
    ]
  }, [t])

  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  const setFilter = (patch: { status?: string; village?: string }) => {
    void navigate({
      to: '/ops/requests',
      search: {
        status: patch.status === undefined ? search.status : (patch.status as RequestStatus),
        village: patch.village === undefined ? search.village : patch.village,
      },
      replace: true,
    })
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="type-screen-title">{t('ops.requestsTitle')}</h1>

      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          <span style={{ color: 'var(--ink-2)' }}>{t('ops.filterStatus')}</span>
          <select
            data-testid="filter-status"
            value={search.status ?? ''}
            onChange={(e) => setFilter({ status: e.target.value || undefined })}
            style={CONTROL}
          >
            <option value="">{t('ops.allStatuses')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`requestStatus.${s}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span style={{ color: 'var(--ink-2)' }}>{t('ops.filterVillage')}</span>
          <select
            data-testid="filter-village"
            value={search.village ?? ''}
            onChange={(e) => setFilter({ village: e.target.value || undefined })}
            style={CONTROL}
          >
            <option value="">{t('ops.allVillages')}</option>
            {Object.entries(scope.data?.villages ?? {}).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {query.isLoading ? (
        <Loading testId="ops-requests-loading" />
      ) : (
        <DataTable
          columns={columns}
          data={query.requests}
          testId="requests-table"
          rowTestId="request-row"
          onRowClick={(row) =>
            void navigate({ to: '/ops/requests/$requestId', params: { requestId: row.id } })
          }
          empty={{ title: t('ops.noRequestsTitle'), detail: t('ops.noRequestsDetail') }}
        />
      )}
    </section>
  )
}
