import { createFileRoute } from '@tanstack/react-router'

import { LoginScreen } from '@/app/LoginScreen'

export const Route = createFileRoute('/(auth)/login')({
  // Genuinely optional, so `navigate({ to: '/login' })` needs no search
  // object. A required-but-undefined property would force every caller to
  // pass one.
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === 'string' ? { redirect: search.redirect } : {},
  component: LoginScreen,
})
