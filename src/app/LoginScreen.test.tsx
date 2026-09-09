import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'

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

// ── validation: the idle -> invalid edge ────────────────────
describe('field validation', () => {
  test('an empty form reports both fields and never reaches the network', async () => {
    renderLogin()
    const user = userEvent.setup()
    await user.click(screen.getByTestId('login-submit'))

    expect(await screen.findByTestId('login-email-error')).toBeInTheDocument()
    expect(screen.getByTestId('login-password-error')).toBeInTheDocument()
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  test('a malformed email is reported without a round trip', async () => {
    renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByTestId('login-email'), 'not-an-email')
    await user.type(screen.getByTestId('login-password'), 'demo1234')
    await user.click(screen.getByTestId('login-submit'))

    expect(await screen.findByTestId('login-email-error')).toBeInTheDocument()
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  test('a missing password alone is reported', async () => {
    renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByTestId('login-email'), 'ops@demo.ruaha360.test')
    await user.click(screen.getByTestId('login-submit'))

    expect(await screen.findByTestId('login-password-error')).toBeInTheDocument()
    expect(screen.queryByTestId('login-email-error')).not.toBeInTheDocument()
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  test('fields are marked invalid for assistive tech, not just visually', async () => {
    renderLogin()
    const user = userEvent.setup()
    await user.click(screen.getByTestId('login-submit'))

    await screen.findByTestId('login-email-error')
    expect(screen.getByTestId('login-email')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByTestId('login-email')).toHaveAccessibleDescription(/email/i)
  })
})

// ── the error branches of a real attempt ───────────────────
describe('sign-in failure states', () => {
  test('bad credentials get the credentials message, not a raw status', async () => {
    signInWithPassword.mockResolvedValue({
      error: { status: 400, message: 'Invalid login credentials' },
    })

    renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByTestId('login-email'), 'neema@demo.ruaha360.test')
    await user.type(screen.getByTestId('login-password'), 'wrong')
    await user.click(screen.getByTestId('login-submit'))

    expect(await screen.findByTestId('login-error')).toHaveTextContent(
      'That email and password do not match an account.',
    )
  })

  test('an unreachable server is distinguished from bad credentials', async () => {
    signInWithPassword.mockResolvedValue({
      error: { status: undefined, message: 'Failed to fetch' },
    })

    renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByTestId('login-email'), 'neema@demo.ruaha360.test')
    await user.type(screen.getByTestId('login-password'), 'demo1234')
    await user.click(screen.getByTestId('login-submit'))

    expect(await screen.findByTestId('login-error')).toHaveTextContent(/connection/i)
  })

  test('any other failure is surfaced verbatim', async () => {
    signInWithPassword.mockResolvedValue({
      error: { status: 429, message: 'Email rate limit exceeded' },
    })

    renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByTestId('login-email'), 'neema@demo.ruaha360.test')
    await user.type(screen.getByTestId('login-password'), 'demo1234')
    await user.click(screen.getByTestId('login-submit'))

    expect(await screen.findByTestId('login-error')).toHaveTextContent('Email rate limit exceeded')
  })

  test('a thrown rejection is caught rather than escaping the handler', async () => {
    signInWithPassword.mockRejectedValue(new Error('socket hang up'))

    renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByTestId('login-email'), 'neema@demo.ruaha360.test')
    await user.type(screen.getByTestId('login-password'), 'demo1234')
    await user.click(screen.getByTestId('login-submit'))

    expect(await screen.findByTestId('login-error')).toHaveTextContent('socket hang up')
  })

  test('a stale error clears when the next attempt starts', async () => {
    signInWithPassword.mockResolvedValueOnce({ error: { status: 400, message: 'nope' } })
    ensureSession.mockResolvedValue({ memberships: [] })

    renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByTestId('login-email'), 'neema@demo.ruaha360.test')
    await user.type(screen.getByTestId('login-password'), 'wrong')
    await user.click(screen.getByTestId('login-submit'))
    await screen.findByTestId('login-error')

    signInWithPassword.mockResolvedValueOnce({ error: null })
    await user.clear(screen.getByTestId('login-password'))
    await user.type(screen.getByTestId('login-password'), 'demo1234')
    await user.click(screen.getByTestId('login-submit'))

    await waitFor(() => expect(screen.queryByTestId('login-error')).not.toBeInTheDocument())
  })
})

// ── loading ────────────────────────────────────────────────
describe('submitting state', () => {
  test('the button is disabled and relabelled while in flight', async () => {
    let release: (v: unknown) => void = () => {}
    signInWithPassword.mockReturnValue(new Promise((r) => (release = r)))

    renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByTestId('login-email'), 'ops@demo.ruaha360.test')
    await user.type(screen.getByTestId('login-password'), 'demo1234')
    await user.click(screen.getByTestId('login-submit'))

    await waitFor(() => expect(screen.getByTestId('login-submit')).toBeDisabled())
    expect(screen.getByTestId('login-submit')).toHaveTextContent(/signing in/i)

    release({ error: { status: 400, message: 'nope' } })
    await waitFor(() => expect(screen.getByTestId('login-submit')).toBeEnabled())
  })
})
