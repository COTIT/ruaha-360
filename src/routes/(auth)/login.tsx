import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { resolveLanding, safeRedirect } from '@/app/membership'
import { ensureSession } from '@/app/session'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'

const schema = z.object({
  email: z.string().min(1).email(),
  password: z.string().min(1),
})

type FormValues = z.infer<typeof schema>

export const Route = createFileRoute('/(auth)/login')({
  // Genuinely optional, so `navigate({ to: '/login' })` needs no search
  // object. A required-but-undefined property would force every caller to
  // pass one.
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === 'string' ? { redirect: search.redirect } : {},
  component: LoginScreen,
})

function LoginScreen() {
  const { redirect: requested } = Route.useSearch()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setFormError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (error) {
      // Two distinguishable states, per spec 4.2: bad credentials vs the
      // server being unreachable. Anything else surfaces verbatim.
      if (error.status === 400) setFormError(t('login.invalid'))
      else if (error.status === undefined) setFormError(t('login.network'))
      else setFormError(error.message)
      return
    }

    await queryClient.invalidateQueries({ queryKey: queryKeys.session() })
    const session = await ensureSession(queryClient)

    // A guard that bounced someone here attached where they were going. Go
    // back there if the value is trustworthy; the surface guard will correct
    // it if their role does not open that surface. Otherwise, role home.
    const target = safeRedirect(requested) ?? resolveLanding(session?.memberships ?? []).to
    await navigate({ to: target, replace: true })
  }

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
            className="w-full rounded border border-deep/20 bg-white px-3 py-2"
            {...register('email')}
          />
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
            className="w-full rounded border border-deep/20 bg-white px-3 py-2"
            {...register('password')}
          />
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
