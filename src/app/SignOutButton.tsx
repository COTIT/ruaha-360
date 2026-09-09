import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { signOut } from '@/app/session'

/**
 * Shared by the shell header and the no-access screen.
 *
 * Reports progress and failure: without that, a failed sign out looks like a
 * dead button — and on /no-access it is the only action on the screen.
 */
export function SignOutButton({ className }: { className?: string }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onClick = async () => {
    setError(null)
    setPending(true)
    try {
      await signOut(queryClient)
      await navigate({ to: '/login', replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        data-testid="sign-out"
        disabled={pending}
        onClick={() => void onClick()}
        className={
          className ??
          'rounded border border-deep/20 px-2 py-1 text-sm disabled:opacity-60'
        }
      >
        {pending ? t('nav.signingOut') : t('nav.signOut')}
      </button>
      {error && (
        <p data-testid="sign-out-error" role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </>
  )
}
