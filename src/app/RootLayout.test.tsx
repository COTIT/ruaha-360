import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import type { ActiveMembership } from '@/app/membership'

const useSession = vi.fn()
const pathname = vi.fn()

vi.mock('@/app/session', () => ({ useSession: () => useSession(), signOut: vi.fn() }))
vi.mock('@/app/LanguageSwitch', () => ({ LanguageSwitch: () => <div data-testid="language-switch" /> }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  Outlet: () => <div data-testid="outlet" />,
  useLocation: () => ({ pathname: pathname() }),
  useNavigate: () => vi.fn(),
}))

const { RootLayout } = await import('@/app/RootLayout')
await import('@/i18n')

const m = (role: ActiveMembership['role']): ActiveMembership => ({
  id: `m-${role}`,
  role,
  project_id: 'p',
  village_id: null,
  revoked_at: null,
})

function renderLayout() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RootLayout />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  useSession.mockReset()
  pathname.mockReset()
  pathname.mockReturnValue('/ops')
})

describe('RootLayout loading state', () => {
  // Rendering an empty nav while the session resolves would flash a bar with
  // no items and then fill it in. Render no nav until it is known.
  test('no nav is rendered while the session is resolving', () => {
    useSession.mockReturnValue({ data: undefined, isLoading: true })
    renderLayout()

    expect(screen.queryByTestId('nav-sidebar')).not.toBeInTheDocument()
    expect(screen.queryByTestId('nav-tabs')).not.toBeInTheDocument()
    // The page itself still renders — the shell is not blocked on the session.
    expect(screen.getByTestId('outlet')).toBeInTheDocument()
  })

  test('no sign out is offered while the session is unknown', () => {
    useSession.mockReturnValue({ data: undefined, isLoading: true })
    renderLayout()
    expect(screen.queryByTestId('sign-out')).not.toBeInTheDocument()
  })

  test('the demo banner shows regardless of session state', () => {
    useSession.mockReturnValue({ data: undefined, isLoading: true })
    renderLayout()
    expect(screen.getByTestId('demo-banner')).toBeInTheDocument()
  })
})

describe('RootLayout signed-in state', () => {
  test('ops gets the sidebar and a sign out', () => {
    useSession.mockReturnValue({
      data: { appUser: { display_name: 'Asha Ops' }, memberships: [m('ops')] },
      isLoading: false,
    })
    renderLayout()

    expect(screen.getByTestId('nav-sidebar')).toBeInTheDocument()
    expect(screen.queryByTestId('nav-tabs')).not.toBeInTheDocument()
    expect(screen.getByTestId('sign-out')).toBeInTheDocument()
    expect(screen.getByTestId('current-user')).toHaveTextContent('Asha Ops')
  })

  test('a farmer on the farmer surface gets tabs', () => {
    pathname.mockReturnValue('/farm')
    useSession.mockReturnValue({
      data: { appUser: { display_name: 'Neema' }, memberships: [m('farmer')] },
      isLoading: false,
    })
    renderLayout()

    expect(screen.getByTestId('nav-tabs')).toBeInTheDocument()
    expect(screen.queryByTestId('nav-sidebar')).not.toBeInTheDocument()
  })

  test('an auth route gets no surface nav even when signed in', () => {
    pathname.mockReturnValue('/select-role')
    useSession.mockReturnValue({
      data: { appUser: { display_name: 'Neema' }, memberships: [m('farmer')] },
      isLoading: false,
    })
    renderLayout()

    expect(screen.queryByTestId('nav-tabs')).not.toBeInTheDocument()
    expect(screen.queryByTestId('nav-sidebar')).not.toBeInTheDocument()
  })

  test('a user without a display name still renders the shell', () => {
    useSession.mockReturnValue({ data: { appUser: null, memberships: [m('ops')] }, isLoading: false })
    renderLayout()

    expect(screen.queryByTestId('current-user')).not.toBeInTheDocument()
    expect(screen.getByTestId('nav-sidebar')).toBeInTheDocument()
  })
})

/**
 * The bottom tab bar is fixed to the viewport, so `main` has to end above it.
 *
 * This broke once already and took the register form's only submit button with
 * it: a `lg:` padding shorthand added for the ops surface beat `pb-20` at a
 * desktop width, and the 60px bar sat on top of the button. Nothing in the
 * suite noticed until Playwright spent thirty seconds trying to click through
 * a navigation link.
 */
describe('the tab bar never covers the last control', () => {
  test('a field surface pads the content clear of the bar', () => {
    useSession.mockReturnValue({ data: { appUser: { display_name: 'Salima' }, memberships: [m('field_officer')] } })
    pathname.mockReturnValue('/officer/register')
    renderLayout()

    const main = screen.getByTestId('outlet').closest('main')!
    expect(main.className).toMatch(/\bpb-2[4-9]\b/)
    expect(
      main.className,
      'a padding shorthand at any breakpoint would beat the bottom padding',
    ).not.toMatch(/lg:p-/)
  })

  test('the ops surface has no bar, and gets its own desktop padding', () => {
    useSession.mockReturnValue({ data: { appUser: { display_name: 'Asha' }, memberships: [m('ops')] } })
    pathname.mockReturnValue('/ops/tower')
    renderLayout()

    const main = screen.getByTestId('outlet').closest('main')!
    expect(main.className).toMatch(/lg:p-/)
    expect(screen.queryByTestId('nav-tabs')).not.toBeInTheDocument()
  })
})
