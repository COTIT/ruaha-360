import { useTranslation } from 'react-i18next'

/**
 * Something actually failed — as opposed to returning nothing.
 *
 * Error contract §9: the Postgres messages in this schema are written to be
 * read by humans. They are surfaced VERBATIM. Never replace one with a generic
 * failure toast; `over-commitment: 4100.00 kg available, ...` names the numbers
 * the user needs.
 */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation()
  const message = error instanceof Error ? error.message : String(error)

  return (
    <div
      data-testid="error-state"
      role="alert"
      className="rounded border border-destructive/30 bg-destructive/5 px-4 py-3"
    >
      <p className="text-sm font-medium text-destructive">{t('error.title')}</p>
      <p className="mt-1 text-sm text-deep/80">{message}</p>
      {onRetry && (
        <button
          type="button"
          data-testid="error-retry"
          onClick={onRetry}
          className="mt-3 rounded border border-deep/20 bg-white px-3 py-1.5 text-sm font-medium"
        >
          {t('error.retry')}
        </button>
      )}
    </div>
  )
}
