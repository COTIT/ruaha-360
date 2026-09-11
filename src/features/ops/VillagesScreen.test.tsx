import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const useVillageCapacity = vi.fn()
vi.mock('@/features/ops/useOpsReference', () => ({
  useVillageCapacity: () => useVillageCapacity(),
}))

const { VillagesScreen } = await import('@/features/ops/VillagesScreen')
await import('@/i18n')

beforeEach(() => useVillageCapacity.mockReset())

const village = (over: Record<string, unknown> = {}) => ({
  id: '30000000-0000-4000-8000-000000000001',
  name: 'Ilundo',
  code: 'ILU',
  capacity_kw: 500,
  basis: 'planned',
  simultaneity_factor: 0.6,
  effective_from: '2026-01-01',
  source_note: null,
  ...over,
})

/**
 * Spec 7.9 — villages with `village_capacity`, `basis` and
 * `simultaneity_factor` shown explicitly.
 *
 * The labelling here is a product requirement, not copy preference: capacity
 * is PLANNED, never measured, and `capacity_basis` has no 'measured' value on
 * purpose.
 */
describe('VillagesScreen states', () => {
  test('loading shows a loading state', () => {
    useVillageCapacity.mockReturnValue({ isLoading: true, error: null, data: [] })
    render(<VillagesScreen />)

    expect(screen.getByTestId('villages-loading')).toBeInTheDocument()
  })

  test('an error is an error, offering retry', () => {
    useVillageCapacity.mockReturnValue({
      isLoading: false,
      error: new Error('could not reach the database'),
      data: [],
      refetch: vi.fn(),
    })
    render(<VillagesScreen />)

    expect(screen.getByTestId('error-state')).toBeInTheDocument()
  })

  test('no villages is an empty state, not an error', () => {
    useVillageCapacity.mockReturnValue({ isLoading: false, error: null, data: [] })
    render(<VillagesScreen />)

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('VillagesScreen content', () => {
  test('shows capacity, its basis and the simultaneity factor', () => {
    useVillageCapacity.mockReturnValue({ isLoading: false, error: null, data: [village()] })
    render(<VillagesScreen />)

    const table = screen.getByTestId('villages-table')
    expect(table).toHaveTextContent('Ilundo')
    expect(table).toHaveTextContent('500.000 kW')
    expect(screen.getByTestId('village-basis')).toHaveTextContent('Planned')
    expect(table).toHaveTextContent('0.6')
  })

  test('states that capacity is planned and never measured', () => {
    useVillageCapacity.mockReturnValue({ isLoading: false, error: null, data: [village()] })
    render(<VillagesScreen />)

    expect(screen.getByTestId('villages-note')).toHaveTextContent(/planned, never measured/i)
  })

  // Village peak is not the sum of rated power, so the factor is explained
  // rather than left as a bare number.
  test('explains what the simultaneity factor is for', () => {
    useVillageCapacity.mockReturnValue({ isLoading: false, error: null, data: [village()] })
    render(<VillagesScreen />)

    expect(screen.getByText(/not the sum of rated power/i)).toBeInTheDocument()
  })

  // v_village_energy inner-joins capacity, so a village without a current row
  // has no energy figures at all. Absent must not read as zero.
  test('a village with no capacity row shows absent figures, not zeroes', () => {
    useVillageCapacity.mockReturnValue({
      isLoading: false,
      error: null,
      data: [
        village({
          name: 'Mgama',
          capacity_kw: null,
          basis: null,
          simultaneity_factor: null,
          effective_from: null,
        }),
      ],
    })
    render(<VillagesScreen />)

    const table = screen.getByTestId('villages-table')
    expect(table).toHaveTextContent('Mgama')
    expect(table).not.toHaveTextContent('0.000 kW')
    expect(table).toHaveTextContent('—')
  })

  test('never labels a planned figure as measured', () => {
    useVillageCapacity.mockReturnValue({ isLoading: false, error: null, data: [village()] })
    render(<VillagesScreen />)

    expect(screen.queryByText(/measured capacity/i)).not.toBeInTheDocument()
  })
})
