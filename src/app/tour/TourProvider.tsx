import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { ACTIONS, EVENTS, Joyride, STATUS, type EventData, type Step } from 'react-joyride'
import { useTranslation } from 'react-i18next'

import type { Surface } from '@/app/membership'
import { TourContext } from '@/app/tour/tourContext'
import { TourTooltip } from '@/app/tour/TourTooltip'
import { TOURS } from '@/app/tour/tourSteps'
import { hasSeenTour, markTourSeen } from '@/app/tour/tourState'

/**
 * The guided tour, one per surface.
 *
 * Runs once on a first visit and then stays out of the way; the header keeps a
 * button so it can always be asked for again. What counts as "seen" lives in
 * `tourState.ts` — a device convenience, not a column.
 *
 * Joyride is driven in CONTROLLED mode because the tours cross routes: a stop
 * on `/officer/verify` cannot be shown until the router has been there. So the
 * run pauses at a boundary, the route changes, and the stop resumes once its
 * screen is actually mounted. The alternative — one tour per screen — would
 * describe six screens without ever explaining the job they add up to.
 */
export function TourProvider({
  surface,
  userId,
  children,
}: {
  surface: Surface | undefined
  userId: string | null | undefined
  children: ReactNode
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const tour = useMemo(() => (surface ? TOURS[surface] : []), [surface])
  const available = tour.length > 0

  /**
   * `null` means nobody has touched the tour on this render pass, and the
   * first visit decides. Deriving it rather than starting the tour from an
   * effect keeps the "should this run" answer in one expression — and an
   * effect that sets state on mount is a cascading render for something the
   * props already know.
   */
  const [held, setHeld] = useState<{ running: boolean; index: number } | null>(null)
  const firstVisit = available && Boolean(surface) && !hasSeenTour(surface!, userId)

  const run = held ? held.running : firstVisit
  const stepIndex = held ? held.index : 0

  const goTo = useCallback(
    (index: number) => {
      const step = tour[index]
      if (!step) return
      setHeld({ running: true, index })
      // The stop's element does not exist until the router has been there.
      // `targetWaitTimeout` below is what makes this safe to do in one move —
      // Joyride waits for the target rather than declaring it missing.
      if (step.route !== pathname) void navigate({ to: step.route })
    },
    [tour, pathname, navigate],
  )

  const stop = useCallback(() => {
    setHeld({ running: false, index: 0 })
    if (surface) markTourSeen(surface, userId)
  }, [surface, userId])

  const start = useCallback(() => {
    if (!available) return
    setHeld({ running: true, index: 0 })
    if (tour[0].route !== pathname) void navigate({ to: tour[0].route })
  }, [available, tour, pathname, navigate])

  const onEvent = useCallback(
    ({ action, index, status, type }: EventData) => {
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        stop()
        return
      }
      // A target that never appeared is stepped over rather than sat on: an
      // empty bubble parked mid-screen is worse than no tour at all.
      if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
        goTo(index + (action === ACTIONS.PREV ? -1 : 1))
      }
    },
    [goTo, stop],
  )

  const steps: Step[] = useMemo(
    () =>
      tour.map((step) => ({
        // The test id is already a contract this repo keeps, so the tour
        // inherits it rather than inventing selectors of its own.
        target: `[data-testid="${step.testId}"]`,
        title: t(step.titleKey),
        content: t(step.bodyKey),
        placement: step.placement ?? 'auto',
      })),
    [tour, t],
  )

  const controls = useMemo(() => ({ start, available }), [start, available])

  return (
    <TourContext.Provider value={controls}>
      {children}
      {available && (
        <Joyride
          steps={steps}
          run={run}
          stepIndex={stepIndex}
          onEvent={onEvent}
          continuous
          tooltipComponent={TourTooltip}
          options={{
            overlayColor: 'var(--scrim)',
            arrowColor: 'var(--paper)',
            // The spotlight is an SVG cut-out in v3, so the radius is a number
            // rather than a CSS length. 12 is --radius-card.
            spotlightRadius: 12,
            // Clicking the dimmed page is not an answer to "next or skip?".
            overlayClickAction: false,
            // Clear of the fixed header, so a spotlit element is never half
            // behind it after the scroll.
            scrollOffset: 96,
            // A tour that crosses screens asks for a stop whose element the
            // router has not mounted yet. Waiting for it is the whole reason
            // this can navigate and advance in one move; without it the stop
            // is reported missing and stepped over the moment it is reached.
            targetWaitTimeout: 4000,
            // No beacon. A tour that starts by asking you to find a pulsing
            // dot has added a puzzle before its first sentence — and a pulse
            // is an animation, which this design does not have.
            skipBeacon: true,
            zIndex: 40,
          }}
        />
      )}
    </TourContext.Provider>
  )
}
