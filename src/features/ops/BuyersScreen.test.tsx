import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const useBuyers = vi.fn()
const mutate = vi.fn()
const createState = { isPending: false, error: null as Error | null }

vi.mock('@/features/ops/useOpsReference', () => ({
  useBuyers: () => useBuyers(),
  useCreateBuyer: () => ({ mutate, ...createState }),
  BUYER_CHANNELS: ['direct', 'afm', 'other'],
}))
vi.mock('@/app/session', () => ({
  useSession: () => ({
    data: {
      memberships: [
        {
          id: 'm1',
          role: 'ops',
          project_id: '20000000-0000-4000-8000-000000000001',
          village_id: null,
          revoked_at: null,
        },
      ],
    },
  }),
}))

const { BuyersScreen } = await import('@/features/ops/BuyersScreen')
await import('@/i18n')

beforeEach(() => {
  useBuyers.mockReset()
  mutate.mockReset()
  createState.isPending = false
  createState.error = null
})

const buyer = (over: Record<string, unknown> = {}) => ({
  id: 'b1',
  project_id: '20000000-0000-4000-8000-000000000001',
  name: 'Iringa Grain Traders — DEMO',
  channel: 'direct',
  contact_note: 'Collects from the shed',
  is_active: true,
  ...over,
})

/** Spec 7.5 — buyer list and create. */
describe('BuyersScreen states', () => {
  test('loading shows a loading state', () => {
    useBuyers.mockReturnValue({ isLoading: true, error: null, data: [] })
    render(<BuyersScreen />)

    expect(screen.getByTestId('buyers-loading')).toBeInTheDocument()
  })

  test('an error is an error', () => {
    useBuyers.mockReturnValue({
      isLoading: false,
      error: new Error('could not reach the database'),
      data: [],
      refetch: vi.fn(),
    })
    render(<BuyersScreen />)

    expect(screen.getByTestId('error-state')).toBeInTheDocument()
  })

  test('no buyers is an empty state, not an error', () => {
    useBuyers.mockReturnValue({ isLoading: false, error: null, data: [] })
    render(<BuyersScreen />)

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('BuyersScreen content', () => {
  test('lists buyers with channel and contact note', () => {
    useBuyers.mockReturnValue({ isLoading: false, error: null, data: [buyer()] })
    render(<BuyersScreen />)

    const table = screen.getByTestId('buyers-table')
    expect(table).toHaveTextContent('Iringa Grain Traders')
    expect(table).toHaveTextContent('Direct')
    expect(table).toHaveTextContent('Collects from the shed')
  })

  // "channel = 'afm' is a label only; no integration." The screen must say so
  // rather than let a reader infer a partnership that does not exist.
  test('states that the channel is a label, with no integration implied', () => {
    useBuyers.mockReturnValue({ isLoading: false, error: null, data: [buyer()] })
    render(<BuyersScreen />)

    expect(screen.getByTestId('buyers-note')).toHaveTextContent(/no integration/i)
  })
})

describe('BuyersScreen create', () => {
  test('a nameless buyer is refused before a request is made', async () => {
    useBuyers.mockReturnValue({ isLoading: false, error: null, data: [] })
    render(<BuyersScreen />)

    await userEvent.click(screen.getByTestId('buyer-create-submit'))

    expect(screen.getByTestId('buyer-name-error')).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  test('a whitespace-only name is not a name', async () => {
    useBuyers.mockReturnValue({ isLoading: false, error: null, data: [] })
    render(<BuyersScreen />)

    await userEvent.type(screen.getByTestId('buyer-name'), '   ')
    await userEvent.click(screen.getByTestId('buyer-create-submit'))

    expect(mutate).not.toHaveBeenCalled()
  })

  test('a valid buyer is sent with the session project and trimmed values', async () => {
    useBuyers.mockReturnValue({ isLoading: false, error: null, data: [] })
    render(<BuyersScreen />)

    await userEvent.type(screen.getByTestId('buyer-name'), '  Mbeya Millers  ')
    await userEvent.selectOptions(screen.getByTestId('buyer-channel'), 'afm')
    await userEvent.click(screen.getByTestId('buyer-create-submit'))

    expect(mutate).toHaveBeenCalledTimes(1)
    expect(mutate.mock.calls[0][0]).toEqual({
      project_id: '20000000-0000-4000-8000-000000000001',
      name: 'Mbeya Millers',
      channel: 'afm',
      contact_note: null,
    })
  })

  // The unique (project_id, name) constraint belongs to the database, and is
  // called rather than pre-checked (business-rules §0.3). What reaches the
  // user is the collision in words: Postgres names the CONSTRAINT, not the
  // value, so `duplicate key value violates unique constraint
  // "buyer_project_id_name_key"` is not the sentence anybody needs (QA #4).
  test('a database refusal is surfaced rather than swallowed', () => {
    createState.error = new Error(
      'duplicate key value violates unique constraint "buyer_project_id_name_key"',
    )
    useBuyers.mockReturnValue({ isLoading: false, error: null, data: [] })
    render(<BuyersScreen />)

    const shown = screen.getByTestId('error-state')
    expect(shown).toHaveTextContent(/buyer with that name already exists/i)
    expect(shown).not.toHaveTextContent('buyer_project_id_name_key')
  })

  test('submit is disabled while the write is in flight', () => {
    createState.isPending = true
    useBuyers.mockReturnValue({ isLoading: false, error: null, data: [] })
    render(<BuyersScreen />)

    expect(screen.getByTestId('buyer-create-submit')).toBeDisabled()
  })
})
