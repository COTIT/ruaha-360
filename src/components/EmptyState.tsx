/**
 * Zero rows is a legitimate answer, not an error.
 *
 * RLS returning nothing means "you may not see this". Render this, never an
 * error, and never retry — there is nothing to retry.
 *
 * Deliberately carries no `role="alert"` and no retry control: an empty result
 * must not look like a failure.
 */
export function EmptyState({
  title,
  detail,
  action,
}: {
  title: string
  detail?: string
  action?: React.ReactNode
}) {
  return (
    <div
      data-testid="empty-state"
      className="rounded border border-dashed border-deep/20 bg-white/50 px-4 py-8 text-center"
    >
      <p className="font-medium text-deep">{title}</p>
      {detail && <p className="mt-1 text-sm text-deep/60">{detail}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
