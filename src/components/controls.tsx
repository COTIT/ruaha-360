import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * The shared control surface. The two densities and the button styles live in
 * `controlStyles.ts` beside this file — a module that exports both components
 * and constants loses fast refresh, and this one is edited constantly.
 */

/** A label above its control, in a column that can shrink to nothing. */
export function ControlLabel({
  label,
  children,
  grow = false,
}: {
  label: string
  children: ReactNode
  grow?: boolean
}) {
  return (
    <label
      className="flex min-w-0 flex-col gap-1.5"
      style={{
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--ink-2)',
        ...(grow ? { flex: '1 1 200px' } : {}),
      }}
    >
      {label}
      {children}
    </label>
  )
}

/** A white card on the sand ground. Depth is a border, not a shadow. */
export function Card({
  children,
  className = '',
  sunken = false,
}: {
  children: ReactNode
  className?: string
  sunken?: boolean
}) {
  return (
    <div
      className={className}
      style={{
        border: '1px solid var(--rule)',
        borderRadius: 'var(--radius-card)',
        background: sunken ? 'var(--sand-2)' : 'var(--paper)',
      }}
    >
      {children}
    </div>
  )
}

/**
 * A table in a card, scrolling inside itself.
 *
 * The scroll wrapper stays the table's own parent: at 375px the columns scroll
 * and the page does not (QA #8), and `responsive.spec.ts` reaches the wrapper
 * through that relationship.
 */
export function TableCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="overflow-hidden"
      style={{ border: '1px solid var(--rule)', borderRadius: 'var(--radius-card)' }}
    >
      {children}
    </div>
  )
}

/** Loading is flat text or flat blocks. Never a shimmer, never a spinner. */
export function Loading({ testId }: { testId?: string }) {
  const { t } = useTranslation()
  return (
    <p data-testid={testId} style={{ fontSize: 15, color: 'var(--ink-2)' }}>
      {t('common.loading')}
    </p>
  )
}
