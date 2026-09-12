import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const useSession = vi.fn()
const useEquipmentItem = vi.fn()
const mutate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({ useParams: () => ({ equipmentId: 'eq1' }) }),
  Link: ({ children }: { children: React.ReactNode }) => <a href="#x">{children}</a>,
}))
vi.mock('@/app/session', () => ({ useSession: () => useSession() }))
vi.mock('@/features/farmer/useEquipment', () => ({
  useEquipmentItem: () => useEquipmentItem(),
}))
const useSubmitRequestState = {
  isPending: false,
  isError: false,
  isSuccess: false,
}
vi.mock('@/features/farmer/useRequests', () => ({
  useSubmitRequest: () => ({ mutate, reset: vi.fn(), ...useSubmitRequestState }),
}))

const { EquipmentDetailScreen } = await import('@/features/farmer/EquipmentDetailScreen')
await import('@/i18n')

const VILLAGE = '30000000-0000-4000-8000-000000000001'

beforeEach(() => {
  mutate.mockReset()
  useSubmitRequestState.isPending = false
  useSubmitRequestState.isError = false
  useSubmitRequestState.isSuccess = false
  useSession.mockReturnValue({
    isLoading: false,
    error: null,
    data: {
      appUser: { id: 'u1', person_id: 'p1' },
      memberships: [
        { id: 'm1', role: 'farmer', project_id: 'pr1', village_id: VILLAGE, revoked_at: null },
      ],
    },
  })
  useEquipmentItem.mockReturnValue({
    isLoading: false,
    error: null,
    item: {
      id: 'eq1',
      name: 'Mill',
      category_name: 'Processing',
      rated_power_kw: 15,
      indicative_price: 1000,
      currency: 'TZS',
      typical_hours_per_day: 6,
      typical_days_per_week: 5,
    },
  })
})

const set = (testId: string, value: string) =>
  fireEvent.change(screen.getByTestId(testId), { target: { value } })
const submit = () => fireEvent.click(screen.getByTestId('request-submit'))

describe('the request form as it arrives', () => {
  // Prefilled from the equipment's typicals, so the common case is one click.
  test('is prefilled from the equipment typicals', () => {
    render(<EquipmentDetailScreen />)

    expect(screen.getByTestId('request-quantity')).toHaveValue('1')
    expect(screen.getByTestId('request-hours')).toHaveValue('6')
    expect(screen.getByTestId('request-days')).toHaveValue('5')
  })

  test('shows the estimate for those values', () => {
    render(<EquipmentDetailScreen />)
    expect(screen.getByTestId('estimate-panel')).toBeInTheDocument()
  })

  test('submits the numbers that were shown', async () => {
    render(<EquipmentDetailScreen />)
    submit()

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1))
    expect(mutate.mock.calls[0][0]).toMatchObject({
      villageId: VILLAGE,
      personId: 'p1',
      equipmentId: 'eq1',
      quantity: 1,
      hoursPerDay: 6,
      daysPerWeek: 5,
    })
  })

  test('a purpose of spaces is not stored as a space', async () => {
    render(<EquipmentDetailScreen />)
    set('request-purpose', '   ')
    submit()

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1))
    expect(mutate.mock.calls[0][0].purpose).toBe('')
  })
})

/**
 * QA #9, row by row. The farmer was shown a computed, confident, impossible
 * figure and only learnt it was impossible after submitting.
 */
describe('impossible assumptions are refused before the round trip', () => {
  test('99 hours in a day is refused inline', async () => {
    render(<EquipmentDetailScreen />)
    set('request-hours', '99')
    submit()

    const error = await screen.findByTestId('request-hours-error')
    expect(error).toHaveTextContent(/0 to 24/i)
    expect(mutate).not.toHaveBeenCalled()
  })

  // The column allows 0. A request to run a mill for zero hours asks for
  // nothing, so the form refuses to send it.
  test('zero hours is refused, and says why', async () => {
    render(<EquipmentDetailScreen />)
    set('request-hours', '0')
    submit()

    const error = await screen.findByTestId('request-hours-error')
    expect(error).toHaveTextContent(/more than zero/i)
    expect(mutate).not.toHaveBeenCalled()
  })

  test('zero machines is refused — the column checks quantity > 0', async () => {
    render(<EquipmentDetailScreen />)
    set('request-quantity', '0')
    submit()

    await waitFor(() => expect(screen.getByTestId('request-quantity-error')).toBeInTheDocument())
    expect(mutate).not.toHaveBeenCalled()
  })

  test('eight days in a week is refused', async () => {
    render(<EquipmentDetailScreen />)
    set('request-days', '8')
    submit()

    const error = await screen.findByTestId('request-days-error')
    expect(error).toHaveTextContent(/0 to 7/i)
    expect(mutate).not.toHaveBeenCalled()
  })

  test('half a machine is refused', async () => {
    render(<EquipmentDetailScreen />)
    set('request-quantity', '1.5')
    submit()

    const error = await screen.findByTestId('request-quantity-error')
    expect(error).toHaveTextContent(/whole number/i)
  })

  test('text in a number field says so', async () => {
    render(<EquipmentDetailScreen />)
    set('request-hours', 'abc')
    submit()

    expect(await screen.findByTestId('request-hours-error')).toHaveTextContent(/enter a number/i)
  })

  // A constraint identifier is not user copy. That is the point of catching it
  // here rather than reading `pue_request_hours_per_day_check` back (QA #4).
  test('and never as a constraint name', async () => {
    render(<EquipmentDetailScreen />)
    set('request-hours', '99')
    submit()

    const error = await screen.findByTestId('request-hours-error')
    expect(error).not.toHaveTextContent(/pue_request|check|equipment\./)
  })
})

/**
 * The finding's real complaint: not just that 99 was accepted, but that the
 * screen computed 1,485 kWh/day from it and presented that as an answer.
 */
describe('the estimate does not compute from impossible inputs', () => {
  test('an out-of-range hour count replaces the figures with a reason', () => {
    render(<EquipmentDetailScreen />)
    set('request-hours', '99')

    expect(screen.queryByTestId('estimate-panel')).not.toBeInTheDocument()
    expect(screen.getByTestId('estimate-blocked')).toBeInTheDocument()
  })

  test('so does a blank one', () => {
    render(<EquipmentDetailScreen />)
    set('request-days', '')

    expect(screen.queryByTestId('estimate-panel')).not.toBeInTheDocument()
  })

  test('and the figures come back when the inputs make sense again', () => {
    render(<EquipmentDetailScreen />)
    set('request-hours', '99')
    expect(screen.queryByTestId('estimate-panel')).not.toBeInTheDocument()

    set('request-hours', '8')
    expect(screen.getByTestId('estimate-panel')).toBeInTheDocument()
    expect(screen.queryByTestId('estimate-blocked')).not.toBeInTheDocument()
  })

  test('the blocked note says what is missing rather than showing zeros', () => {
    render(<EquipmentDetailScreen />)
    set('request-hours', '')

    const blocked = screen.getByTestId('estimate-blocked')
    expect(blocked).toHaveTextContent(/hours per day/i)
    expect(blocked).not.toHaveTextContent(/0\.000/)
  })
})

/** QA #23, on the farmer's side of the same pattern. */
describe('the request form in flight', () => {
  test('a second submit in the same tick does not send a second request', async () => {
    render(<EquipmentDetailScreen />)

    submit()
    submit()

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1))
    expect(mutate).toHaveBeenCalledTimes(1)
  })

  test('the control is disabled while the write is in flight', () => {
    useSubmitRequestState.isPending = true
    render(<EquipmentDetailScreen />)

    expect(screen.getByTestId('request-submit')).toBeDisabled()
  })
})
