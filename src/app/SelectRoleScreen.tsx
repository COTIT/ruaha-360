import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { activeMemberships, roleHome } from '@/app/membership'
import { useScopeNames } from '@/app/scope'
import { useSession } from '@/app/session'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'

/**
 * Spec 4.3: lists memberships as role + project + village. Selection is held
 * in memory and the URL, never in a token.
 */
export function SelectRoleScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const session = useSession()
  const scope = useScopeNames()

  if (session.error) return <ErrorState error={session.error} />
  if (scope.error) return <ErrorState error={scope.error} />

  // Wait for the names too, so rows do not appear and then relabel themselves.
  if (session.isLoading || scope.isLoading || !session.data || !scope.data) {
    return (
      <p data-testid="select-role-loading" className="text-sm text-deep/60">
        {t('common.loading')}
      </p>
    )
  }

  const memberships = activeMemberships(session.data.memberships)

  // Landing here with nothing to pick means the memberships were revoked
  // between resolving the route and rendering it. Say so rather than showing
  // an empty list.
  if (memberships.length === 0) {
    return <EmptyState title={t('selectRole.noneTitle')} detail={t('selectRole.noneDetail')} />
  }

  return (
    <section className="mx-auto max-w-md space-y-3" data-testid="select-role">
      <h1 className="text-lg font-semibold">{t('selectRole.title')}</h1>
      <p className="text-sm text-deep/70">{t('selectRole.detail')}</p>

      <ul className="space-y-2">
        {memberships.map((m) => {
          const project = scope.data.projects[m.project_id] ?? m.project_id
          // village_id NULL is whole-project scope, which is ops and admin.
          // Falling back to the id keeps a row identifiable rather than blank.
          const village = m.village_id
            ? (scope.data.villages[m.village_id] ?? m.village_id)
            : t('selectRole.wholeProject')

          return (
            <li key={m.id}>
              <button
                type="button"
                data-testid={`select-role-${m.role}`}
                className="w-full rounded border border-deep/20 bg-white px-3 py-2 text-left text-sm"
                onClick={() => void navigate({ to: roleHome(m.role), replace: true })}
              >
                <span className="block font-medium">{t(`role.${m.role}`)}</span>
                <span className="block text-xs text-deep/60">{project}</span>
                <span className="block text-xs text-deep/60">{village}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
