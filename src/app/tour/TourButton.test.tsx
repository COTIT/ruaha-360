import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

const start = vi.fn()
let available = true

vi.mock('@/app/tour/tourContext', () => ({ useTour: () => ({ start, available }) }))

const { TourButton } = await import('@/app/tour/TourButton')
await import('@/i18n')

/**
 * The tour runs once by itself, so the only way back to it is this. It sits in
 * the header rather than on any one screen: the tours cross screens, and a
 * control that appears on only one of them is a control nobody finds twice.
 */
describe('asking for the tour again', () => {
  test('is a labelled control, not an icon on its own', async () => {
    render(<TourButton />)
    const button = screen.getByTestId('tour-restart')

    expect(button).toHaveAccessibleName('Take the tour again')
    await userEvent.click(button)
    expect(start).toHaveBeenCalled()
  })

  test('keeps the 44px target the rest of the header uses', () => {
    render(<TourButton />)
    const style = screen.getByTestId('tour-restart').getAttribute('style') ?? ''

    expect(style).toMatch(/min-height:\s*44px/)
    expect(style, 'a Kiswahili label runs longer and has to be free to wrap').not.toMatch(
      /(^|;)\s*height:/,
    )
  })

  // On a surface with no tour there is nothing to restart, and a control that
  // does nothing is worse than no control.
  test('is absent where there is no tour', () => {
    available = false
    render(<TourButton />)
    expect(screen.queryByTestId('tour-restart')).not.toBeInTheDocument()
    available = true
  })
})
