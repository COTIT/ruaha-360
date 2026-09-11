import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const useOpportunity = vi.fn()
const useAvailableHarvest = vi.fn()
const useAttachSupply = vi.fn()
const useOpportunityStatus = vi.fn()

vi.mock('@/features/ops/useOpportunity', () => ({
  useOpportunity: () => useOpportunity(),
  useAvailableHarvest: () => useAvailableHarvest(),
  useAttachSupply: () => useAttachSupply(),
  useOpportunityStatus: () => useOpportunityStatus(),
}))
vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({ useParams: () => ({ opportunityId: 'o1' }) }),
  Link: ({ children }: { children: React.ReactNode }) => <a href="#x">{children}</a>,
}))

const { OpportunityDetailScreen } = await import('@/features/ops/OpportunityDetailScreen')
await import('@/i18n')

const statusMutate = vi.fn()
const attachMutate = vi.fn()

beforeEach(() => {
  useOpportunity.mockReset()
  useAvailableHarvest.mockReset()
  useAttachSupply.mockReset()
  useOpportunityStatus.mockReset()
  statusMutate.mockReset()
  attachMutate.mockReset()

  useAvailableHarvest.mockReturnValue({ isLoading: false, data: [] })
  useAttachSupply.mockReturnValue({
    mutate: attachMutate,
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
  })
  useOpportunityStatus.mockReturnValue({
    mutate: statusMutate,
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
  })
})

const opportunity = (over: Record<string, unknown> = {}) => ({
  id: 'o1',
  village_id: 'v1',
  crop_id: 'c1',
  status: 'proposed',
  buyer_name: 'Iringa Grain Traders',
  crop_name: 'Maize',
  village_name: 'Ilundo',
  demand_quantity_kg: 9000,
  offered_quantity_kg: 6400,
  supply: [
    {
      harvest_report_id: 'h1',
      crop_cycle_id: 'cy1',
      contributed_kg: 4100,
      farmer: 'Neema Mwaipopo',
      person_id: 'p1',
      plot_label: 'Kipande cha juu',
      crop_name: 'Maize',
    },
  ],
  ...over,
})

const loaded = (over: Record<string, unknown> = {}) =>
  useOpportunity.mockReturnValue({
    isLoading: false,
    error: null,
    opportunity: opportunity(over),
    refetch: vi.fn(),
  })

describe('OpportunityDetailScreen states', () => {
  test('loading shows a loading state', () => {
    useOpportunity.mockReturnValue({ isLoading: true, error: null, opportunity: null })
    render(<OpportunityDetailScreen />)
    expect(screen.getByTestId('opportunity-loading')).toBeInTheDocument()
  })

  test('an error is an error', () => {
    useOpportunity.mockReturnValue({
      isLoading: false,
      error: new Error('nope'),
      opportunity: null,
      refetch: vi.fn(),
    })
    render(<OpportunityDetailScreen />)
    expect(screen.getByTestId('error-state')).toBeInTheDocument()
  })

  // Zero rows is an answer: RLS says this opportunity is not visible.
  test('no opportunity is an empty state, not an error', () => {
    useOpportunity.mockReturnValue({ isLoading: false, error: null, opportunity: null })
    render(<OpportunityDetailScreen />)
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument()
  })
})

/**
 * QA #12, third bullet. The header read "Quantity 9,000.00 kg" above "Offered
 * 6,400.00 kg". The 9,000 is the BUYER'S DEMAND. On a screen whose entire job
 * is keeping demand and supply distinct, "Quantity" names neither.
 */
describe('the two quantities are named', () => {
  test('the demand figure says whose it is', () => {
    loaded()
    render(<OpportunityDetailScreen />)

    const row = screen.getByTestId('demand-quantity-row')
    expect(row).toHaveTextContent('9,000.00 kg')
    expect(row).toHaveTextContent(/buyer/i)
    expect(row).not.toHaveTextContent(/^Quantity/)
  })

  test('the offered total is this opportunity own, and says the database sums it', () => {
    loaded()
    render(<OpportunityDetailScreen />)

    expect(screen.getByTestId('offered-total')).toHaveTextContent('6,400.00 kg')
    expect(screen.getByTestId('offered-total-note')).toHaveTextContent(/re-summed|database/i)
  })

  test('an opportunity is not a sale, on this screen too', () => {
    loaded()
    render(<OpportunityDetailScreen />)
    expect(screen.getByText(/not a sale/i)).toBeInTheDocument()
  })
})

describe('status controls follow the machine', () => {
  test('a proposed opportunity can be shared, declined or lapsed', () => {
    loaded({ status: 'proposed' })
    render(<OpportunityDetailScreen />)

    const actions = screen.getByTestId('opportunity-actions')
    expect(within(actions).getByTestId('action-share')).toBeInTheDocument()
    expect(within(actions).getByTestId('action-decline')).toBeInTheDocument()
    expect(within(actions).getByTestId('action-lapse')).toBeInTheDocument()
    // Accepted describes the buyer's answer. Nobody has shown them anything.
    expect(within(actions).queryByTestId('action-accept')).not.toBeInTheDocument()
  })

  test('a shared opportunity can be accepted', () => {
    loaded({ status: 'shared' })
    render(<OpportunityDetailScreen />)

    expect(screen.getByTestId('action-accept')).toBeInTheDocument()
    expect(screen.queryByTestId('action-share')).not.toBeInTheDocument()
  })

  test('an accepted opportunity can still be declined or lapsed', () => {
    loaded({ status: 'accepted' })
    render(<OpportunityDetailScreen />)

    expect(screen.getByTestId('action-decline')).toBeInTheDocument()
    expect(screen.getByTestId('action-lapse')).toBeInTheDocument()
    expect(screen.queryByTestId('action-accept')).not.toBeInTheDocument()
  })

  test('a released opportunity offers no controls at all', () => {
    for (const status of ['declined', 'lapsed'] as const) {
      loaded({ status })
      const { unmount } = render(<OpportunityDetailScreen />)
      expect(screen.queryByTestId('opportunity-actions')).not.toBeInTheDocument()
      unmount()
    }
  })

  // A forward move costs nothing and undoes nothing.
  test('sharing goes straight through', () => {
    loaded({ status: 'proposed' })
    render(<OpportunityDetailScreen />)

    fireEvent.click(screen.getByTestId('action-share'))
    expect(statusMutate).toHaveBeenCalledWith('shared')
  })
})

/**
 * Declining and lapsing are one-way AND they move other people's numbers:
 * per business-rules §7 the supply returns to `v_harvest_available`. Both
 * facts belong in front of the user before the click, not after.
 */
describe('releasing supply is confirmed first', () => {
  test('declining asks first and does not fire the mutation', () => {
    loaded({ status: 'shared' })
    render(<OpportunityDetailScreen />)

    fireEvent.click(screen.getByTestId('action-decline'))

    expect(statusMutate).not.toHaveBeenCalled()
    expect(screen.getByTestId('release-confirm')).toBeInTheDocument()
  })

  test('the confirmation says the supply comes back and the move cannot be undone', () => {
    loaded({ status: 'shared' })
    render(<OpportunityDetailScreen />)

    fireEvent.click(screen.getByTestId('action-decline'))
    const confirm = screen.getByTestId('release-confirm')

    expect(confirm).toHaveTextContent(/available/i)
    expect(confirm).toHaveTextContent(/cannot be undone|final/i)
  })

  test('confirming performs the transition', () => {
    loaded({ status: 'shared' })
    render(<OpportunityDetailScreen />)

    fireEvent.click(screen.getByTestId('action-decline'))
    fireEvent.click(screen.getByTestId('release-confirm-yes'))

    expect(statusMutate).toHaveBeenCalledWith('declined')
  })

  test('lapsing is confirmed the same way, and targets lapsed', () => {
    loaded({ status: 'proposed' })
    render(<OpportunityDetailScreen />)

    fireEvent.click(screen.getByTestId('action-lapse'))
    fireEvent.click(screen.getByTestId('release-confirm-yes'))

    expect(statusMutate).toHaveBeenCalledWith('lapsed')
  })

  test('cancelling leaves the opportunity alone', () => {
    loaded({ status: 'shared' })
    render(<OpportunityDetailScreen />)

    fireEvent.click(screen.getByTestId('action-decline'))
    fireEvent.click(screen.getByTestId('release-confirm-no'))

    expect(statusMutate).not.toHaveBeenCalled()
    expect(screen.queryByTestId('release-confirm')).not.toBeInTheDocument()
  })

  // Four buttons all reading "Saving…" would be four claims about one write.
  test('a transition in flight disables the controls and says so once', () => {
    loaded({ status: 'proposed' })
    useOpportunityStatus.mockReturnValue({
      mutate: statusMutate,
      isPending: true,
      isError: false,
      error: null,
      reset: vi.fn(),
    })
    render(<OpportunityDetailScreen />)

    expect(screen.getByTestId('action-share')).toBeDisabled()
    expect(screen.getByTestId('action-decline')).toBeDisabled()
    expect(screen.getByTestId('action-share')).toHaveTextContent(/share/i)
    expect(screen.getAllByTestId('status-saving')).toHaveLength(1)
  })

  // An RLS refusal on a WRITE means the UI offered a control it should not
  // have — §9 calls that a bug to fix. The user still needs a sentence, and
  // `new row violates row-level security policy` is not one.
  test('a failed transition is reported in words, not in policy language', () => {
    loaded({ status: 'shared' })
    useOpportunityStatus.mockReturnValue({
      mutate: statusMutate,
      isPending: false,
      isError: true,
      error: new Error('new row violates row-level security policy'),
      reset: vi.fn(),
    })
    render(<OpportunityDetailScreen />)

    const shown = screen.getByTestId('status-error')
    expect(shown).toHaveTextContent(/do not have permission/i)
    expect(shown).not.toHaveTextContent(/row-level security/i)
  })
})

/**
 * QA #12, first bullet, answered by the schema rather than by a delete:
 * `opportunity_supply` has no DELETE policy and no `deleted_at`. §7's release
 * IS the mechanism, so a released opportunity must say so — otherwise two
 * supply lines still sit on screen looking committed.
 */
describe('a released opportunity explains itself', () => {
  test('declined says the supply went back to available', () => {
    loaded({ status: 'declined' })
    render(<OpportunityDetailScreen />)

    expect(screen.getByTestId('released-note')).toHaveTextContent(/available/i)
  })

  test('its supply lines are still listed — the record is not erased', () => {
    loaded({ status: 'declined' })
    render(<OpportunityDetailScreen />)

    expect(screen.getAllByTestId('supply-row')).toHaveLength(1)
  })

  // Attaching to a released opportunity would add a line that counts toward
  // nothing: committed_kg only sums the live statuses.
  test('nothing more can be attached to it', () => {
    loaded({ status: 'declined' })
    render(<OpportunityDetailScreen />)

    expect(screen.queryByTestId('attach-submit')).not.toBeInTheDocument()
    expect(screen.getByTestId('attach-closed')).toBeInTheDocument()
  })

  test('a live opportunity still offers the attach form', () => {
    loaded({ status: 'proposed' })
    useAvailableHarvest.mockReturnValue({
      isLoading: false,
      data: [
        {
          harvest_report_id: 'h9',
          crop_cycle_id: 'cy9',
          quantity_kg: 4100,
          available_kg: 4100,
          harvest_start: '2026-09-01',
        },
      ],
    })
    render(<OpportunityDetailScreen />)

    expect(screen.getByTestId('attach-submit')).toBeInTheDocument()
    expect(screen.queryByTestId('attach-closed')).not.toBeInTheDocument()
  })
})

/**
 * QA #12, fourth bullet: the option read "4,100.00 kg · 0.00 kg Available ·
 * 1 Sep 2026" — a capital "Available" mid-phrase, and a leading figure with no
 * label at all on a screen that exists to keep two quantities apart.
 */
describe('the harvest options name their figures', () => {
  test('both quantities are labelled, in sentence case', () => {
    loaded({ status: 'proposed' })
    useAvailableHarvest.mockReturnValue({
      isLoading: false,
      data: [
        {
          harvest_report_id: 'h9',
          crop_cycle_id: 'cy9',
          quantity_kg: 4100,
          available_kg: 0,
          harvest_start: '2026-09-01',
        },
      ],
    })
    render(<OpportunityDetailScreen />)

    const option = within(screen.getByTestId('attach-harvest')).getByRole('option', {
      name: /4,100/,
    })
    expect(option).toHaveTextContent(/4,100\.00 kg expected/)
    expect(option).toHaveTextContent(/0\.00 kg available/)
    expect(option).not.toHaveTextContent('Available')
  })

  // Fully committed figures stay listed: hiding them would be a client-side
  // copy of opportunity_supply_guard.
  test('a fully committed figure is still offered', () => {
    loaded({ status: 'proposed' })
    useAvailableHarvest.mockReturnValue({
      isLoading: false,
      data: [
        { harvest_report_id: 'h9', crop_cycle_id: 'cy9', quantity_kg: 4100, available_kg: 0, harvest_start: null },
      ],
    })
    render(<OpportunityDetailScreen />)

    expect(
      within(screen.getByTestId('attach-harvest')).getAllByRole('option'),
    ).toHaveLength(2)
  })
})

/**
 * QA #21's tail. `opportunity_supply.contributed_kg` is
 * `check (contributed_kg > 0)`, so 0 or a negative came back as a raw
 * constraint name — the same family as the harvest window and the request
 * hours.
 */
describe('the contribution has to be a contribution', () => {
  const withHarvest = () => {
    loaded({ status: 'proposed' })
    useAvailableHarvest.mockReturnValue({
      isLoading: false,
      data: [
        {
          harvest_report_id: 'h9',
          crop_cycle_id: 'cy9',
          quantity_kg: 4100,
          available_kg: 4100,
          harvest_start: '2026-09-01',
        },
      ],
    })
  }

  const attach = (kg: string, harvest = 'h9') => {
    render(<OpportunityDetailScreen />)
    if (harvest) fireEvent.change(screen.getByTestId('attach-harvest'), { target: { value: harvest } })
    fireEvent.change(screen.getByTestId('attach-kg'), { target: { value: kg } })
    fireEvent.click(screen.getByTestId('attach-submit'))
  }

  test('zero kilograms is refused inline, not by the database', () => {
    withHarvest()
    attach('0')

    expect(screen.getByTestId('attach-kg-error')).toHaveTextContent(/more than zero/i)
    expect(attachMutate).not.toHaveBeenCalled()
  })

  test('a negative contribution is refused', () => {
    withHarvest()
    attach('-5')

    expect(screen.getByTestId('attach-kg-error')).toBeInTheDocument()
    expect(attachMutate).not.toHaveBeenCalled()
  })

  test('text is refused, and says what is wrong', () => {
    withHarvest()
    attach('abc')

    expect(screen.getByTestId('attach-kg-error')).toHaveTextContent(/enter a number/i)
  })

  test('a blank says which answer is missing rather than nothing happening', () => {
    withHarvest()
    attach('')

    expect(screen.getByTestId('attach-kg-error')).toBeInTheDocument()
    expect(attachMutate).not.toHaveBeenCalled()
  })

  test('choosing no harvest figure says so', () => {
    withHarvest()
    attach('100', '')

    expect(screen.getByTestId('attach-harvest-error')).toBeInTheDocument()
    expect(attachMutate).not.toHaveBeenCalled()
  })

  test('a valid contribution goes through', () => {
    withHarvest()
    attach('1600')

    expect(attachMutate).toHaveBeenCalledWith({
      harvestReportId: 'h9',
      cropCycleId: 'cy9',
      contributedKg: 1600,
    })
  })

  /**
   * The important one. A figure past what is available must still be SENT, so
   * that `opportunity_supply_guard` refuses it and its message — which names
   * the real kilograms — is what the user reads. A client-side copy of that
   * check would drift and would be wrong the moment another opportunity
   * committed the same harvest.
   */
  test('a quantity beyond what is available is still sent to the guard', () => {
    withHarvest()
    attach('99999')

    expect(attachMutate).toHaveBeenCalledWith(
      expect.objectContaining({ contributedKg: 99999 }),
    )
  })

  test('the error clears once the figure is fixed', () => {
    withHarvest()
    render(<OpportunityDetailScreen />)
    fireEvent.change(screen.getByTestId('attach-harvest'), { target: { value: 'h9' } })
    fireEvent.change(screen.getByTestId('attach-kg'), { target: { value: '0' } })
    fireEvent.click(screen.getByTestId('attach-submit'))
    expect(screen.getByTestId('attach-kg-error')).toBeInTheDocument()

    fireEvent.change(screen.getByTestId('attach-kg'), { target: { value: '1600' } })
    fireEvent.click(screen.getByTestId('attach-submit'))

    expect(screen.queryByTestId('attach-kg-error')).not.toBeInTheDocument()
    expect(attachMutate).toHaveBeenCalledTimes(1)
  })
})
