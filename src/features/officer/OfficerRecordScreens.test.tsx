import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const useFarmDetail = vi.fn()
const useCycleDetail = vi.fn()

vi.mock('@/features/officer/useOfficerRecords', () => ({
  useFarmDetail: () => useFarmDetail(),
  useCycleDetail: () => useCycleDetail(),
}))
vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({ useParams: () => ({ farmId: 'f1', cycleId: 'c1' }) }),
}))

const { OfficerFarmScreen, OfficerCycleScreen } = await import(
  '@/features/officer/OfficerRecordScreens'
)
await import('@/i18n')

beforeEach(() => {
  useFarmDetail.mockReset()
  useCycleDetail.mockReset()
})

const provenance = {
  source: 'field_verified',
  verification: 'verified',
  confidence: 'high',
  captured_at: '2026-09-09T21:30:00Z',
}

const farm = (over: Record<string, unknown> = {}) => ({
  id: 'f1',
  label: 'Shamba la Neema',
  village_id: 'v1',
  latitude: -8.1301,
  longitude: 35.1892,
  ...provenance,
  plots: [{ id: 'pl1', label: 'Kipande cha juu', area_ha: 1.8, ...provenance }],
  ...over,
})

const cycle = (over: Record<string, unknown> = {}) => ({
  id: 'c1',
  village_id: 'v1',
  crop_name: 'Maize',
  season_label: 'Msimu 2026 A',
  status: 'growing',
  area_ha: 1.6,
  tree_count: null,
  unit_count: null,
  planted_on: '2026-03-05',
  harvest_start: '2026-09-01',
  harvest_end: '2026-09-30',
  plot_label: 'Kipande cha juu',
  ...provenance,
  harvests: [
    { id: 'h1', kind: 'expected', quantity_kg: 4100, reported_for: '2026-09-15', is_current: true, ...provenance },
    { id: 'h2', kind: 'expected', quantity_kg: 3200, reported_for: '2026-06-01', is_current: false, ...provenance },
  ],
  ...over,
})

/** Spec 5.5 — farm detail, READ-ONLY for the demo. */
describe('OfficerFarmScreen', () => {
  test('loading shows a loading state', () => {
    useFarmDetail.mockReturnValue({ isLoading: true, error: null, data: null })
    render(<OfficerFarmScreen />)
    expect(screen.getByTestId('farm-detail-loading')).toBeInTheDocument()
  })

  test('an error is an error', () => {
    useFarmDetail.mockReturnValue({
      isLoading: false,
      error: new Error('could not reach the database'),
      data: null,
      refetch: vi.fn(),
    })
    render(<OfficerFarmScreen />)
    expect(screen.getByTestId('error-state')).toBeInTheDocument()
  })

  // Zero rows means the farm does not exist, or RLS puts it outside this
  // officer's villages. That is an answer, never an error.
  test('a farm that is not visible is an empty state, not an error', () => {
    useFarmDetail.mockReturnValue({ isLoading: false, error: null, data: null })
    render(<OfficerFarmScreen />)

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  test('shows the farm, its plots with area, and provenance on each', () => {
    useFarmDetail.mockReturnValue({ isLoading: false, error: null, data: farm() })
    render(<OfficerFarmScreen />)

    expect(screen.getByTestId('farm-detail')).toHaveTextContent('Shamba la Neema')
    expect(screen.getByTestId('farm-plot')).toHaveTextContent('Kipande cha juu')
    expect(screen.getByTestId('farm-plot')).toHaveTextContent('1.8000 ha')
    // Farm-level plus plot-level.
    expect(screen.getAllByTestId('provenance-badge')).toHaveLength(2)
  })

  test('a farm with no plots says so rather than rendering nothing', () => {
    useFarmDetail.mockReturnValue({ isLoading: false, error: null, data: farm({ plots: [] }) })
    render(<OfficerFarmScreen />)

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.queryByTestId('farm-plot')).not.toBeInTheDocument()
  })

  test('an uncaptured GPS point says so rather than showing a null island', () => {
    useFarmDetail.mockReturnValue({
      isLoading: false,
      error: null,
      data: farm({ latitude: null, longitude: null }),
    })
    render(<OfficerFarmScreen />)

    expect(screen.getByTestId('farm-detail')).toHaveTextContent('Not captured')
    expect(screen.getByTestId('farm-detail')).not.toHaveTextContent('0, 0')
  })

  // Read-only for the demo: add-plot and GpsCapture are deferred, so the
  // screen must not offer a control that does nothing.
  test('offers no write controls', () => {
    useFarmDetail.mockReturnValue({ isLoading: false, error: null, data: farm() })
    render(<OfficerFarmScreen />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

/** Spec 5.6 — cycle detail with its harvest series, READ-ONLY. */
describe('OfficerCycleScreen', () => {
  test('a cycle that is not visible is an empty state', () => {
    useCycleDetail.mockReturnValue({ isLoading: false, error: null, cycle: null })
    render(<OfficerCycleScreen />)
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })

  test('shows the crop, plot, window and measure', () => {
    useCycleDetail.mockReturnValue({ isLoading: false, error: null, cycle: cycle() })
    render(<OfficerCycleScreen />)

    const detail = screen.getByTestId('cycle-detail')
    expect(detail).toHaveTextContent('Maize')
    expect(detail).toHaveTextContent('Kipande cha juu')
    expect(detail).toHaveTextContent('1.6000 ha')
    expect(detail).toHaveTextContent('Growing')
  })

  // A harvest figure is a SERIES, not a value: the superseded row stays
  // visible and labelled so a revision has an audit trail (business-rules §6).
  test('shows the current figure and the one it replaced, labelled', () => {
    useCycleDetail.mockReturnValue({ isLoading: false, error: null, cycle: cycle() })
    render(<OfficerCycleScreen />)

    const rows = screen.getAllByTestId('cycle-harvest')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('4,100.00 kg')
    expect(rows[0]).not.toHaveTextContent(/superseded/i)
    expect(rows[1]).toHaveTextContent('3,200.00 kg')
    expect(rows[1]).toHaveTextContent(/superseded/i)
  })

  test('a cycle with no harvest figure says so', () => {
    useCycleDetail.mockReturnValue({ isLoading: false, error: null, cycle: cycle({ harvests: [] }) })
    render(<OfficerCycleScreen />)

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })

  // The measure branches on crop.measured_by: exactly one of area, trees or
  // units is set, and a tree crop must not render as "0.0000 ha".
  test('a tree-counted crop shows trees, not hectares', () => {
    useCycleDetail.mockReturnValue({
      isLoading: false,
      error: null,
      cycle: cycle({ area_ha: null, tree_count: 120, crop_name: 'Avocado' }),
    })
    render(<OfficerCycleScreen />)

    const detail = screen.getByTestId('cycle-detail')
    expect(detail).toHaveTextContent('120 trees')
    // A hectares FIGURE, not the letters: "Harvest window" and "Shamba" both
    // contain "ha", so a bare substring search fails on correct copy.
    expect(detail).not.toHaveTextContent(/\d+\.\d{4}\s*ha\b/)
  })

  test('offers no write controls', () => {
    useCycleDetail.mockReturnValue({ isLoading: false, error: null, cycle: cycle() })
    render(<OfficerCycleScreen />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
