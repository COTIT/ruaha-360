import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const useVerifyQueue = vi.fn()
const mutate = vi.fn()
const verifyState = { isPending: false, error: null as Error | null }

vi.mock('@/features/officer/useVerifyQueue', () => ({
  useVerifyQueue: () => useVerifyQueue(),
  useVerifyFromQueue: () => ({ mutate, ...verifyState }),
}))
vi.mock('@/app/scope', () => ({
  useScopeNames: () => ({ data: { villages: { v1: 'Ilundo' }, projects: {} } }),
}))

const { VerifyQueueScreen } = await import('@/features/officer/VerifyQueueScreen')
await import('@/i18n')

beforeEach(() => {
  useVerifyQueue.mockReset()
  mutate.mockReset()
  verifyState.isPending = false
  verifyState.error = null
})

const row = (over: Record<string, unknown> = {}) => ({
  table: 'person',
  id: 'p1',
  label: 'Daudi Mbwana',
  village_id: 'v1',
  source: 'farmer_reported',
  verification: 'unverified',
  confidence: 'low',
  captured_at: '2026-09-09T21:30:00Z',
  ...over,
})

/** Spec 5.7 — the verify queue. */
describe('VerifyQueueScreen states', () => {
  test('loading shows a loading state, not an empty message', () => {
    useVerifyQueue.mockReturnValue({ isLoading: true, error: null, data: [] })
    render(<VerifyQueueScreen />)

    expect(screen.getByTestId('verify-queue-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
  })

  test('an error is an error, offering retry', () => {
    useVerifyQueue.mockReturnValue({
      isLoading: false,
      error: new Error('could not reach the database'),
      data: [],
      refetch: vi.fn(),
    })
    render(<VerifyQueueScreen />)

    expect(screen.getByTestId('error-state')).toBeInTheDocument()
  })

  // Nothing outstanding is good news and gets a real message. It must never
  // read as a failure, and a failed READ must never read as an empty queue —
  // that would tell an officer their work is done when it is not.
  test('an empty queue is a real message, not an error', () => {
    useVerifyQueue.mockReturnValue({ isLoading: false, error: null, data: [] })
    render(<VerifyQueueScreen />)

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByTestId('verify-queue-count')).not.toBeInTheDocument()
  })
})

describe('VerifyQueueScreen content', () => {
  test('counts the queue and lists each record with its kind and provenance', () => {
    useVerifyQueue.mockReturnValue({
      isLoading: false,
      error: null,
      data: [row(), row({ table: 'farm', id: 'f1', label: 'Shamba la Neema' })],
    })
    render(<VerifyQueueScreen />)

    expect(screen.getByTestId('verify-queue-count')).toHaveTextContent('2')
    expect(screen.getAllByTestId('verify-queue-row')).toHaveLength(2)
    expect(screen.getByText('Person')).toBeInTheDocument()
    expect(screen.getByText('Farm')).toBeInTheDocument()
    expect(screen.getAllByTestId('provenance-badge')).toHaveLength(2)
  })

  // Spec 5.7 names both statuses, and VerifyButton hides only on 'verified',
  // so a pending record is actionable. A queue holding rows nobody can clear
  // would be worse than one that lets an officer clear them.
  test('offers Verify on pending as well as unverified', () => {
    useVerifyQueue.mockReturnValue({
      isLoading: false,
      error: null,
      data: [row({ verification: 'pending', id: 'p2' })],
    })
    render(<VerifyQueueScreen />)

    expect(screen.getByTestId('verify-person-p2')).toBeInTheDocument()
  })

  test('verifying one record sends only that record', async () => {
    useVerifyQueue.mockReturnValue({ isLoading: false, error: null, data: [row()] })
    render(<VerifyQueueScreen />)

    await userEvent.click(screen.getByTestId('verify-person-p1'))

    expect(mutate).toHaveBeenCalledTimes(1)
    expect(mutate).toHaveBeenCalledWith({ table: 'person', id: 'p1' })
  })

  test('every verify control is disabled while a verification is in flight', () => {
    verifyState.isPending = true
    useVerifyQueue.mockReturnValue({ isLoading: false, error: null, data: [row()] })
    render(<VerifyQueueScreen />)

    expect(screen.getByTestId('verify-person-p1')).toBeDisabled()
  })

  // app_verify's own message, shown as written (business-rules §9).
  test("a refusal from app_verify is surfaced verbatim", () => {
    verifyState.error = new Error('only field staff may verify records')
    useVerifyQueue.mockReturnValue({ isLoading: false, error: null, data: [row()] })
    render(<VerifyQueueScreen />)

    expect(screen.getByTestId('error-state')).toHaveTextContent(
      'only field staff may verify records',
    )
    // The queue still renders: one failed write does not hide the work.
    expect(screen.getByTestId('verify-queue-row')).toBeInTheDocument()
  })
})
