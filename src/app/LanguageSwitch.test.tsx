import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const update = vi.fn()
const useSession = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: { from: () => ({ update: (v: unknown) => ({ eq: () => update(v) }) }) },
  isDemoData: true,
}))
vi.mock('@/app/session', () => ({ useSession: () => useSession() }))

const { LanguageSwitch } = await import('@/app/LanguageSwitch')
const i18n = (await import('@/i18n')).default

function renderSwitch() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <LanguageSwitch />
    </QueryClientProvider>,
  )
}

const signedIn = (locale: string) => ({
  data: { appUser: { id: 'u1', person_id: null, display_name: 'Salima', locale }, memberships: [] },
  isLoading: false,
})

beforeEach(async () => {
  update.mockReset()
  useSession.mockReset()
  await i18n.changeLanguage('en')
})

describe('LanguageSwitch loading and signed-out states', () => {
  test('while the session resolves it still works, in memory only', async () => {
    useSession.mockReturnValue({ data: undefined, isLoading: true })
    renderSwitch()

    const select = screen.getByTestId('language-switch')
    expect(select).toBeEnabled()

    await userEvent.selectOptions(select, 'sw')
    await waitFor(() => expect(i18n.resolvedLanguage).toBe('sw'))
    // Nothing to persist to yet, so nothing is attempted.
    expect(update).not.toHaveBeenCalled()
  })

  test('signed out, the choice is not persisted', async () => {
    useSession.mockReturnValue({ data: null, isLoading: false })
    renderSwitch()

    await userEvent.selectOptions(screen.getByTestId('language-switch'), 'sw')
    await waitFor(() => expect(i18n.resolvedLanguage).toBe('sw'))
    expect(update).not.toHaveBeenCalled()
  })
})

describe('LanguageSwitch persistence', () => {
  test('a change is written to app_user.locale', async () => {
    useSession.mockReturnValue(signedIn('en'))
    update.mockResolvedValue({ error: null })
    renderSwitch()

    await userEvent.selectOptions(screen.getByTestId('language-switch'), 'sw')
    await waitFor(() => expect(update).toHaveBeenCalledWith({ locale: 'sw' }))
  })

  test('the control is disabled while the write is in flight', async () => {
    useSession.mockReturnValue(signedIn('en'))
    let release: (v: unknown) => void = () => {}
    update.mockReturnValue(new Promise((r) => (release = r)))
    renderSwitch()

    await userEvent.selectOptions(screen.getByTestId('language-switch'), 'sw')
    await waitFor(() => expect(screen.getByTestId('language-switch')).toBeDisabled())

    release({ error: null })
    await waitFor(() => expect(screen.getByTestId('language-switch')).toBeEnabled())
  })

  // The gap this pass exists to close: the write could fail and say nothing.
  // The language had already changed on screen, so the user believed it saved.
  test('a failed write is reported rather than failing silently', async () => {
    useSession.mockReturnValue(signedIn('en'))
    update.mockResolvedValue({ error: { message: 'permission denied for table app_user' } })
    renderSwitch()

    await userEvent.selectOptions(screen.getByTestId('language-switch'), 'sw')

    expect(await screen.findByTestId('language-error')).toHaveTextContent(
      'permission denied for table app_user',
    )
  })

  test('a rejected write is reported too', async () => {
    useSession.mockReturnValue(signedIn('en'))
    update.mockRejectedValue(new Error('offline'))
    renderSwitch()

    await userEvent.selectOptions(screen.getByTestId('language-switch'), 'sw')
    expect(await screen.findByTestId('language-error')).toHaveTextContent('offline')
  })

  test('the error clears on a later successful write', async () => {
    useSession.mockReturnValue(signedIn('en'))
    update.mockResolvedValueOnce({ error: { message: 'offline' } })
    renderSwitch()

    await userEvent.selectOptions(screen.getByTestId('language-switch'), 'sw')
    await screen.findByTestId('language-error')

    update.mockResolvedValueOnce({ error: null })
    await userEvent.selectOptions(screen.getByTestId('language-switch'), 'en')
    await waitFor(() => expect(screen.queryByTestId('language-error')).not.toBeInTheDocument())
  })
})

describe('LanguageSwitch applies the stored locale', () => {
  test('the stored locale is adopted once the session arrives', async () => {
    useSession.mockReturnValue(signedIn('sw'))
    renderSwitch()
    await waitFor(() => expect(i18n.resolvedLanguage).toBe('sw'))
  })

  test('an unsupported stored locale is ignored rather than applied blindly', async () => {
    useSession.mockReturnValue(signedIn('fr'))
    renderSwitch()
    await waitFor(() => expect(i18n.resolvedLanguage).toBe('en'))
  })
})
