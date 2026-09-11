import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const useMyFarm = vi.fn()
const useMyRequests = vi.fn()
const useFarmerOpportunities = vi.fn()

vi.mock('@/features/farmer/useMyFarm', () => ({ useMyFarm: () => useMyFarm() }))
vi.mock('@/features/farmer/useRequests', () => ({ useMyRequests: () => useMyRequests() }))
vi.mock('@/features/farmer/useFarmerOpportunities', () => ({
  useFarmerOpportunities: () => useFarmerOpportunities(),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}))

const { FarmHomeScreen } = await import('@/features/farmer/FarmHomeScreen')
await import('@/i18n')

const farm = {
  id: 'f1',
  label: 'Shamba la Neema',
  plots: [
    { id: 'p1', label: 'Kipande cha juu', cycles: [{ id: 'c1' }, { id: 'c2' }] },
    { id: 'p2', label: 'Kipande cha chini', cycles: [{ id: 'c3' }] },
  ],
}

const request = (over: Record<string, unknown> = {}) => ({
  id: 'r1',
  status: 'approved',
  equipment_name: 'Maize mill 500 kg/hr',
  ...over,
})

function ready(over: Record<string, unknown> = {}) {
  useMyFarm.mockReturnValue({ isLoading: false, error: null, farms: [farm], ...(over.farm ?? {}) })
  useMyRequests.mockReturnValue({
    isLoading: false,
    error: null,
    requests: [request()],
    ...(over.requests ?? {}),
  })
  useFarmerOpportunities.mockReturnValue({
    isLoading: false,
    error: null,
    data: [{ id: 'o1' }],
    ...(over.opportunities ?? {}),
  })
}

beforeEach(() => {
  useMyFarm.mockReset()
  useMyRequests.mockReset()
  useFarmerOpportunities.mockReset()
})

/**
 * Spec 6.1 — "Status summary, latest request status, any opportunity the
 * farmer's supply is inside."
 *
 * Mobile-first and read-heavy: this is the first screen a farmer sees, on the
 * weakest hardware in the system, so it composes the three queries the other
 * farmer screens already make rather than adding a fourth.
 */
describe('FarmHomeScreen states', () => {
  test('loading shows a loading state, not an empty message', () => {
    useMyFarm.mockReturnValue({ isLoading: true, error: null, farms: [] })
    useMyRequests.mockReturnValue({ isLoading: true, error: null, requests: [] })
    useFarmerOpportunities.mockReturnValue({ isLoading: true, error: null, data: [] })
    render(<FarmHomeScreen />)

    expect(screen.getByTestId('farm-home-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
  })

  test('an error is an error, offering retry', () => {
    ready({ farm: { error: new Error('could not reach the database'), farms: [] } })
    render(<FarmHomeScreen />)

    expect(screen.getByTestId('error-state')).toBeInTheDocument()
    expect(screen.getByText('could not reach the database')).toBeInTheDocument()
  })

  // "no farm yet — a real message, not an empty list". A farmer nobody has
  // registered yet is a legitimate state, not a failure.
  test('no farm yet is a real message with a next step', () => {
    ready({ farm: { farms: [] }, requests: { requests: [] }, opportunities: { data: [] } })
    render(<FarmHomeScreen />)

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('FarmHomeScreen content', () => {
  test('summarises the farm: farms, plots and crop cycles', () => {
    ready()
    render(<FarmHomeScreen />)

    const summary = screen.getByTestId('farm-home-summary')
    expect(summary).toHaveTextContent('Shamba la Neema')
    expect(screen.getByTestId('summary-plots')).toHaveTextContent('2')
    expect(screen.getByTestId('summary-cycles')).toHaveTextContent('3')
  })

  test('shows the latest request with its status', () => {
    ready()
    render(<FarmHomeScreen />)

    const latest = screen.getByTestId('farm-home-latest-request')
    expect(latest).toHaveTextContent('Maize mill 500 kg/hr')
    expect(screen.getByTestId('status-pill')).toHaveAttribute('data-status', 'approved')
  })

  // useMyRequests orders by created_at descending, so the first row is the
  // latest. Only one is shown: this is a summary, and the list is a tap away.
  test('shows only the latest request, not the whole list', () => {
    ready({
      requests: {
        requests: [request(), request({ id: 'r2', equipment_name: 'Cold room 5 kW' })],
      },
    })
    render(<FarmHomeScreen />)

    expect(screen.getAllByTestId('farm-home-latest-request')).toHaveLength(1)
    expect(screen.getByTestId('farm-home-latest-request')).toHaveTextContent('Maize mill')
  })

  test('a farmer with no requests says so rather than showing a blank panel', () => {
    ready({ requests: { requests: [] } })
    render(<FarmHomeScreen />)

    expect(screen.queryByTestId('farm-home-latest-request')).not.toBeInTheDocument()
    expect(screen.getByTestId('farm-home-no-requests')).toBeInTheDocument()
  })

  test('reports opportunities the farmer supply is inside, and links to them', () => {
    ready()
    render(<FarmHomeScreen />)

    const panel = screen.getByTestId('farm-home-opportunities')
    expect(panel).toHaveTextContent('1')
    expect(screen.getByTestId('farm-home-opportunities-link')).toHaveAttribute(
      'href',
      '/farm/opportunities',
    )
  })

  // Even in a summary, an opportunity must not be read as a completed deal.
  test('states that an opportunity is not a sale', () => {
    ready()
    render(<FarmHomeScreen />)

    expect(screen.getByTestId('farm-home-opportunities')).toHaveTextContent(/not a sale/i)
  })

  test('no opportunities reads as none rather than as a missing panel', () => {
    ready({ opportunities: { data: [] } })
    render(<FarmHomeScreen />)

    expect(screen.getByTestId('farm-home-opportunities')).toHaveTextContent(/none|0/i)
  })
})
