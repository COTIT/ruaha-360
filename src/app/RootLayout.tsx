import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { DemoBanner } from '@/app/DemoBanner'
import { LanguageSwitch } from '@/app/LanguageSwitch'
import { activeMemberships, canAccessSurface } from '@/app/membership'
import { signOut, useSession } from '@/app/session'

/**
 * Session 1/tier 1 shell.
 *
 * Nav is role-aware but still one bar for every surface. Spec 4.1 wants a
 * bottom tab bar for farmer and officer and a sidebar for ops; that split
 * arrives with the first real screens on each surface, so the layout is not
 * built twice around placeholders.
 */
export function RootLayout() {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const memberships = activeMemberships(session?.memberships ?? [])
  const signedIn = Boolean(session)

  const links = [
    { to: '/farm', label: t('nav.myFarm'), show: canAccessSurface(memberships, 'farmer') },
    { to: '/officer', label: t('nav.officer'), show: canAccessSurface(memberships, 'officer') },
    { to: '/ops', label: t('nav.ops'), show: canAccessSurface(memberships, 'ops') },
    { to: '/ops/tower', label: t('nav.tower'), show: canAccessSurface(memberships, 'ops') },
  ].filter((l) => l.show)

  return (
    <div className="min-h-dvh bg-surface font-sans text-deep">
      <DemoBanner />

      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-deep/10 bg-white px-4 py-3">
        <Link to="/" className="font-semibold text-primary">
          Ruaha 360
        </Link>

        <div className="flex items-center gap-3">
          {session?.appUser && (
            <span className="text-sm text-deep/70" data-testid="current-user">
              {session.appUser.display_name}
            </span>
          )}
          <LanguageSwitch />
          {signedIn && (
            <button
              type="button"
              data-testid="sign-out"
              className="rounded border border-deep/20 px-2 py-1 text-sm"
              onClick={async () => {
                await signOut(queryClient)
                await navigate({ to: '/login', replace: true })
              }}
            >
              {t('nav.signOut')}
            </button>
          )}
        </div>
      </header>

      {links.length > 0 && (
        <nav className="flex flex-wrap gap-3 border-b border-deep/10 px-4 py-2 text-sm">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-deep/70 underline-offset-4 hover:underline data-[status=active]:font-medium data-[status=active]:text-primary"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}

      <main className="p-4">
        <Outlet />
      </main>
    </div>
  )
}
