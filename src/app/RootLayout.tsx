import { Link, Outlet, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { BrandLockup } from '@/app/BrandLockup'
import { DemoBanner } from '@/app/DemoBanner'
import { LanguageSwitch } from '@/app/LanguageSwitch'
import { SignOutButton } from '@/app/SignOutButton'
import { SurfaceNav } from '@/app/SurfaceNav'
import { activeMemberships } from '@/app/membership'
import { navItemsFor, navLayoutForSurface, navSurfaceFor } from '@/app/nav'
import { useSession } from '@/app/session'

/**
 * App shell — spec 4.1.
 *
 * Role-aware nav: farmer and officer surfaces get a bottom tab bar and are
 * mobile-first; ops gets a sidebar and is desktop-first. The layout follows the
 * CURRENT surface rather than the role set, because a user may hold several
 * roles and the active one lives in the URL.
 *
 * The header carries the supplied Ruaha Energy lockup — 26px on ops, 23px on a
 * field surface, where the header has less room and more thumb — followed by a
 * hairline divider and `360`. A skip link precedes everything: the ops sidebar
 * is six destinations to tab past otherwise.
 */
export function RootLayout() {
  const { data: session } = useSession()
  const { pathname } = useLocation()
  const { t } = useTranslation()

  const memberships = activeMemberships(session?.memberships ?? [])
  // The surface whose nav to show — not always the surface of the path. An ops
  // user reading an officer record keeps the ops sidebar; see navSurfaceFor.
  const surface = navSurfaceFor(pathname, memberships)
  const layout = navLayoutForSurface(surface)
  const items = surface ? navItemsFor(surface, memberships) : []
  const signedIn = Boolean(session)

  return (
    <div className="flex min-h-dvh flex-col bg-sand font-sans text-ink">
      <a
        href="#main"
        className="sr-only rounded-[var(--radius-control)] bg-paper px-4 py-2 font-medium text-primary-ink focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
        style={{ border: '1.5px solid var(--primary)' }}
      >
        {t('a11y.skipToContent')}
      </a>

      {/* Always visible, driven by VITE_DATA_MODE and never by a column. */}
      <DemoBanner />

      <header
        className="flex flex-wrap items-center justify-between gap-3.5 px-4 py-3 lg:px-[18px]"
        style={{ background: 'var(--paper)', borderBottom: '1px solid var(--rule)' }}
      >
        <Link to="/">
          <BrandLockup height={layout === 'tabs' ? 23 : 26} />
        </Link>

        <div className="flex flex-wrap items-center gap-2.5">
          {session?.appUser && (
            <span data-testid="current-user" style={{ fontSize: 14, color: 'var(--ink-2)' }}>
              {session.appUser.display_name}
            </span>
          )}
          <LanguageSwitch />
          {signedIn && <SignOutButton />}
        </div>
      </header>

      {/* Column below `lg`, so the ops sidebar becomes a strip above the
          content rather than squeezing it — QA #8. */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {layout === 'sidebar' && <SurfaceNav layout={layout} items={items} />}

        {/*
          Bottom padding keeps the tab bar clear of the last row of content.
          The desktop padding is applied only where there IS no tab bar: a `lg:`
          variant beats `pb-20`, which at a desktop width left the 60px bar
          sitting on top of the register form's only submit button.
        */}
        <main
          id="main"
          className={layout === 'tabs' ? 'flex-1 p-4 pb-24' : 'flex-1 p-4 lg:p-[22px]'}
        >
          <Outlet />
        </main>
      </div>

      {layout === 'tabs' && <SurfaceNav layout={layout} items={items} />}
    </div>
  )
}
