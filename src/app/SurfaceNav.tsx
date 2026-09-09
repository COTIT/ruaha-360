import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import type { NavItem, NavLayout } from '@/app/nav'

// navItemsFor builds paths from the route map as plain strings. The router's
// `to` is a typed union, and this is the single place the two meet.
type LinkTo = Parameters<typeof Link>[0]['to']

const linkClass =
  'text-deep/70 underline-offset-4 hover:underline data-[status=active]:font-medium data-[status=active]:text-primary'

/**
 * Spec 4.1: farmer and officer get a bottom tab bar (mobile-first), ops gets a
 * sidebar (desktop-first).
 */
export function SurfaceNav({ layout, items }: { layout: NavLayout; items: NavItem[] }) {
  const { t } = useTranslation()
  if (layout === 'none' || items.length === 0) return null

  if (layout === 'sidebar') {
    return (
      <nav
        aria-label={t('a11y.primaryNav')}
        data-testid="nav-sidebar"
        className="w-52 shrink-0 border-r border-deep/10 bg-white p-3"
      >
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to as LinkTo}
                className={`block rounded px-2 py-1.5 text-sm ${linkClass}`}
              >
                {t(item.labelKey)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    )
  }

  return (
    <nav
      aria-label={t('a11y.primaryNav')}
      data-testid="nav-tabs"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-deep/10 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <Link
              to={item.to as LinkTo}
              className={`block px-1 py-2.5 text-center text-xs ${linkClass}`}
            >
              {t(item.labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
