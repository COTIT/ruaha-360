import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { useOfficerHome } from '@/features/officer/useOfficerHome'

type LinkTo = Parameters<typeof Link>[0]['to']

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-deep/60">{label}</p>
      <p className="tabular text-lg font-semibold text-deep">{value}</p>
    </div>
  )
}

/**
 * Spec 5.1 — the officer's home, and the first screen an officer sees.
 *
 * Assigned villages, their record counts, what still needs verifying, and
 * Register as the primary action. Read-only: everything that writes lives one
 * tap away, because the officer's job starts with Register and this screen's
 * job is to get them there.
 */
export function OfficerHomeScreen() {
  const { t } = useTranslation()
  const { villages, isLoading, error, refetch } = useOfficerHome()

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />

  if (isLoading) {
    return (
      <p data-testid="officer-home-loading" className="text-sm text-deep/60">
        {t('common.loading')}
      </p>
    )
  }

  // Zero assigned villages: a real state with a next step, never a blank page.
  // An officer added to the project but not to a village cannot register
  // anyone, so the action is deliberately not offered here.
  if (villages.length === 0) {
    return (
      <section data-testid="officer-home" className="space-y-4">
        <h1 className="text-lg font-semibold">{t('officerHome.title')}</h1>
        <EmptyState
          title={t('officerHome.noVillagesTitle')}
          detail={t('officerHome.noVillagesDetail')}
        />
      </section>
    )
  }

  const outstanding = villages.reduce((sum, v) => sum + v.unverified, 0)

  return (
    <section data-testid="officer-home" className="space-y-5">
      <header className="space-y-3">
        <h1 className="text-lg font-semibold">{t('officerHome.title')}</h1>
        <Link
          to={'/officer/register' as LinkTo}
          data-testid="officer-home-register"
          className="inline-block rounded bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          {t('officerHome.register')}
        </Link>
      </header>

      {/* Verification is a deliberate act (business-rules §5), so the
          outstanding figure is a prompt to go and do it rather than a passive
          statistic. */}
      <div
        data-testid="officer-unverified"
        className="rounded border border-deep/10 bg-white/70 p-4 text-sm"
      >
        {outstanding === 0 ? (
          <p>{t('officerHome.nothingOutstanding')}</p>
        ) : (
          <p>
            {t('officerHome.outstanding', { count: outstanding })}{' '}
            <Link
              to={'/officer/verify' as LinkTo}
              data-testid="officer-unverified-link"
              className="font-medium text-primary underline underline-offset-4"
            >
              {t('officerHome.openVerifyQueue')}
            </Link>
          </p>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-deep/70">{t('officerHome.villages')}</h2>
        <ul className="space-y-3">
          {villages.map((v) => (
            <li
              key={v.villageId}
              data-testid="officer-village"
              className="rounded border border-deep/10 bg-white/70 p-4"
            >
              <p className="font-medium text-deep">{v.villageName}</p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <Figure label={t('officerHome.people')} value={v.persons} />
                <Figure label={t('officerHome.farms')} value={v.farms} />
                <Figure label={t('officerHome.requests')} value={v.requests} />
              </div>
              {v.unverified > 0 && (
                <p className="mt-3 text-xs text-deep/60">
                  {t('officerHome.villageOutstanding', { count: v.unverified })}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
