import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { StatusPill } from '@/components/StatusPill'
import '@/i18n'

describe('StatusPill for a PUE request', () => {
  const statuses = [
    ['draft', 'Draft'],
    ['submitted', 'Submitted'],
    ['under_review', 'Under review'],
    ['approved', 'Approved'],
    ['rejected', 'Rejected'],
    ['withdrawn', 'Withdrawn'],
  ] as const

  for (const [status, label] of statuses) {
    test(`${status} reads as "${label}"`, () => {
      render(<StatusPill kind="request" status={status} />)
      expect(screen.getByTestId('status-pill')).toHaveTextContent(label)
    })
  }

  test('the raw status is exposed for styling and assertions', () => {
    render(<StatusPill kind="request" status="under_review" />)
    expect(screen.getByTestId('status-pill')).toHaveAttribute('data-status', 'under_review')
  })

  test('all six request statuses are visually distinct', () => {
    const classes = new Set<string>()
    for (const [status] of statuses) {
      const { unmount } = render(<StatusPill kind="request" status={status} />)
      classes.add(screen.getByTestId('status-pill').className)
      unmount()
    }
    expect(classes.size).toBe(6)
  })
})

describe('StatusPill for demand and opportunity', () => {
  test('demand statuses render', () => {
    render(<StatusPill kind="demand" status="open" />)
    expect(screen.getByTestId('status-pill')).toHaveTextContent('Open')
  })

  // An opportunity is not a sale. 'accepted' means both sides agreed to talk
  // further — nothing has moved — so the label must not imply a transaction.
  test('an accepted opportunity does not read as a sale', () => {
    render(<StatusPill kind="opportunity" status="accepted" />)
    const pill = screen.getByTestId('status-pill')
    expect(pill).toHaveTextContent('Accepted')
    expect(pill).not.toHaveTextContent(/sold|sale|paid|delivered/i)
  })

  test('the three kinds do not share a translation namespace', () => {
    const { unmount } = render(<StatusPill kind="request" status="approved" />)
    const request = screen.getByTestId('status-pill').textContent
    unmount()
    render(<StatusPill kind="opportunity" status="proposed" />)
    expect(screen.getByTestId('status-pill').textContent).not.toBe(request)
  })
})
