import { useTranslation } from 'react-i18next'

import { humanizeDbError } from '@/lib/errors'

/**
 * Something actually failed — as opposed to returning nothing.
 *
 * Error contract §9: the Postgres messages in this schema are written to be
 * read by humans, and they are surfaced VERBATIM —
 * `over-commitment: 4100.00 kg available, ...` names the numbers the user
 * needs, and no rewriting improves it.
 *
 * `humanizeDbError` is what decides. Its default IS verbatim; it replaces only
 * what it recognises as machine noise — a constraint identifier, a uuid parse
 * failure, an overflow, a JS exception. Those were reaching users as copy
 * (QA #4, #20, #25), which is not what §9 asks for and never was.
 */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation()
  const human = humanizeDbError(error)
  const message = human.kind === 'verbatim' ? human.message : t(human.key)

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
