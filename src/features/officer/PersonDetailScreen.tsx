import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { ProvenanceBadge } from '@/components/ProvenanceBadge'
import { railColour } from '@/components/controlStyles'
import { Loading } from '@/components/controls'
import { VerificationMark } from '@/components/marks'
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
      <Loading testId="person-loading" />
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
    <section className="flex max-w-3xl flex-col gap-[18px]" data-testid="person-detail">
      <header className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="type-screen-title">
            {detail.person.given_name} {detail.person.family_name}
          </h1>
          <Badge record={detail.person} />
          <VerifyButton
            table="person"
            id={detail.person.id}
            verification={detail.person.verification}
            onVerify={verify.mutate}
            pending={verifying('person', detail.person.id)}
          />
        </div>
        <p
          data-testid="person-outstanding"
          className="inline-flex items-center gap-2.5"
          style={{ fontSize: 15, fontWeight: 500 }}
        >
          <VerificationMark verification={outstanding === 0 ? 'verified' : 'unverified'} size={18} />
          {outstanding === 0
            ? t('person.allVerified')
            : t('person.unverifiedCount', { count: outstanding })}
        </p>
        {detail.person.phone && (
          <p className="tabular" style={{ fontSize: 14, color: 'var(--ink-2)' }}>
            {detail.person.phone}
          </p>
        )}
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
              <p className="type-note" style={{ color: 'var(--ink-2)' }}>
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
                <div
                  key={plot.id}
                  data-testid={`plot-${plot.id}`}
                  className="ml-1 flex flex-col gap-2.5 pl-3.5"
                  style={{ borderLeft: `3px solid ${railColour(plot.verification)}` }}
                >
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
                    <div
                      key={cycle.id}
                      data-testid={`cycle-${cycle.id}`}
                      className="ml-1 flex flex-col gap-2.5 pl-3.5"
                      style={{ borderLeft: `3px solid ${railColour(cycle.verification)}` }}
                    >
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
                      <p className="type-note tabular" style={{ color: 'var(--ink-3)' }}>
                        {t('person.window')}: {formatPlainDate(cycle.harvest_start)} –{' '}
                        {formatPlainDate(cycle.harvest_end)}
                      </p>

                      {cycle.harvests.map((h) => (
                        <div
                          key={h.id}
                          data-testid={`harvest-${h.id}`}
                          className="ml-1 pl-3.5"
                          style={{ borderLeft: `3px solid ${railColour(h.verification)}` }}
                        >
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

/**
 * The mark leads, the name follows, the verify control sits at the end of the
 * row. Six levels of nesting mean this row is read dozens of times down one
 * screen, so provenance collapses to the compact variant here — the mark plus
 * one line of words — and the full lozenge is kept for the person at the top.
 */
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
    <div className="flex flex-wrap items-center gap-3">
      <VerificationMark verification={record.verification} size={18} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <b style={{ fontSize: 16, fontWeight: 600 }}>{title}</b>
        <ProvenanceBadge
          compact
          source={record.source}
          verification={record.verification}
          confidence={record.confidence}
          capturedAt={record.captured_at}
        />
      </span>
      {action}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="type-section" style={{ color: 'var(--ink-3)' }}>
        {title}
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}

function Card({ children, testId }: { children: React.ReactNode; testId: string }) {
  return (
    <div
      data-testid={testId}
      className="flex flex-col gap-3 p-4"
      style={{
        border: '1px solid var(--rule)',
        borderRadius: 'var(--radius-card)',
        background: 'var(--paper)',
      }}
    >
      {children}
    </div>
  )
}

