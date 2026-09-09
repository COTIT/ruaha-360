import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { activeMemberships, roleHome } from '@/app/membership'
import { useSession } from '@/app/session'

export function SelectRoleScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: session } = useSession()

  const memberships = activeMemberships(session?.memberships ?? [])

  return (
    <section className="mx-auto max-w-md space-y-3" data-testid="select-role">
      <h1 className="text-lg font-semibold">{t('selectRole.title')}</h1>
      <p className="text-sm text-deep/70">{t('selectRole.detail')}</p>

      <ul className="space-y-2">
        {memberships.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              data-testid={`select-role-${m.role}`}
              className="w-full rounded border border-deep/20 bg-white px-3 py-2 text-left text-sm"
              onClick={() => void navigate({ to: roleHome(m.role), replace: true })}
            >
              <span className="font-medium">{t(`role.${m.role}`)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
