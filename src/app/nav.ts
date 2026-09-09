import { canAccessSurface, type ActiveMembership, type Surface } from '@/app/membership'

/** Bottom tab bar for the mobile-first surfaces, sidebar for desktop-first ops. */
export type NavLayout = 'tabs' | 'sidebar' | 'none'

export interface NavItem {
  to: string
  /** i18n key, resolved by the component. Never a literal string. */
  labelKey: string
}

const SURFACE_PREFIX: Array<[Surface, string]> = [
  ['farmer', '/farm'],
  ['officer', '/officer'],
  ['ops', '/ops'],
]

/**
 * Which surface a path belongs to.
 *
 * Matches on a path segment boundary, so `/farmers-market` is not the farmer
 * surface and `/operations` is not ops.
 */
export function surfaceForPath(pathname: string): Surface | undefined {
  for (const [surface, prefix] of SURFACE_PREFIX) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return surface
  }
  return undefined
}

/**
 * Spec 4.1: "Farmer and Officer get a bottom tab bar; Ops gets a sidebar."
 *
 * Keyed off the current surface rather than the role set, because a user may
 * hold several roles and the URL is where the active one lives — selection is
 * held in memory and the URL, never in a token.
 */
export function navLayoutForPath(pathname: string): NavLayout {
  const surface = surfaceForPath(pathname)
  if (!surface) return 'none'
  return surface === 'ops' ? 'sidebar' : 'tabs'
}

// Only routes that exist. Screens still to be built are listed as they land,
// so nav never points at a route the router cannot resolve.
const SURFACE_ITEMS: Record<Surface, NavItem[]> = {
  farmer: [
    { to: '/farm/my-farm', labelKey: 'nav.myFarm' },
    { to: '/farm/equipment', labelKey: 'nav.equipment' },
    { to: '/farm/requests', labelKey: 'nav.requests' },
    { to: '/farm/opportunities', labelKey: 'nav.opportunities' },
  ],
  officer: [
    { to: '/officer/register', labelKey: 'nav.register' },
    { to: '/officer/people', labelKey: 'nav.people' },
    { to: '/officer/verify', labelKey: 'nav.verify' },
  ],
  ops: [
    { to: '/ops/requests', labelKey: 'nav.requests' },
    { to: '/ops/demand', labelKey: 'nav.demand' },
    { to: '/ops/catalogue', labelKey: 'nav.catalogue' },
    { to: '/ops/buyers', labelKey: 'nav.buyers' },
    { to: '/ops/villages', labelKey: 'nav.villages' },
    { to: '/ops/tower', labelKey: 'nav.tower' },
  ],
}

/**
 * Nav for a surface, or nothing when the session does not open it — so nav
 * never advertises a route the guard would immediately bounce.
 */
export function navItemsFor(surface: Surface, memberships: ActiveMembership[]): NavItem[] {
  if (!canAccessSurface(memberships, surface)) return []
  return SURFACE_ITEMS[surface]
}
