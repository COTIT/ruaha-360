import { useState } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { resolveLanding, safeRedirect } from '@/app/membership'
import { sessionQuery } from '@/app/session'
import { supabase } from '@/lib/supabase'

// By route id rather than by importing the route, which would be circular.
const route = getRouteApi('/(auth)/login')

// Messages are i18n keys, resolved at render. Validation is client-side only
// because it costs a round trip to learn an empty field is empty — it is not a
// copy of any server rule.
const schema = z.object({
  email: z.string().min(1, 'login.emailRequired').email('login.emailInvalid'),
  password: z.string().min(1, 'login.passwordRequired'),
})

type FormValues = z.infer<typeof schema>

export function LoginScreen() {
  const { redirect: requested } = route.useSearch()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setFormError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })

      if (error) {
        // Three distinguishable states, per spec 4.2: bad credentials, an
        // unreachable server, and anything else — which is surfaced verbatim
        // because the messages in this system are written to be read.
        if (error.status === 400) setFormError(t('login.invalid'))
        else if (error.status === undefined) setFormError(t('login.network'))
        else setFormError(error.message)
        return
      }

      /**
       * A forced read, not `invalidateQueries` + `ensureQueryData` — QA #30.
       *
       * Every route guard calls `ensureSession`, so by the time this form is
       * submitted the session query already holds `null`: the correct answer
       * for a visitor who was signed out. `invalidateQueries` marks that stale
       * and STARTS a refetch without waiting for it, and `ensureQueryData`
       * returns cached data whenever there is any — and `null` is data. So
       * `resolveLanding([])` ran on the signed-out answer and sent a
       * legitimate ops user to "You do not have access", intermittently,
       * depending on which promise settled first.
       *
       * `fetchQuery` ignores what is cached and returns the fresh answer.
       *
       * The password can also be accepted and this read still fail; that is
       * reported rather than swallowed, or the user is left staring at the
       * login form having just typed a correct password.
       */
      const session = await queryClient.fetchQuery(sessionQuery)

      // A guard that bounced someone here attached where they were going. Go
      // back there if the value is trustworthy; the surface guard will correct
      // it if their role does not open that surface. Otherwise, role home.
      const target = safeRedirect(requested) ?? resolveLanding(session?.memberships ?? []).to
      await navigate({ to: target, replace: true })
    } catch (cause) {
      // signInWithPassword can reject outright, not just resolve with an
      // error — a rejection here must not escape into an unhandled promise.
      setFormError(cause instanceof Error ? cause.message : t('login.unexpected'))
    }
  }

  const fieldError = (name: keyof FormValues) => {
    const key = errors[name]?.message
    return key ? t(key) : undefined
  }

  const emailError = fieldError('email')
  const passwordError = fieldError('password')

  return (
    <section className="mx-auto max-w-sm space-y-4">
      <h1 className="text-lg font-semibold">{t('login.title')}</h1>

      <form className="space-y-3" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-1">
          <label className="block text-sm font-medium" htmlFor="login-email">
            {t('login.email')}
          </label>
          <input
            id="login-email"
            data-testid="login-email"
            type="email"
            autoComplete="email"
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? 'login-email-error' : undefined}
            className="w-full rounded border border-deep/20 bg-white px-3 py-2 aria-[invalid]:border-destructive"
            {...register('email')}
          />
          {emailError && (
            <p id="login-email-error" data-testid="login-email-error" className="text-sm text-destructive">
              {emailError}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium" htmlFor="login-password">
            {t('login.password')}
          </label>
          <input
            id="login-password"
            data-testid="login-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={passwordError ? true : undefined}
            aria-describedby={passwordError ? 'login-password-error' : undefined}
            className="w-full rounded border border-deep/20 bg-white px-3 py-2 aria-[invalid]:border-destructive"
            {...register('password')}
          />
          {passwordError && (
            <p
              id="login-password-error"
              data-testid="login-password-error"
              className="text-sm text-destructive"
            >
              {passwordError}
            </p>
          )}
        </div>

        {formError && (
          <p
            data-testid="login-error"
            role="alert"
            className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {formError}
          </p>
        )}

        <button
          type="submit"
          data-testid="login-submit"
          disabled={isSubmitting}
          className="w-full rounded bg-primary px-3 py-2 font-medium text-primary-foreground disabled:opacity-60"
        >
          {isSubmitting ? t('login.submitting') : t('login.submit')}
        </button>
      </form>
    </section>
  )
}
