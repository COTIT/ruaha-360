import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { DemoBanner } from '@/app/DemoBanner'
import { LanguageSwitch } from '@/app/LanguageSwitch'
import { SurfaceNav } from '@/app/SurfaceNav'
import { activeMemberships } from '@/app/membership'
import { navItemsFor, navLayoutForPath, surfaceForPath } from '@/app/nav'
import { signOut, useSession } from '@/app/session'

/**
 * App shell — spec 4.1.
 *
 * Role-aware nav: farmer and officer surfaces get a bottom tab bar and are
 * mobile-first; ops gets a sidebar and is desktop-first. The layout follows the
 * CURRENT surface rather than the role set, because a user may hold several
 * roles and the active one lives in the URL.
 */
export function RootLayout() {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const memberships = activeMemberships(session?.memberships ?? [])
  const surface = surfaceForPath(pathname)
  const layout = navLayoutForPath(pathname)
  const items = surface ? navItemsFor(surface, memberships) : []
  const signedIn = Boolean(session)

  return (
    <div className="flex min-h-dvh flex-col bg-surface font-sans text-deep">
      {/* Always visible, driven by VITE_DATA_MODE and never by a column. */}
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

      <div className="flex flex-1">
        {layout === 'sidebar' && <SurfaceNav layout={layout} items={items} />}

        {/* Bottom padding keeps the tab bar clear of the last row of content. */}
        <main className={`flex-1 p-4 ${layout === 'tabs' ? 'pb-20' : ''}`}>
          <Outlet />
        </main>
      </div>

      {layout === 'tabs' && <SurfaceNav layout={layout} items={items} />}
    </div>
  )
}
