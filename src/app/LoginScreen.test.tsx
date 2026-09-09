import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'

const signInWithPassword = vi.fn()
const ensureSession = vi.fn()
const navigate = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signInWithPassword: (a: unknown) => signInWithPassword(a) } },
  isDemoData: true,
}))
vi.mock('@/app/session', () => ({ ensureSession: (c: unknown) => ensureSession(c) }))
vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({ useSearch: () => ({}) }),
  useNavigate: () => navigate,
}))

const { LoginScreen } = await import('@/app/LoginScreen')
await import('@/i18n')

function renderLogin() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <LoginScreen />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  signInWithPassword.mockReset()
  ensureSession.mockReset()
  navigate.mockReset()
})

/**
 * Credentials can be accepted and the follow-up session read still fail. If
 * that is swallowed the user is left staring at the login form with no
 * explanation, having just typed a correct password.
 */
test('a session read that fails after a correct password is reported, not swallowed', async () => {
  signInWithPassword.mockResolvedValue({ error: null })
  ensureSession.mockRejectedValue(new Error('could not connect to the database'))

  renderLogin()
  const user = userEvent.setup()
  await user.type(screen.getByTestId('login-email'), 'ops@demo.ruaha360.test')
  await user.type(screen.getByTestId('login-password'), 'demo1234')
  await user.click(screen.getByTestId('login-submit'))

  expect(await screen.findByTestId('login-error')).toHaveTextContent(
    'could not connect to the database',
  )
  expect(navigate).not.toHaveBeenCalled()
})

test('the submit button is usable again after a failure', async () => {
  signInWithPassword.mockResolvedValue({ error: null })
  ensureSession.mockRejectedValue(new Error('boom'))

  renderLogin()
  const user = userEvent.setup()
  await user.type(screen.getByTestId('login-email'), 'ops@demo.ruaha360.test')
  await user.type(screen.getByTestId('login-password'), 'demo1234')
  await user.click(screen.getByTestId('login-submit'))

  await screen.findByTestId('login-error')
  expect(screen.getByTestId('login-submit')).toBeEnabled()
})

test('a successful sign-in navigates to the resolved landing route', async () => {
  signInWithPassword.mockResolvedValue({ error: null })
  ensureSession.mockResolvedValue({
    memberships: [{ id: 'm', role: 'ops', project_id: 'p', village_id: null, revoked_at: null }],
  })

  renderLogin()
  const user = userEvent.setup()
  await user.type(screen.getByTestId('login-email'), 'ops@demo.ruaha360.test')
  await user.type(screen.getByTestId('login-password'), 'demo1234')
  await user.click(screen.getByTestId('login-submit'))

  expect(navigate).toHaveBeenCalledWith({ to: '/ops', replace: true })
})
