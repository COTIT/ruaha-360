import { useLayoutEffect, useRef, type ComponentType } from 'react'
import {
  BookOpen,
  Briefcase,
  CircleCheckBig,
  FileText,
  Gauge,
  Handshake,
  MapPin,
  Package,
  Sprout,
  UserPlus,
  Users,
  Wrench,
  ClipboardList,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import type { NavItem, NavLayout } from '@/app/nav'

// navItemsFor builds paths from the route map as plain strings. The router's
// `to` is a typed union, and this is the single place the two meet.
type LinkTo = Parameters<typeof Link>[0]['to']

/**
 * Icon plus label, never icon alone. The label carries the meaning for a
 * first-time user and survives translation into a language none of these
 * glyphs were drawn for; the icon carries recognition on the tenth visit.
 *
 * Every one of them is `aria-hidden`: the label is already the accessible
 * name, and a second one would only be read twice.
 */
const ICON: Record<string, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  '/farm/my-farm': Sprout,
  '/farm/equipment': Wrench,
  '/farm/requests': FileText,
  '/farm/opportunities': Handshake,
  '/officer/register': UserPlus,
  '/officer/people': Users,
  '/officer/verify': CircleCheckBig,
  '/ops/requests': ClipboardList,
  '/ops/demand': Package,
  '/ops/catalogue': BookOpen,
  '/ops/buyers': Briefcase,
  '/ops/villages': MapPin,
  '/ops/tower': Gauge,
}

/**
 * Spec 4.1: farmer and officer get a bottom tab bar (mobile-first), ops gets a
 * sidebar (desktop-first).
 *
 * Desktop-first is the spec's choice for ops and stays the choice. But below
 * `lg` the fixed 13rem sidebar squeezed the content column until figures were
 * cut mid-number — "12,000" rendering as "12,0" — without the page scrolling
 * sideways to reveal them (QA #8). Silently truncated data is not the same
 * thing as desktop-first, so the sidebar becomes a horizontal strip there
 * instead of disappearing: collapsing is not hiding, and every destination
 * stays reachable.
 *
 * Touch targets are `min-height`, never `height`: 44px on ops, 60px on a field
 * surface, and a Kiswahili label that runs 30% longer has to be allowed to
 * wrap rather than be clipped.
 */
export function SurfaceNav({ layout, items }: { layout: NavLayout; items: NavItem[] }) {
  const { t } = useTranslation()
  if (layout === 'none' || items.length === 0) return null

  if (layout === 'sidebar') {
    return (
      <nav
        aria-label={t('a11y.primaryNav')}
        data-testid="nav-sidebar"
        className="w-full shrink-0 p-3 lg:w-[216px] lg:border-b-0 lg:border-r"
        style={{ background: 'var(--paper)', borderBottom: '1px solid var(--rule)' }}
      >
        <ul className="flex gap-1 overflow-x-auto lg:block lg:space-y-0.5 lg:overflow-visible">
          {items.map((item) => (
            <li key={item.to} className="shrink-0">
              <SurfaceLink item={item} layout="sidebar" label={t(item.labelKey)} />
            </li>
          ))}
        </ul>
      </nav>
    )
  }

  return <TabBar items={items} />
}

/**
 * The bottom bar, and the one number anything else pinned to the bottom of the
 * viewport needs.
 *
 * The bar is `position: fixed`, so `main`'s bottom padding keeps FLOWING
 * content clear of it but does nothing for a `position: sticky` element — the
 * register screen's submit bar — which is positioned against the viewport and
 * sat straight behind this. So the bar publishes its own height as
 * `--tab-bar-height` on the root, and the sticky bar offsets by it.
 *
 * Measured, not written down: a tab is `min-height: 60px` and renders at 63
 * with an icon above a label, and a Kiswahili label is allowed to wrap and
 * make it taller again. A constant would be a guess that drifts in silence,
 * which is how this broke the first time.
 */
function TabBar({ items }: { items: NavItem[] }) {
  const { t } = useTranslation()
  const bar = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const publish = () => {
      if (!bar.current) return
      const height = bar.current.getBoundingClientRect().height
      document.documentElement.style.setProperty('--tab-bar-height', `${height}px`)
    }

    publish()
    window.addEventListener('resize', publish)
    return () => {
      window.removeEventListener('resize', publish)
      document.documentElement.style.removeProperty('--tab-bar-height')
    }
    // The labels are the height: a language change re-renders and re-measures.
  }, [items, t])

  return (
    <nav
      ref={bar}
      aria-label={t('a11y.primaryNav')}
      data-testid="nav-tabs"
      className="fixed inset-x-0 bottom-0 z-10 pb-[env(safe-area-inset-bottom)]"
      style={{ background: 'var(--paper)', borderTop: '1px solid var(--rule-2)' }}
    >
      <ul className="flex">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <SurfaceLink item={item} layout="tabs" label={t(item.labelKey)} />
          </li>
        ))}
      </ul>
    </nav>
  )
}

function SurfaceLink({
  item,
  layout,
  label,
}: {
  item: NavItem
  layout: 'sidebar' | 'tabs'
  label: string
}) {
  const Icon = ICON[item.to]
  const sidebar = layout === 'sidebar'

  return (
    <Link
      to={item.to as LinkTo}
      // The active treatment is a tinted ground plus a rule — a border, not the
      // inset box-shadow the design file draws it with, because nothing in this
      // build composites a shadow layer.
      className={
        sidebar
          ? 'flex items-center gap-[11px] rounded-[var(--radius-control)] px-3 py-2.5 text-ink-2 hover:bg-sand-2 data-[status=active]:border-l-[3px] data-[status=active]:border-l-primary data-[status=active]:bg-primary-tint data-[status=active]:pl-[9px] data-[status=active]:font-semibold data-[status=active]:text-primary-ink'
          : 'flex flex-col items-center justify-center gap-[5px] px-1 py-2 text-center text-ink-2 data-[status=active]:border-t-2 data-[status=active]:border-t-primary data-[status=active]:font-semibold data-[status=active]:text-primary-ink'
      }
      style={sidebar ? { minHeight: 44, fontSize: 15 } : { minHeight: 60, fontSize: 12 }}
    >
      {Icon && <Icon aria-hidden size={sidebar ? 18 : 22} strokeWidth={2} />}
      {label}
    </Link>
  )
}
