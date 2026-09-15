import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'

// The router's navigate returns a promise; the tour ends the tour if it
// rejects, so the stub has to be one.
const navigate = vi.fn(() => Promise.resolve())
let pathname = '/officer'
let joyride: Record<string, unknown> = {}

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  useLocation: () => ({ pathname }),
}))

vi.mock('react-joyride', () => ({
  // v3 exports no default — a named `Joyride`. The mock has to agree, or it
  // passes against a component the app cannot import.
  Joyride: (props: Record<string, unknown>) => {
    joyride = props
    // The real one renders our tooltip, and the tour watches for that bubble
    // to decide whether it is drawing anything at all.
    return (
      <div data-testid="joyride">{props.run ? <div data-testid="tour-tooltip" /> : null}</div>
    )
  },
  ACTIONS: { NEXT: 'next', PREV: 'prev' },
  EVENTS: {
    STEP_BEFORE: 'step:before',
    STEP_AFTER: 'step:after',
    TARGET_NOT_FOUND: 'error:target_not_found',
  },
  STATUS: { FINISHED: 'finished', SKIPPED: 'skipped' },
}))

const { TourProvider } = await import('@/app/tour/TourProvider')
const { useTour } = await import('@/app/tour/tourContext')
const { TOURS } = await import('@/app/tour/tourSteps')
const { hasSeenTour, markTourSeen } = await import('@/app/tour/tourState')
await import('@/i18n')

const OFFICER = '80000000-0000-4000-8000-000000000003'

beforeEach(() => {
  localStorage.clear()
  navigate.mockClear()
  pathname = '/officer'
  // Joyride is unmounted while the tour is not running, so a stale `joyride`
  // here would be the PREVIOUS test's props — and `emit` would talk to a
  // provider that is no longer on the page.
  joyride = {}
})

/**
 * Stands in for the app underneath the tour.
 *
 * It renders every stop's target, because the tour will not run until the
 * element it points at is actually on the page — which is the fix for a slow
 * screen ending the tour, and which a bare harness would otherwise defeat.
 */
function Harness({ surface = 'officer' as const }: { surface?: 'officer' | 'ops' | 'farmer' }) {
  const tour = useTour()
  return (
    <>
      <button type="button" data-testid="start" onClick={tour.start}>
        {String(tour.available)}
      </button>
      {TOURS[surface].map((step) => (
        <div key={step.testId} data-testid={step.testId} />
      ))}
    </>
  )
}

function renderTour(
  props: { surface?: 'officer' | 'ops' | 'farmer' | undefined; userId?: string | null } = {},
) {
  const surface = 'surface' in props ? props.surface : ('officer' as const)
  const userId = 'userId' in props ? props.userId : OFFICER
  return render(
    <TourProvider surface={surface} userId={userId}>
      <Harness surface={surface ?? 'officer'} />
    </TourProvider>,
  )
}

/** Fire one Joyride event, the way the library would. */
function emit(data: Record<string, unknown>) {
  act(() => (joyride.onEvent as (d: unknown) => void)({ status: 'running', ...data }))
}

/**
 * Two different claims, deliberately.
 *
 * `mounted` is whether the tour exists at all — only ending it unmounts the
 * library, and unmounting is what removes its portal and therefore the overlay
 * that swallows clicks. `running` is whether it is drawing right now, which
 * also goes false while a screen is being crossed. It settles a microtask
 * after the render, because it waits for the stop's element.
 */
const mounted = () => screen.queryByTestId('joyride') !== null
const running = () => mounted() && joyride.run === true
const settle = () =>
  act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })

/** The router has landed on `next`, and the tree has re-rendered because of it. */
function arriveAt(next: string, view: ReturnType<typeof renderTour>) {
  pathname = next
  view.rerender(
    <TourProvider surface="officer" userId={OFFICER}>
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
    pathname = '/officer'
    joyride = {}
  })

  test('runs for somebody who has not seen it', async () => {
    renderTour()
    await settle()
    expect(running()).toBe(true)
  })

  test('does not run for somebody who has', () => {
    markTourSeen('officer', OFFICER)
    renderTour()
    expect(running()).toBe(false)
  })

  test('does not run before anyone is signed in', () => {
    renderTour({ userId: null })
    expect(running()).toBe(false)
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
    pathname = '/officer'
  })

  test('even once it has been seen', async () => {
    markTourSeen('officer', OFFICER)
    renderTour()
    expect(running()).toBe(false)

    await userEvent.click(screen.getByTestId('start'))
    await settle()
    expect(running()).toBe(true)
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
  beforeEach(() => {
    localStorage.clear()
    pathname = '/officer'
  })

  test('one step per stop, targeted by test id and already translated', async () => {
    renderTour()
    await settle()
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
  test('dims with a token and opens without a beacon', async () => {
    renderTour()
    await settle()
    const options = joyride.options as Record<string, unknown>

    expect(options.overlayColor).toBe('var(--scrim)')
    expect(options.skipBeacon).toBe(true)
    expect(JSON.stringify(joyride.options)).not.toMatch(/shadow/i)
  })
})

/**
 * Every way a tour can END, because getting this wrong is not a cosmetic bug.
 *
 * Joyride's overlay is a full-screen `<path fill="var(--scrim)">` with
 * `pointer-events: auto`, and it renders for the `ready` and `complete`
 * lifecycles while the TOOLTIP renders only for `tooltip`. So a tour that
 * stops advancing without stopping leaves a navy sheet over the whole page
 * that swallows every click, with no bubble left to explain it — reported from
 * the demo as "the screen stays blue and I cannot click anything", on desktop
 * and mobile, escapable only by reloading into the same trap.
 *
 * The trap is specific to CONTROLLED mode: the library discards its own index
 * patches when `stepIndex` is supplied, so both of its `→ FINISHED`
 * transitions (each needing `index >= size`) are unreachable and `STATUS`
 * never leaves `running` on its own. Ending is entirely this component's job.
 */
describe('ending the tour', () => {
  beforeEach(() => {
    localStorage.clear()
    navigate.mockClear()
    pathname = '/officer'
  })

  test.each([
    ['finished', 'finished'],
    ['skipped', 'skipped'],
  ])('a %s tour is not offered again', async (_name, status) => {
    renderTour()
    await settle()
    emit({ status, action: 'next', index: 2, type: 'tour:status' })

    expect(running()).toBe(false)
    expect(hasSeenTour('officer', OFFICER)).toBe(true)
  })

  /**
   * The last stop's Next. `STATUS.FINISHED` never arrives in controlled mode,
   * so the end has to be counted rather than announced.
   */
  test('the last stop ends it, and remembers', async () => {
    renderTour()
    await settle()
    for (let i = 0; i < TOURS.officer.length; i += 1) {
      emit({ action: 'next', index: i, type: 'step:after' })
      await settle()
    }

    expect(mounted()).toBe(false)
    expect(hasSeenTour('officer', OFFICER)).toBe(true)
  })

  /**
   * And it is counted from OUR position, not from the number the library
   * reports: Joyride moves its own index on before the prop it was given
   * catches up, so an event can claim a stop ahead of the one on screen. Ending
   * on that number ends the tour a step early — which is exactly what killed
   * the ops tour between Demand and the Tower.
   */
  test('an index from the library ahead of ours does not end it early', async () => {
    renderTour()
    await settle()
    emit({ action: 'next', index: TOURS.officer.length + 2, type: 'step:after' })
    await settle()

    expect(mounted()).toBe(true)
    expect(joyride.stepIndex).toBe(1)
  })

  /**
   * The library's own "target not found" is ignored, and that is the fix
   * rather than an oversight.
   *
   * It is raised the instant a lifecycle changes with the target absent, which
   * every route crossing produces — it is not the claim "this element is not
   * coming". Advancing on it raced the farmer tour from stop 1 to stop 5 with
   * nobody touching it; ending on it strands a tour whose screen is merely
   * still loading. `useStepTarget` owns that decision, with a deadline, and
   * `useStepTarget.test.ts` holds it.
   */
  test('the library saying "target not found" is not taken as the end', async () => {
    renderTour()
    await settle()
    emit({ action: 'next', type: 'error:target_not_found' })

    expect(running()).toBe(true)
    expect(hasSeenTour('officer', OFFICER)).toBe(false)
  })
})

/**
 * Crossing a screen is the other half of the same problem.
 *
 * The stop's element does not exist until the router has been there, and
 * Joyride reports a missing target immediately rather than after
 * `targetWaitTimeout`. So the run is held closed until the route matches —
 * derived from the pathname rather than restored by an effect, so there is no
 * window in which the library is looking for something that cannot be there.
 */
describe('crossing to another screen', () => {
  beforeEach(() => {
    localStorage.clear()
    navigate.mockClear()
    pathname = '/officer'
  })

  test('travels to the stop that lives elsewhere', async () => {
    renderTour()
    await settle()

    // Stop 2 is the last one on /officer, so nothing moves yet.
    emit({ action: 'next', type: 'step:after' })
    await settle()
    expect(navigate).not.toHaveBeenCalled()

    // Stop 3 is not.
    emit({ action: 'next', type: 'step:after' })
    expect(navigate).toHaveBeenCalledWith({ to: '/officer/register' })
  })

  /**
   * A crossing moves the tour on; it does not end it. Ending is the only thing
   * that unmounts the library, so staying mounted is what distinguishes "on
   * the way" from "over".
   */
  test('and moves on without ending, while the router is still moving', async () => {
    renderTour()
    await settle()
    emit({ action: 'next', type: 'step:after' })
    await settle()
    emit({ action: 'next', type: 'step:after' })
    await settle()

    expect(mounted()).toBe(true)
    expect(joyride.stepIndex).toBe(2)
  })

  test('then runs again once that screen is the screen we are on', async () => {
    const view = renderTour()
    await settle()
    emit({ action: 'next', type: 'step:after' })
    await settle()
    emit({ action: 'next', type: 'step:after' })

    arriveAt('/officer/register', view)
    await settle()

    expect(running()).toBe(true)
    expect(joyride.stepIndex).toBe(2)
  })

  test('back goes back, to the screen it came from', async () => {
    const view = renderTour()
    await settle()
    emit({ action: 'next', type: 'step:after' })
    await settle()
    emit({ action: 'next', type: 'step:after' })
    arriveAt('/officer/register', view)
    await settle()

    emit({ action: 'prev', type: 'step:after' })

    expect(navigate).toHaveBeenLastCalledWith({ to: '/officer' })
  })
})

/**
 * The library steps itself when its primary button is clicked, independently of
 * the `stepIndex` it was handed. When the two disagree it waits for an element
 * belonging to ITS stop while everything here still describes ours — overlay
 * up, no bubble, and the watchdog armed on the wrong element, so nothing
 * recovers. Seen on the production build, clicking through quickly: our state
 * said stop 2 and its said stop 3.
 */
describe('when the library steps itself', () => {
  beforeEach(() => localStorage.clear())

  test('the announced stop is followed rather than argued with', async () => {
    renderTour()
    await settle()
    expect(joyride.stepIndex).toBe(0)

    emit({ action: 'next', index: 3, type: 'step:before' })
    await settle()

    expect(joyride.stepIndex).toBe(3)
    expect(mounted()).toBe(true)
  })

  test('and an announcement it already agrees with changes nothing', async () => {
    renderTour()
    await settle()

    emit({ action: 'update', index: 0, type: 'step:before' })
    await settle()

    expect(joyride.stepIndex).toBe(0)
    expect(navigate).not.toHaveBeenCalled()
  })

  // Past the end is still the end, whoever announced it.
  test('an announced stop past the last one ends the tour', async () => {
    renderTour()
    await settle()

    emit({ action: 'next', index: TOURS.officer.length, type: 'step:before' })
    await settle()

    expect(mounted()).toBe(false)
    expect(hasSeenTour('officer', OFFICER)).toBe(true)
  })
})

/**
 * A finished tour belongs to the person who finished it.
 *
 * The state that says "this tour is over" used to outlive both the user and the
 * surface, so the SECOND tour of a session never opened: finish the ops tour,
 * sign in as a farmer, and there was silently no tour at all — the same for an
 * officer who also holds ops and moves between the two.
 */
describe('a second tour in the same session', () => {
  beforeEach(() => localStorage.clear())

  test('opens for the next person to sign in', async () => {
    const view = renderTour()
    await settle()
    emit({ status: 'skipped', action: 'skip', index: 0, type: 'tour:status' })
    await settle()
    expect(mounted()).toBe(false)

    view.rerender(
      <TourProvider surface="officer" userId="80000000-0000-4000-8000-000000000004">
        <Harness />
      </TourProvider>,
    )
    await settle()

    expect(mounted()).toBe(true)
    expect(joyride.stepIndex).toBe(0)
  })

  test('and for the next surface the same person opens', async () => {
    const view = renderTour()
    await settle()
    emit({ status: 'skipped', action: 'skip', index: 0, type: 'tour:status' })
    await settle()

    pathname = '/ops'
    view.rerender(
      <TourProvider surface="ops" userId={OFFICER}>
        <Harness surface="ops" />
      </TourProvider>,
    )
    await settle()

    expect(mounted()).toBe(true)
    expect((joyride.steps as unknown[]).length).toBe(TOURS.ops.length)
  })
})
