import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import '@/i18n'

describe('EmptyState', () => {
  // "Zero rows is a legitimate answer. RLS returning nothing means you may not
  // see this. Render an empty state, never an error, and never retry."
  test('states what is absent and offers no retry', () => {
    render(<EmptyState title="No requests yet" detail="Requests appear here once submitted." />)

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getByText('No requests yet')).toBeInTheDocument()
    expect(screen.getByText('Requests appear here once submitted.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /retry|try again/i })).not.toBeInTheDocument()
  })

  test('is not announced as an error', () => {
    render(<EmptyState title="Nothing here" />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('ErrorState', () => {
  // Error contract §9: Postgres messages in this schema are written to be read
  // by humans. Surface them verbatim — never replace one with a generic toast.
  test('surfaces the database message verbatim', () => {
    const message = 'over-commitment: 4100.00 kg available, 4100.00 kg already committed, 100.00 kg requested'
    render(<ErrorState error={new Error(message)} />)

    expect(screen.getByTestId('error-state')).toBeInTheDocument()
    expect(screen.getByText(message)).toBeInTheDocument()
  })

  test('is announced as an alert, unlike an empty state', () => {
    render(<ErrorState error={new Error('boom')} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  test('offers retry only when a handler is given', () => {
    const { unmount } = render(<ErrorState error={new Error('boom')} />)
    expect(screen.queryByTestId('error-retry')).not.toBeInTheDocument()
    unmount()

    render(<ErrorState error={new Error('boom')} onRetry={() => {}} />)
    expect(screen.getByTestId('error-retry')).toBeInTheDocument()
  })


  /**
   * QA #4, #20, #25. "Surface them verbatim" is right about the messages the
   * SCHEMA writes, and was being applied to machine noise as well —
   * `pue_request_hours_per_day_check` and `TypeError: Failed to fetch` both
   * reached users as copy.
   */
  test('a check-constraint identifier is replaced by a sentence', () => {
    render(
      <ErrorState
        error={
          new Error(
            'new row for relation "pue_request" violates check constraint "pue_request_hours_per_day_check"',
          )
        }
      />,
    )

    expect(screen.getByTestId('error-state')).toHaveTextContent(/between 0 and 24/i)
    expect(screen.getByTestId('error-state')).not.toHaveTextContent('pue_request')
  })

  test('a JS exception becomes something a field officer can act on', () => {
    render(<ErrorState error={new TypeError('Failed to fetch')} />)

    expect(screen.getByTestId('error-state')).toHaveTextContent(/check your connection/i)
    expect(screen.getByTestId('error-state')).not.toHaveTextContent('TypeError')
  })

  test('a malformed id does not show the parse failure', () => {
    render(<ErrorState error={new Error('invalid input syntax for type uuid: "nope"')} />)

    expect(screen.getByTestId('error-state')).not.toHaveTextContent('uuid')
  })

  // The regression that matters most: the mapping must not eat the messages
  // §9 exists to protect.
  test('and the schema own messages are still untouched', () => {
    const message = 'this crop is measured by area: area_ha is required'
    render(<ErrorState error={new Error(message)} />)
    expect(screen.getByText(message)).toBeInTheDocument()
  })

  test('handles a non-Error thrown value without crashing', () => {
    render(<ErrorState error={'just a string'} />)
    expect(screen.getByText('just a string')).toBeInTheDocument()
  })
})
