import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

type LinkTo = Parameters<typeof Link>[0]['to']

/**
 * One Tower tile.
 *
 * Every tile that carries a figure also carries a way to the rows behind it:
 * spec 8.2 is explicit that a number which cannot be traced does not belong on
 * this screen.
 */
export function TowerTile({
  id,
  title,
  note,
  drillTo,
  drillSearch,
  loading,
  children,
}: {
  id: string
  title: string
  note?: string
  drillTo?: string
  drillSearch?: Record<string, string | undefined>
  /** The tile's own query is still running — QA #29. */
  loading?: boolean
  children: React.ReactNode
}) {
  const { t } = useTranslation()

  return (
    <section
      data-testid={`tile-${id}`}
      aria-busy={loading || undefined}
      className="space-y-3 rounded border border-deep/10 bg-white/70 p-4"
    >
      <header className="space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">{title}</h2>
          {/* QA #29: the link used to render immediately while the tile was
              still loading, so a click landed on a drill-down whose own query
              had not started — from a figure nobody had seen. The label stays
              in place as plain text so the header does not jump when the
              figure arrives. */}
          {drillTo &&
            (loading ? (
              <span data-testid="tile-drill" className="text-xs font-medium text-deep/40">
                {t('tower.drill')}
              </span>
            ) : (
              <Link
                to={drillTo as LinkTo}
                search={drillSearch as never}
                data-testid="tile-drill"
                className="text-xs font-medium text-primary underline underline-offset-4"
              >
                {t('tower.drill')}
              </Link>
            ))}
        </div>
        {note && <p className="text-xs text-deep/60">{note}</p>}
      </header>
      {children}
    </section>
  )
}

/** A labelled figure inside a tile. Figures stack, so they align. */
export function Figure({
  label,
  value,
  testId,
  note,
}: {
  label: string
  value: string
  testId?: string
  note?: string
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-deep/60">{label}</span>
        <span data-testid={testId} className="tabular font-semibold">
          {value}
        </span>
      </div>
      {note && <p className="text-xs text-deep/50">{note}</p>}
    </div>
  )
}
