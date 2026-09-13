import { useMemo } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'

import { useScopeNames } from '@/app/scope'
import { CONTROL } from '@/components/controlStyles'
import { ControlLabel, Loading } from '@/components/controls'
import { DataTable } from '@/components/DataTable'
import { ErrorState } from '@/components/ErrorState'
import { ProvenanceBadge } from '@/components/ProvenanceBadge'
import { validatePeopleSearch, VERIFICATIONS } from '@/features/officer/peopleSearch'
import { usePeople, type PersonRow } from '@/features/officer/usePeople'

const route = getRouteApi('/_officer/officer/people/')

/**
 * Spec 5.3 — the officer's people list. `DataTable` over `person`, scoped by
 * RLS, searchable by name and filterable by verification.
 *
 * Filter state lives in the URL (spec §10), so a filtered view is shareable,
 * reloadable and survives the back button — and the filters are applied to the
 * query, never to already-fetched rows.
 */
export function PeopleScreen() {
  const { t } = useTranslation()
  // Validated at the point of use: validateSearch runs on the route, but
  // getRouteApi().useSearch() returns the raw params in this router version,
  // so unvalidated text would otherwise reach the query builder.
  const search = validatePeopleSearch(route.useSearch())
  const navigate = useNavigate()
  const query = usePeople(search)
  const scope = useScopeNames()

  const setSearch = (next: Record<string, string | undefined>) =>
    void navigate({ to: '/officer/people', search: { ...search, ...next } as never })

  const columns = useMemo(() => {
    const col = createColumnHelper<PersonRow>()
    return [
      col.accessor((r) => `${r.given_name} ${r.family_name}`, {
        id: 'name',
        header: t('people.colName'),
      }),
      col.accessor('phone', {
        header: t('people.colPhone'),
        cell: (c) => c.getValue() ?? '—',
      }),
      col.accessor('village_id', {
        header: t('people.colVillage'),
        cell: (c) => scope.data?.villages[c.getValue()] ?? '—',
      }),
      // Every record shows where its data came from.
      col.display({
        id: 'provenance',
        header: t('people.colProvenance'),
        cell: (c) => (
          <ProvenanceBadge
            source={c.row.original.source}
            verification={c.row.original.verification}
            confidence={c.row.original.confidence ?? undefined}
            capturedAt={c.row.original.captured_at}
          />
        ),
      }),
    ]
  }, [t, scope.data])

  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  return (
    <section className="flex flex-col gap-4">
      <h1 className="type-screen-title">{t('people.title')}</h1>

      <div className="flex flex-wrap gap-2.5">
        <ControlLabel label={t('people.search')} grow>
          <input
            data-testid="people-search"
            type="search"
            value={search.q ?? ''}
            onChange={(e) => setSearch({ q: e.target.value || undefined })}
            placeholder={t('people.searchPlaceholder')}
            style={{ ...CONTROL, minHeight: 44, fontWeight: 400 }}
          />
        </ControlLabel>

        <ControlLabel label={t('people.filterVerification')}>
          <select
            data-testid="people-filter-verification"
            value={search.verification ?? ''}
            onChange={(e) => setSearch({ verification: e.target.value || undefined })}
            style={{ ...CONTROL, minHeight: 44, fontWeight: 400 }}
          >
            <option value="">{t('people.allVerifications')}</option>
            {VERIFICATIONS.map((v) => (
              <option key={v} value={v}>
                {t(`verification.${v}`)}
              </option>
            ))}
          </select>
        </ControlLabel>
      </div>

      {query.isLoading ? (
        <Loading testId="people-loading" />
      ) : (
        <DataTable
          columns={columns}
          data={query.data ?? []}
          testId="people-table"
          rowTestId="people-row"
          onRowClick={(row) =>
            void navigate({ to: '/officer/people/$personId', params: { personId: row.id } })
          }
          empty={{ title: t('people.noneTitle'), detail: t('people.noneDetail') }}
        />
      )}
    </section>
  )
}
