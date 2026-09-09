import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { ProvenanceBadge } from '@/components/ProvenanceBadge'
import { countUnverified, type Provenance } from '@/features/officer/personDetail'
import { usePersonDetail, useVerify } from '@/features/officer/usePersonDetail'
import { VerifyButton } from '@/features/officer/VerifyButton'
import { formatArea, formatKg, formatPlainDate } from '@/lib/format'

const route = getRouteApi('/_officer/officer/people/$personId')

/**
 * Spec 5.4 — person detail with provenance on every record, and the verify
 * action.
 *
 * Verifying invalidates the record key plus the farmer-facing and Tower keys,
 * so the badge flips here and on My Farm without a manual refresh.
 */
export function PersonDetailScreen() {
  const { personId } = route.useParams()
  const { t } = useTranslation()
  const query = usePersonDetail(personId)
  const verify = useVerify(personId, query.data?.person.village_id)

  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  if (query.isLoading) {
    return (
      <p data-testid="person-loading" className="text-sm text-deep/60">
        {t('common.loading')}
      </p>
    )
  }

  // Zero rows is an answer: RLS says this person is not visible here.
  if (!query.data) {
    return <EmptyState title={t('person.notFoundTitle')} detail={t('person.notFoundDetail')} />
  }

  const detail = query.data
  const outstanding = countUnverified(detail)
  const verifying = (table: string, id: string) =>
    verify.isPending && verify.variables?.table === table && verify.variables?.id === id

  return (
    <section className="max-w-3xl space-y-5" data-testid="person-detail">
      <header className="space-y-2">
        <h1 className="text-lg font-semibold">
          {detail.person.given_name} {detail.person.family_name}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge record={detail.person} />
          <VerifyButton
            table="person"
            id={detail.person.id}
            verification={detail.person.verification}
            onVerify={verify.mutate}
            pending={verifying('person', detail.person.id)}
          />
        </div>
        <p data-testid="person-outstanding" className="text-sm text-deep/60">
          {outstanding === 0 ? t('person.allVerified') : t('person.unverifiedCount', { count: outstanding })}
        </p>
        {detail.person.phone && <p className="text-sm text-deep/70">{detail.person.phone}</p>}
      </header>

      {verify.isError && (
        <div data-testid="verify-error">
          <ErrorState error={verify.error} onRetry={() => verify.reset()} />
        </div>
      )}

      <Section title={t('person.households')}>
        {detail.households.length === 0 ? (
          <EmptyState title={t('person.noHouseholds')} />
        ) : (
          detail.households.map((h) => (
            <Card key={h.id} testId={`household-${h.id}`}>
              <Row
                title={h.label}
                record={h}
                action={
                  <VerifyButton
                    table="household"
                    id={h.id}
                    verification={h.verification}
                    onVerify={verify.mutate}
                    pending={verifying('household', h.id)}
                  />
                }
              />
              <p className="text-xs text-deep/60">
                {t('person.members')}:{' '}
                {h.members.map((m) => `${m.given_name} ${m.family_name}`).join(', ')}
              </p>
            </Card>
          ))
        )}
      </Section>

      <Section title={t('person.farms')}>
        {detail.farms.length === 0 ? (
          <EmptyState title={t('person.noFarms')} detail={t('person.noFarmsDetail')} />
        ) : (
          detail.farms.map((farm) => (
            <Card key={farm.id} testId={`farm-${farm.id}`}>
              <Row
                title={farm.label}
                record={farm}
                action={
                  <VerifyButton
                    table="farm"
                    id={farm.id}
                    verification={farm.verification}
                    onVerify={verify.mutate}
                    pending={verifying('farm', farm.id)}
                  />
                }
              />

              {farm.plots.map((plot) => (
                <div key={plot.id} data-testid={`plot-${plot.id}`} className="ml-3 space-y-2 border-l border-deep/10 pl-3">
                  <Row
                    title={`${plot.label} · ${formatArea(plot.area_ha, 'hectare')}`}
                    record={plot}
                    action={
                      <VerifyButton
                        table="plot"
                        id={plot.id}
                        verification={plot.verification}
                        onVerify={verify.mutate}
                        pending={verifying('plot', plot.id)}
                      />
                    }
                  />

                  {plot.cycles.map((cycle) => (
                    <div key={cycle.id} data-testid={`cycle-${cycle.id}`} className="ml-3 space-y-2 border-l border-deep/10 pl-3">
                      <Row
                        title={cycle.crop_name}
                        record={cycle}
                        action={
                          <VerifyButton
                            table="crop_cycle"
                            id={cycle.id}
                            verification={cycle.verification}
                            onVerify={verify.mutate}
                            pending={verifying('crop_cycle', cycle.id)}
                          />
                        }
                      />
                      <p className="text-xs text-deep/60">
                        {t('person.window')}: {formatPlainDate(cycle.harvest_start)} –{' '}
                        {formatPlainDate(cycle.harvest_end)}
                      </p>

                      {cycle.harvests.map((h) => (
                        <div key={h.id} data-testid={`harvest-${h.id}`} className="ml-3 border-l border-deep/10 pl-3">
                          <Row
                            title={`${t(`person.${h.kind}`)} ${formatKg(h.quantity_kg)}${
                              h.is_current ? '' : ` (${t('person.superseded')})`
                            }`}
                            record={h}
                            action={
                              <VerifyButton
                                table="harvest_report"
                                id={h.id}
                                verification={h.verification}
                                onVerify={verify.mutate}
                                pending={verifying('harvest_report', h.id)}
                              />
                            }
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </Card>
          ))
        )}
      </Section>
    </section>
  )
}

function Badge({ record }: { record: Provenance }) {
  return (
    <ProvenanceBadge
      source={record.source}
      verification={record.verification}
      confidence={record.confidence}
      capturedAt={record.captured_at}
    />
  )
}

function Row({
  title,
  record,
  action,
}: {
  title: string
  record: Provenance
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium">{title}</span>
      <Badge record={record} />
      {action}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-deep/60">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Card({ children, testId }: { children: React.ReactNode; testId: string }) {
  return (
    <div data-testid={testId} className="space-y-2 rounded border border-deep/10 bg-white/60 p-3">
      {children}
    </div>
  )
}
