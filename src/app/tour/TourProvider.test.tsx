import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const navigate = vi.fn()
let joyride: Record<string, unknown> = {}

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  useLocation: () => ({ pathname: '/officer' }),
}))

vi.mock('react-joyride', () => ({
  // v3 exports no default — a named `Joyride`. The mock has to agree, or it
  // passes against a component the app cannot import.
  Joyride: (props: Record<string, unknown>) => {
    joyride = props
    return <div data-testid="joyride" data-run={String(props.run)} />
  },
  ACTIONS: { NEXT: 'next', PREV: 'prev' },
  EVENTS: { STEP_AFTER: 'step:after', TARGET_NOT_FOUND: 'error:target_not_found' },
  STATUS: { FINISHED: 'finished', SKIPPED: 'skipped' },
}))

const { TourProvider } = await import('@/app/tour/TourProvider')
const { useTour } = await import('@/app/tour/tourContext')
const { TOURS } = await import('@/app/tour/tourSteps')
const { hasSeenTour, markTourSeen } = await import('@/app/tour/tourState')
await import('@/i18n')

const OFFICER = '80000000-0000-4000-8000-000000000003'

function Harness() {
  const tour = useTour()
  return (
    <button type="button" data-testid="start" onClick={tour.start}>
      {String(tour.available)}
    </button>
  )
}

function renderTour(props: { surface?: 'officer' | 'ops' | 'farmer' | undefined; userId?: string | null } = {}) {
  const surface = 'surface' in props ? props.surface : ('officer' as const)
  const userId = 'userId' in props ? props.userId : OFFICER
  return render(
    <TourProvider surface={surface} userId={userId}>
      <Harness />
    </TourProvider>,
  )
}

/**
 * The tour runs itself once and then gets out of the way.
 *
 * Joyride is stubbed here rather than rendered: what is worth testing is the
 * decision — whether to run, which stop, when to remember — and none of that
 * needs a real spotlight. The spotlight itself is e2e's job.
 */
describe('a tour on a first visit', () => {
  beforeEach(() => {
    localStorage.clear()
    navigate.mockClear()
    joyride = {}
  })
  afterEach(() => localStorage.clear())

  test('runs for somebody who has not seen it', () => {
    renderTour()
    expect(screen.getByTestId('joyride')).toHaveAttribute('data-run', 'true')
  })

  test('does not run for somebody who has', () => {
    markTourSeen('officer', OFFICER)
    renderTour()
    expect(screen.getByTestId('joyride')).toHaveAttribute('data-run', 'false')
  })

  test('does not run before anyone is signed in', () => {
    renderTour({ userId: null })
    expect(screen.getByTestId('joyride')).toHaveAttribute('data-run', 'false')
  })

  // A person opening a record on a surface they do not work in gets no tour —
  // there is nothing sensible to say about a surface they are passing through.
  test('is unavailable off a surface entirely', () => {
    renderTour({ surface: undefined })
    expect(screen.getByTestId('start')).toHaveTextContent('false')
  })
})

describe('the tour can always be asked for again', () => {
  beforeEach(() => {
    localStorage.clear()
    navigate.mockClear()
  })

  test('even once it has been seen', async () => {
    markTourSeen('officer', OFFICER)
    renderTour()
    expect(screen.getByTestId('joyride')).toHaveAttribute('data-run', 'false')

    await userEvent.click(screen.getByTestId('start'))
    expect(screen.getByTestId('joyride')).toHaveAttribute('data-run', 'true')
  })

  // Already on the first stop's screen, so there is nowhere to travel to and
  // the tour must not bounce the user through a navigation to stand still.
  test('and starting it returns to the first stop', async () => {
    renderTour()
    await userEvent.click(screen.getByTestId('start'))

    expect(joyride.stepIndex).toBe(0)
    expect(TOURS.officer[0].route).toBe('/officer')
    expect(navigate).not.toHaveBeenCalled()
  })
})

describe('what the tour hands to the library', () => {
  beforeEach(() => localStorage.clear())

  test('one step per stop, targeted by test id and already translated', () => {
    renderTour()
    const steps = joyride.steps as Array<{ target: string; title: unknown; content: unknown }>

    expect(steps).toHaveLength(TOURS.officer.length)
    expect(steps.map((s) => s.target)).toEqual(
      TOURS.officer.map((step) => `[data-testid="${step.testId}"]`),
    )
    expect(steps[0].title).toBe('Welcome to Ruaha 360')
    expect(String(steps[0].content)).not.toMatch(/^tour\./)
  })

  /**
   * The tour dims the page — the only thing in this design that does — and it
   * dims it with a token, in brand navy, so the dimmed page still reads as
   * this product. And no beacon: a pulsing dot is an animation, and this
   * design has none.
   */
  test('dims with a token and opens without a beacon', () => {
    renderTour()
    const options = joyride.options as Record<string, unknown>

    expect(options.overlayColor).toBe('var(--scrim)')
    expect(options.skipBeacon).toBe(true)
    expect(JSON.stringify(joyride.options)).not.toMatch(/shadow/i)
  })
})

describe('finishing', () => {
  beforeEach(() => localStorage.clear())

  test.each([
    ['finished', 'finished'],
    ['skipped', 'skipped'],
  ])('a %s tour is not offered again', (_name, status) => {
    renderTour()
    const callback = joyride.onEvent as (data: unknown) => void
    act(() => callback({ status, action: 'next', index: 2, type: 'tour:status' }))

    expect(hasSeenTour('officer', OFFICER)).toBe(true)
  })

  test('a stop on another screen is travelled to before it is shown', () => {
    renderTour()
    const callback = joyride.onEvent as (data: unknown) => void
    // Stop 2 is the last one on /officer; stop 3 lives on /officer/register.
    act(() => callback({ status: 'running', action: 'next', index: 1, type: 'step:after' }))

    expect(navigate).toHaveBeenCalledWith({ to: '/officer/register' })
  })

  // A target that is not on the page yet would otherwise park an empty bubble
  // in the middle of the screen for as long as the user tolerates it.
  test('a stop whose target never appears is stepped over, not sat on', () => {
    renderTour()
    const callback = joyride.onEvent as (data: unknown) => void
    act(() => callback({ status: 'running', action: 'next', index: 0, type: 'error:target_not_found' }))

    expect(joyride.stepIndex).toBe(1)
  })
})
