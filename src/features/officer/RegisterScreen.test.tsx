import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const useSession = vi.fn()
const useCrops = vi.fn()
const useDraft = vi.fn()
const rpc = vi.fn()
const navigate = vi.fn()
const save = vi.fn()
const clear = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({ useSearch: () => ({ draft: 'draft-ref-1' }) }),
  useNavigate: () => navigate,
  Link: ({ children }: { children: React.ReactNode }) => <a href="#x">{children}</a>,
}))
vi.mock('@/app/session', () => ({ useSession: () => useSession() }))
vi.mock('@/features/officer/useCrops', () => ({ useCrops: () => useCrops() }))
vi.mock('@/lib/drafts', () => ({
  draftKey: (a: string, b: string) => `${a}:${b}`,
  useDraft: () => useDraft(),
}))
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: (...args: unknown[]) => rpc(...args) } }))

const { RegisterScreen } = await import('@/features/officer/RegisterScreen')
await import('@/i18n')

const VILLAGE = '30000000-0000-4000-8000-000000000001'
const MAIZE = '40000000-0000-4000-8000-000000000001'
const COFFEE = '40000000-0000-4000-8000-000000000003'

beforeEach(() => {
  rpc.mockReset()
  navigate.mockReset()
  save.mockReset()
  clear.mockReset()
  useSession.mockReturnValue({
    isLoading: false,
    error: null,
    data: {
      appUser: { id: 'u1', person_id: null },
      memberships: [
        { id: 'm1', role: 'field_officer', project_id: 'p1', village_id: VILLAGE, revoked_at: null },
      ],
    },
  })
  useCrops.mockReturnValue({
    isLoading: false,
    error: null,
    crops: [
      { id: MAIZE, name: 'Mahindi', measured_by: 'area' },
      { id: COFFEE, name: 'Kahawa', measured_by: 'tree_count' },
    ],
  })
  useDraft.mockReturnValue({ status: 'clean', draft: null, save, clear })
  rpc.mockResolvedValue({ data: { person_id: 'new-person' }, error: null })
})

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <RegisterScreen />
    </QueryClientProvider>,
  )
}

/** Fills a complete, valid registration. */
function fillValid() {
  fireEvent.change(screen.getByTestId('register-given-name'), { target: { value: 'Neema' } })
  fireEvent.change(screen.getByTestId('register-family-name'), { target: { value: 'Mwakalinga' } })
  fireEvent.change(screen.getByTestId('register-farm-label'), { target: { value: 'Shamba' } })
  fireEvent.change(screen.getByTestId('register-plot-label'), { target: { value: 'Kipande' } })
  fireEvent.change(screen.getByTestId('register-crop'), { target: { value: MAIZE } })
  fireEvent.change(screen.getByTestId('register-cycle-area'), { target: { value: '1.6' } })
}

const submit = () => fireEvent.click(screen.getByTestId('register-submit'))

/**
 * QA #16 and #17. `required: true` rejected `""` and accepted `"   "`, and
 * `person.given_name` is `not null` — which `'   '` satisfies. A farmer could
 * be registered with a blank name, on a screen with no rename to fix it.
 */
describe('whitespace-only names', () => {
  test('are refused inline, and never reach the RPC', async () => {
    renderScreen()
    fillValid()
    fireEvent.change(screen.getByTestId('register-given-name'), { target: { value: '   ' } })
    submit()

    await waitFor(() =>
      expect(screen.getByTestId('register-given-name-error')).toBeInTheDocument(),
    )
    expect(rpc).not.toHaveBeenCalled()
  })

  test('and the value that is stored is the trimmed one', async () => {
    renderScreen()
    fillValid()
    fireEvent.change(screen.getByTestId('register-given-name'), { target: { value: '  Neema  ' } })
    submit()

    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1))
    const payload = rpc.mock.calls[0][1].payload as { person: { given_name: string } }
    expect(payload.person.given_name).toBe('Neema')
  })
})

/**
 * QA #19. The measure field is rendered conditionally on `crop.measured_by`,
 * and was the one field with no check — so the RPC's own prose was doing an
 * inline message's job, one round trip later.
 */
describe('the conditional measure field', () => {
  test('is required for the crop that uses it', async () => {
    renderScreen()
    fillValid()
    fireEvent.change(screen.getByTestId('register-cycle-area'), { target: { value: '' } })
    submit()

    await waitFor(() =>
      expect(screen.getByTestId('register-cycle-area-ha-error')).toBeInTheDocument(),
    )
    expect(rpc).not.toHaveBeenCalled()
  })

  test('follows the crop: a tree crop asks for trees', async () => {
    renderScreen()
    fillValid()
    fireEvent.change(screen.getByTestId('register-crop'), { target: { value: COFFEE } })
    submit()

    await waitFor(() =>
      expect(screen.getByTestId('register-cycle-tree-count-error')).toBeInTheDocument(),
    )
    expect(screen.queryByTestId('register-cycle-area-ha-error')).not.toBeInTheDocument()
  })
})

/**
 * QA #21. `cycle_window_sane` caught this and its constraint NAME was rendered
 * as user copy.
 */
describe('the harvest window', () => {
  test('a backwards window is caught inline, on the end date', async () => {
    renderScreen()
    fillValid()
    fireEvent.change(screen.getByTestId('register-harvest-start'), {
      target: { value: '2026-09-30' },
    })
    fireEvent.change(screen.getByTestId('register-harvest-end'), {
      target: { value: '2026-09-01' },
    })
    submit()

    await waitFor(() =>
      expect(screen.getByTestId('register-harvest-end-error')).toBeInTheDocument(),
    )
    expect(rpc).not.toHaveBeenCalled()
  })

  // A constraint identifier is not user copy — that is the whole point of
  // catching this here.
  test('and says what is wrong in words', async () => {
    renderScreen()
    fillValid()
    fireEvent.change(screen.getByTestId('register-harvest-start'), {
      target: { value: '2026-09-30' },
    })
    fireEvent.change(screen.getByTestId('register-harvest-end'), {
      target: { value: '2026-09-01' },
    })
    submit()

    const error = await screen.findByTestId('register-harvest-end-error')
    expect(error).toHaveTextContent(/harvest window must end/i)
    expect(error).not.toHaveTextContent(/cycle_window_sane|register\./)
  })
})

/**
 * One message per reason. A single "This is required." under every field was
 * what made #16 and #19 hard to see: the form could only say "something".
 */
describe('the message names the actual problem', () => {
  test('text in a number field says so', async () => {
    renderScreen()
    fillValid()
    fireEvent.change(screen.getByTestId('register-harvest-kg'), { target: { value: 'abc' } })
    submit()

    const error = await screen.findByTestId('register-harvest-quantity-kg-error')
    expect(error).toHaveTextContent(/enter a number/i)
  })

  test('a number too big for its column says that, rather than overflowing', async () => {
    renderScreen()
    fillValid()
    fireEvent.change(screen.getByTestId('register-harvest-kg'), {
      target: { value: '999999999999' },
    })
    submit()

    const error = await screen.findByTestId('register-harvest-quantity-kg-error')
    expect(error).toHaveTextContent(/too large/i)
    expect(rpc).not.toHaveBeenCalled()
  })

  test('an empty required field still says it is required', async () => {
    renderScreen()
    fillValid()
    fireEvent.change(screen.getByTestId('register-family-name'), { target: { value: '' } })
    submit()

    const error = await screen.findByTestId('register-family-name-error')
    expect(error).toHaveTextContent(/required/i)
  })
})

/** QA #28. `person.phone` is free text by design, so a hint is all there is. */
describe('the phone field', () => {
  test('shows the format the programme uses, without enforcing it', async () => {
    renderScreen()

    expect(screen.getByTestId('register-phone-hint')).toHaveTextContent(/\+255/)

    fillValid()
    fireEvent.change(screen.getByTestId('register-phone'), { target: { value: '0700 000 101' } })
    submit()

    // Free text: an unconventional number is still a number someone answered.
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1))
  })
})

/**
 * QA #27. `hectares` is `numeric(10,4)`, so 1.23456789 is stored as 1.2346 —
 * correctly, and silently. The operator typed one number and the record holds
 * another.
 */
describe('silent rounding', () => {
  test('says what will actually be stored', () => {
    renderScreen()
    fireEvent.change(screen.getByTestId('register-plot-area'), {
      target: { value: '1.23456789' },
    })

    expect(screen.getByTestId('register-plot-area-rounded')).toHaveTextContent('1.2346')
  })

  test('says nothing when nothing changes', () => {
    renderScreen()
    fireEvent.change(screen.getByTestId('register-plot-area'), { target: { value: '1.8' } })

    expect(screen.queryByTestId('register-plot-area-rounded')).not.toBeInTheDocument()
  })

  // quantity_kg is numeric(12,2) — a different scale on the same form.
  test('uses each column own scale', () => {
    renderScreen()
    fireEvent.change(screen.getByTestId('register-harvest-kg'), { target: { value: '4100.567' } })

    expect(screen.getByTestId('register-harvest-kg-rounded')).toHaveTextContent('4100.57')
  })
})

describe('a valid registration', () => {
  test('is not newly blocked by any of this', async () => {
    renderScreen()
    fillValid()
    fireEvent.change(screen.getByTestId('register-phone'), { target: { value: '+255700000101' } })
    fireEvent.change(screen.getByTestId('register-plot-area'), { target: { value: '1.8' } })
    fireEvent.change(screen.getByTestId('register-harvest-start'), {
      target: { value: '2026-09-01' },
    })
    fireEvent.change(screen.getByTestId('register-harvest-end'), {
      target: { value: '2026-09-30' },
    })
    fireEvent.change(screen.getByTestId('register-harvest-kg'), { target: { value: '4100' } })
    submit()

    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1))
    expect(rpc.mock.calls[0][0]).toBe('app_register_farmer')
  })

  // The draft id IS the RPC's client_ref, so a retry after a timeout replays
  // rather than creating a second farmer.
  test('sends the draft id as its client_ref', async () => {
    renderScreen()
    fillValid()
    submit()

    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1))
    const payload = rpc.mock.calls[0][1].payload as { client_ref: string; village_id: string }
    expect(payload.client_ref).toBe('draft-ref-1')
    expect(payload.village_id).toBe(VILLAGE)
  })

  test('clears the draft only after the RPC returned', async () => {
    renderScreen()
    fillValid()
    submit()

    await waitFor(() => expect(clear).toHaveBeenCalledTimes(1))
  })
})
