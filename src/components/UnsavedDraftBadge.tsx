import { useTranslation } from 'react-i18next'

/**
 * An unsaved write must LOOK unsaved (business-rules §12).
 *
 * Shown whenever a form has reached IndexedDB but not the server. There is
 * deliberately no success toast for a local save — reaching local storage is
 * not a server write.
 */
export function UnsavedDraftBadge() {
  const { t } = useTranslation()

  return (
    <span
      data-testid="unsaved-draft-badge"
      className="inline-flex items-center gap-1.5 rounded-full border border-deep/20 bg-white px-2.5 py-1 text-xs font-medium text-deep/80"
    >
      <span aria-hidden className="size-1.5 rounded-full bg-destructive" />
      {t('draft.notSubmitted')}
    </span>
  )
}
