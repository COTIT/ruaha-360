import { useTranslation } from 'react-i18next'

import { supportedLanguages } from '@/i18n'

/**
 * Stub. Switches the in-memory language only.
 *
 * Tier 1 replaces this with the real component: persists the choice to
 * `app_user.locale`, which is the single source of truth for a user's
 * language across devices.
 */
export function LanguageSwitch() {
  const { i18n, t } = useTranslation()

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="sr-only">{t('language.en')}</span>
      <select
        className="rounded border border-deep/20 bg-white px-2 py-1"
        value={i18n.resolvedLanguage}
        onChange={(e) => void i18n.changeLanguage(e.target.value)}
      >
        {supportedLanguages.map((lng) => (
          <option key={lng} value={lng}>
            {t(`language.${lng}`)}
          </option>
        ))}
      </select>
    </label>
  )
}
