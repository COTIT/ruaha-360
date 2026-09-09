import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { EnergyEstimatePanel } from '@/components/EnergyEstimatePanel'
import '@/i18n'

const mill = { ratedPowerKw: 15, quantity: 1, hoursPerDay: 6, daysPerWeek: 5 }

describe('EnergyEstimatePanel', () => {
  test('shows the inputs it was given', () => {
    render(<EnergyEstimatePanel {...mill} />)
    expect(screen.getByTestId('estimate-rated-power')).toHaveTextContent('15.000 kW')
    expect(screen.getByTestId('estimate-quantity')).toHaveTextContent('1')
    expect(screen.getByTestId('estimate-hours')).toHaveTextContent('6')
    expect(screen.getByTestId('estimate-days')).toHaveTextContent('5')
  })

  test('shows the three outputs at the columns own precision', () => {
    render(<EnergyEstimatePanel {...mill} />)
    expect(screen.getByTestId('estimate-power')).toHaveTextContent('15.000 kW')
    expect(screen.getByTestId('estimate-kwh-day')).toHaveTextContent('90.000 kWh')
    expect(screen.getByTestId('estimate-kwh-week')).toHaveTextContent('450.000 kWh')
  })

  // "Always labelled as an estimate." A model figure must never read as a
  // measurement or a commitment.
  test('is labelled an estimate', () => {
    render(<EnergyEstimatePanel {...mill} />)
    expect(screen.getByTestId('estimate-panel')).toHaveTextContent(/estimate/i)
  })

  test('says it is not a measurement', () => {
    render(<EnergyEstimatePanel {...mill} />)
    expect(screen.getByTestId('estimate-panel')).not.toHaveTextContent(/measured consumption/i)
    expect(screen.getByTestId('estimate-basis')).toBeInTheDocument()
  })

  test('recalculates when the assumptions change', () => {
    const { rerender } = render(<EnergyEstimatePanel {...mill} />)
    expect(screen.getByTestId('estimate-kwh-day')).toHaveTextContent('90.000 kWh')

    rerender(<EnergyEstimatePanel {...mill} hoursPerDay={8} />)
    expect(screen.getByTestId('estimate-kwh-day')).toHaveTextContent('120.000 kWh')
    expect(screen.getByTestId('estimate-kwh-week')).toHaveTextContent('600.000 kWh')
    // Peak power is unchanged by hours.
    expect(screen.getByTestId('estimate-power')).toHaveTextContent('15.000 kW')
  })

  test('a blank assumption shows zero, never NaN', () => {
    render(<EnergyEstimatePanel {...mill} hoursPerDay={Number.NaN} />)
    expect(screen.getByTestId('estimate-kwh-day')).toHaveTextContent('0.000 kWh')
    expect(screen.getByTestId('estimate-kwh-day')).not.toHaveTextContent(/NaN/)
  })

  test('figures are set for tabular alignment, since they stack', () => {
    render(<EnergyEstimatePanel {...mill} />)
    expect(screen.getByTestId('estimate-power').className).toMatch(/tabular/)
  })
})
