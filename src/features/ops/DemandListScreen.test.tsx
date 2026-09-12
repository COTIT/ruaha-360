import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const useDemands = vi.fn()
const useDemandFormOptions = vi.fn()
const mutate = vi.fn()
const createState = { isPending: false, error: null as Error | null }

vi.mock('@/features/ops/useDemand', () => ({
  useDemands: () => useDemands(),
  useDemandFormOptions: () => useDemandFormOptions(),
  useCreateDemand: () => ({ mutate, reset: vi.fn(), isError: false, ...createState }),
}))
vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({ useSearch: () => ({}), useNavigate: () => vi.fn() }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a href="#x">{children}</a>,
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

const { DemandListScreen } = await import('@/features/ops/DemandListScreen')
await import('@/i18n')

beforeEach(() => {
  useDemands.mockReset()
  useDemandFormOptions.mockReset()
  mutate.mockReset()
  createState.isPending = false
  createState.error = null

  // `useDemands` returns the SHAPED rows under `demands`, not raw `data`.
  useDemands.mockReturnValue({ isLoading: false, error: null, demands: [] })
  useDemandFormOptions.mockReturnValue({
    isLoading: false,
    data: {
      buyers: [
        {
          id: 'b1',
          name: 'Iringa Grain Traders',
          project_id: '20000000-0000-4000-8000-000000000001',
        },
      ],
      crops: [{ id: 'c1', name: 'Maize' }],
    },
  })
})

const fill = () => {
  fireEvent.change(screen.getByTestId('demand-buyer'), { target: { value: 'b1' } })
  fireEvent.change(screen.getByTestId('demand-crop'), { target: { value: 'c1' } })
  fireEvent.change(screen.getByTestId('demand-quantity'), { target: { value: '2500' } })
}

/**
 * QA #11 and #23 — spec 7.6's create form.
 *
 * It was a bare `<button type="button">` with an onClick, on a form whose
 * fields are typed then submitted. A keyboard user had to tab past eight
 * fields to reach it, and Enter did nothing.
 */
describe('the demand create form', () => {
  test('submits as a form, not as a click handler', () => {
    render(<DemandListScreen />)

    const button = screen.getByTestId('demand-create-submit')
    expect(button).toHaveAttribute('type', 'submit')
    expect(button.closest('form')).not.toBeNull()
  })

  test('so submitting the form records the demand', () => {
    render(<DemandListScreen />)
    fill()

    fireEvent.submit(screen.getByTestId('demand-create-submit').closest('form')!)

    expect(mutate).toHaveBeenCalledTimes(1)
  })

  // The required-field checks still run on the form's own submit, not only on
  // a click.
  test('and an empty form still reports what is missing', () => {
    render(<DemandListScreen />)

    fireEvent.submit(screen.getByTestId('demand-create-submit').closest('form')!)

    expect(screen.getByTestId('demand-buyer-error')).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  test('a write in flight disables the control', () => {
    createState.isPending = true
    render(<DemandListScreen />)

    expect(screen.getByTestId('demand-create-submit')).toBeDisabled()
  })

  // QA #23: the data was safe, but three submits in one tick is three writes.
  test('a second submit in the same tick does not write twice', () => {
    render(<DemandListScreen />)
    fill()

    const form = screen.getByTestId('demand-create-submit').closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)

    expect(mutate).toHaveBeenCalledTimes(1)
  })
})
