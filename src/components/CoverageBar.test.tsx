import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { CoverageBar } from '@/components/CoverageBar'
import '@/i18n'

/**
 * Spec §9.1: "Demand against available supply, with the already-committed
 * slice visible."
 *
 * The seeded case: Ilundo maize has 12,000 kg expected, 6,400 kg already
 * committed to the demo opportunity, so 5,600 kg available against a
 * 9,000 kg demand — 62.2% coverage.
 */
const seeded = { demandKg: 9000, availableKg: 5600, committedKg: 6400, coveragePct: 62.2 }

describe('CoverageBar', () => {
  test('states the coverage the view calculated', () => {
    render(<CoverageBar {...seeded} />)
    expect(screen.getByTestId('coverage-pct')).toHaveTextContent('62.2%')
  })

  test('shows the demand and the available supply as figures', () => {
    render(<CoverageBar {...seeded} />)
    expect(screen.getByTestId('coverage-demand')).toHaveTextContent('9,000.00 kg')
    expect(screen.getByTestId('coverage-available')).toHaveTextContent('5,600.00 kg')
  })

  // The committed slice is the point of the component: supply that looks
  // available in a total is not available if it is already promised.
  test('the already-committed slice is visible', () => {
    render(<CoverageBar {...seeded} />)
    expect(screen.getByTestId('coverage-committed')).toHaveTextContent('6,400.00 kg')
  })

  test('the bar is described for assistive tech, not just drawn', () => {
    render(<CoverageBar {...seeded} />)
    const bar = screen.getByRole('meter')
    expect(bar).toHaveAttribute('aria-valuenow', '62.2')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  // The seeded coffee demand has no matching supply at all. That is an honest
  // zero, and must read as one rather than as a missing bar.
  test('zero available supply reads as an explicit zero', () => {
    render(<CoverageBar demandKg={4000} availableKg={0} committedKg={0} coveragePct={0} />)
    expect(screen.getByTestId('coverage-pct')).toHaveTextContent('0.0%')
    expect(screen.getByTestId('coverage-available')).toHaveTextContent('0.00 kg')
  })

  test('supply beyond the demand caps the bar at full without misreporting it', () => {
    render(<CoverageBar demandKg={1000} availableKg={5000} committedKg={0} coveragePct={100} />)
    expect(screen.getByTestId('coverage-pct')).toHaveTextContent('100.0%')
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '100')
  })

  test('a null coverage is unknown, not zero', () => {
    render(
      <CoverageBar demandKg={9000} availableKg={null} committedKg={null} coveragePct={null} />,
    )
    expect(screen.getByTestId('coverage-pct')).toHaveTextContent('—')
    expect(screen.queryByRole('meter')).not.toBeInTheDocument()
  })

  // The client never computes coverage: v_demand_match does. The component
  // renders what it was handed, so a mismatch is a view bug, not a UI bug.
  test('renders the coverage it was given even when it disagrees with the figures', () => {
    render(<CoverageBar demandKg={9000} availableKg={5600} committedKg={0} coveragePct={41.5} />)
    expect(screen.getByTestId('coverage-pct')).toHaveTextContent('41.5%')
  })
})
