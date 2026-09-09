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

  test('handles a non-Error thrown value without crashing', () => {
    render(<ErrorState error={'just a string'} />)
    expect(screen.getByText('just a string')).toBeInTheDocument()
  })
})
