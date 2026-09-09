import { useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useSession } from '@/app/session'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { isSupportedLanguage, supportedLanguages } from '@/i18n'

/**
 * Spec 4.1: the language choice is persisted to `app_user.locale`.
 *
 * app_user.locale is the source of truth rather than localStorage, so the
 * choice follows the user to their next device. Signed out there is nothing to
 * persist to, and the switch is in-memory only.
 */
export function LanguageSwitch() {
  const { i18n, t } = useTranslation()
  const { data: session } = useSession()
  const queryClient = useQueryClient()

  const storedLocale = session?.appUser?.locale
  const appliedFor = useRef<string | null>(null)

  // Apply the stored locale once per user, not on every render: doing it
  // unconditionally would fight the user every time they picked a language.
  useEffect(() => {
    const userId = session?.appUser?.id ?? null
    if (!userId || !storedLocale) return
    if (appliedFor.current === userId) return
    appliedFor.current = userId
    if (isSupportedLanguage(storedLocale) && storedLocale !== i18n.resolvedLanguage) {
      void i18n.changeLanguage(storedLocale)
    }
  }, [session?.appUser?.id, storedLocale, i18n])

  const persist = useMutation({
    mutationFn: async (locale: string) => {
      const userId = session?.appUser?.id
      if (!userId) return
      // app_user_update_self: `id = auth.uid()`. Nobody else's locale is
      // writable, so there is nothing to guard client-side.
      const { error } = await supabase.from('app_user').update({ locale }).eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.session() }),
  })

  const onChange = async (locale: string) => {
    await i18n.changeLanguage(locale)
    if (!session?.appUser?.id) return
    // Awaited, and the control is disabled while it runs. Fire-and-forget lost
    // the write whenever the page navigated before the request finished, and
    // an unsaved change must not look saved.
    await persist.mutateAsync(locale)
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="sr-only">{t('language.en')}</span>
      <select
        data-testid="language-switch"
        className="rounded border border-deep/20 bg-white px-2 py-1 disabled:opacity-60"
        value={i18n.resolvedLanguage}
        disabled={persist.isPending}
        onChange={(e) => void onChange(e.target.value)}
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
