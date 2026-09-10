import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const useEquipmentList = vi.fn()
vi.mock('@/features/farmer/useEquipment', () => ({
  useEquipmentList: () => useEquipmentList(),
}))

const { CatalogueScreen } = await import('@/features/ops/CatalogueScreen')
await import('@/i18n')

beforeEach(() => useEquipmentList.mockReset())

const item = (over: Record<string, unknown> = {}) => ({
  id: '51000000-0000-4000-8000-000000000001',
  name: 'Maize mill 500 kg/hr',
  category_name: 'Milling',
  rated_power_kw: 15,
  typical_hours_per_day: 6,
  typical_days_per_week: 5,
  indicative_price: 22000000,
  currency: 'TZS',
  ...over,
})

/**
 * Spec 7.4 — the catalogue, T1 for READ. Editing is T2 and deliberately absent:
 * "the seed provides the catalogue for the demo".
 */
describe('CatalogueScreen states', () => {
  test('loading shows a loading state, not an empty message', () => {
    useEquipmentList.mockReturnValue({ isLoading: true, error: null, items: [] })
    render(<CatalogueScreen />)

    expect(screen.getByTestId('catalogue-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
  })

  test('an error is an error, offering retry', () => {
    useEquipmentList.mockReturnValue({
      isLoading: false,
      error: new Error('could not reach the database'),
      items: [],
      refetch: vi.fn(),
    })
    render(<CatalogueScreen />)

    expect(screen.getByTestId('error-state')).toBeInTheDocument()
    expect(screen.getByText('could not reach the database')).toBeInTheDocument()
  })

  test('an empty catalogue is an empty state, not an error', () => {
    useEquipmentList.mockReturnValue({ isLoading: false, error: null, items: [] })
    render(<CatalogueScreen />)

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('CatalogueScreen content', () => {
  test('lists the catalogue with the columns spec 7.4 names', () => {
    useEquipmentList.mockReturnValue({ isLoading: false, error: null, items: [item()] })
    render(<CatalogueScreen />)

    const table = screen.getByTestId('catalogue-table')
    expect(table).toHaveTextContent('Maize mill 500 kg/hr')
    expect(table).toHaveTextContent('Milling')
    // Power to 3 dp, money with an explicit currency code — business-rules §14.
    expect(table).toHaveTextContent('15.000 kW')
    expect(table).toHaveTextContent('TZS 22,000,000.00')
    // Typical hours and days, which drive the estimate's fallbacks (§3).
    expect(table).toHaveTextContent('6')
    expect(table).toHaveTextContent('5')
  })

  // "Prices are always labelled indicative. They are not quotations."
  test('the price is labelled indicative', () => {
    useEquipmentList.mockReturnValue({ isLoading: false, error: null, items: [item()] })
    render(<CatalogueScreen />)

    expect(screen.getByTestId('catalogue-price')).toHaveTextContent(/indicative/i)
    expect(screen.getByTestId('catalogue-note')).toHaveTextContent(/not quotations/i)
  })

  // Editing is T2. The screen must not offer a control the tier order says
  // has not been built.
  test('offers no editing controls', () => {
    useEquipmentList.mockReturnValue({ isLoading: false, error: null, items: [item()] })
    render(<CatalogueScreen />)

    expect(screen.queryByTestId('catalogue-edit')).not.toBeInTheDocument()
    expect(screen.queryByTestId('catalogue-create')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add|new|edit/i })).not.toBeInTheDocument()
  })

  // rated_power_kw is nullable, and a null one deletes the estimate rather
  // than zeroing it (business-rules §3). It must not render as "0.000 kW".
  test('a null rated power is shown as unknown, not as zero', () => {
    useEquipmentList.mockReturnValue({
      isLoading: false,
      error: null,
      items: [item({ rated_power_kw: null, indicative_price: null })],
    })
    render(<CatalogueScreen />)

    const table = screen.getByTestId('catalogue-table')
    expect(table).not.toHaveTextContent('0.000 kW')
    expect(table).toHaveTextContent('—')
  })
})
