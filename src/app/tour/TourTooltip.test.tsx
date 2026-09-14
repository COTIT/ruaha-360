import type { TooltipRenderProps } from 'react-joyride'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { TourTooltip } from '@/app/tour/TourTooltip'

await import('@/i18n')

/**
 * Joyride ships a tooltip of its own, and it belongs to a different product:
 * its own type scale, its own blue, a drop shadow, and a close "×" in the
 * corner. Dropping that on top of this design would be the one surface in the
 * app that came from somewhere else — so the library draws the spotlight and
 * positions the bubble, and we draw everything inside it.
 *
 * Which makes the tooltip ours, and it has to obey the same rules as the rest:
 * named tokens rather than opacities, the shared control surface, nothing below
 * 12px, and no shadow (`depth.test.ts` and `typescale.test.ts` hold the last
 * two for every file, this one included).
 */
function props(overrides: Record<string, unknown> = {}): TooltipRenderProps {
  return {
    continuous: true,
    index: 0,
    size: 6,
    isLastStep: false,
    step: { title: 'Welcome', content: 'A short explanation.' },
    backProps: { 'aria-label': 'back', onClick: vi.fn() },
    primaryProps: { 'aria-label': 'next', onClick: vi.fn() },
    skipProps: { 'aria-label': 'skip', onClick: vi.fn() },
    tooltipProps: {},
    ...overrides,
  } as unknown as TooltipRenderProps
}

describe('the tour bubble is ours', () => {
  test('says what this stop is and where you are in the tour', () => {
    render(<TourTooltip {...props()} />)

    expect(screen.getByTestId('tour-tooltip')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Welcome' })).toBeInTheDocument()
    expect(screen.getByText('A short explanation.')).toBeInTheDocument()
    expect(screen.getByTestId('tour-progress')).toHaveTextContent('Step 1 of 6')
    // A card title, not a section label — `.type-section` is 12px uppercase,
    // and under the uppercase counter it reads as a second label.
    expect(screen.getByRole('heading', { name: 'Welcome' })).toHaveClass('type-title')
  })

  test('uses the shared control surface, not the library’s buttons', () => {
    render(<TourTooltip {...props({ index: 1 })} />)

    for (const testId of ['tour-next', 'tour-back']) {
      const style = screen.getByTestId(testId).getAttribute('style') ?? ''
      expect(style, testId).toMatch(/min-height:\s*44px/)
      expect(style, `${testId} should not fix its height`).not.toMatch(/(^|;)\s*height:/)
    }
  })

  test('every colour is a named token', () => {
    render(<TourTooltip {...props()} />)
    const style = screen.getByTestId('tour-tooltip').getAttribute('style') ?? ''

    expect(style).toMatch(/var\(--paper\)/)
    expect(style).toMatch(/var\(--rule\)/)
    expect(style, 'no shadow anywhere in this design').not.toMatch(/shadow/i)
  })

  // Back is meaningless on the first stop, and a disabled control that never
  // becomes enabled is just furniture.
  test('offers no Back on the first stop', () => {
    render(<TourTooltip {...props({ index: 0 })} />)
    expect(screen.queryByTestId('tour-back')).not.toBeInTheDocument()
  })

  test('offers Back once there is something to go back to', () => {
    render(<TourTooltip {...props({ index: 3 })} />)
    expect(screen.getByTestId('tour-back')).toBeInTheDocument()
  })

  /**
   * The last stop's primary button says Done, not Next. "Next" on the final
   * step is a small lie about what is coming.
   */
  test('the last stop finishes rather than promising more', () => {
    render(<TourTooltip {...props({ index: 5, isLastStep: true })} />)

    expect(screen.getByTestId('tour-next')).toHaveTextContent('Done')
    expect(screen.queryByTestId('tour-skip'), 'nothing left to skip').not.toBeInTheDocument()
  })

  test('and any stop before it can be left', async () => {
    const skip = vi.fn()
    render(<TourTooltip {...props({ skipProps: { onClick: skip } })} />)

    await userEvent.click(screen.getByTestId('tour-skip'))
    expect(skip).toHaveBeenCalled()
  })
})
