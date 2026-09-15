import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { ACTIONS, EVENTS, Joyride, STATUS, type EventData, type Step } from 'react-joyride'
import { useTranslation } from 'react-i18next'

import type { Surface } from '@/app/membership'
import { TourContext } from '@/app/tour/tourContext'
import { TourTooltip } from '@/app/tour/TourTooltip'
import { TOURS } from '@/app/tour/tourSteps'
import { hasSeenTour, markTourSeen } from '@/app/tour/tourState'
import { useTourStall } from '@/app/tour/useTourStall'

/**
 * The guided tour, one per surface.
 *
 * Runs once on a first visit and then stays out of the way; the header keeps a
 * button so it can always be asked for again. What counts as "seen" lives in
 * `tourState.ts` — a device convenience, not a column.
 *
 * Joyride is driven in CONTROLLED mode because the tours cross routes: a stop
 * on `/officer/verify` cannot be shown until the router has been there. So the
 * run is held closed at a boundary, the route changes, and the stop resumes
 * once its screen is actually mounted. The alternative — one tour per screen —
 * would describe six screens without ever explaining the job they add up to.
 *
 * Controlled mode also means the library never ENDS a tour by itself: it
 * discards its own index patches when `stepIndex` is supplied, so both of its
 * `→ FINISHED` transitions are unreachable and `status` stays `running`. Every
 * way out is therefore this component's responsibility, and getting one wrong
 * is not cosmetic — the overlay renders for lifecycles the tooltip does not,
 * so a tour that stops advancing without stopping leaves a navy sheet over the
 * page that swallows every click.
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
  const [held, setHeld] = useState<{ who: string; running: boolean; index: number } | null>(null)

  /**
   * Whose tour this is. A held decision belongs to one person on one surface
   * and must not outlive either.
   *
   * Without this the state is sticky in a way that only shows up on a second
   * tour: finishing the ops tour leaves `running: false` behind, and signing in
   * as a farmer — or an officer opening the ops surface they also hold — then
   * gets no tour at all, silently, for the rest of the session.
   */
  const who = `${surface ?? ''}:${userId ?? ''}`
  const mine = held?.who === who ? held : null
  const firstVisit = available && Boolean(surface) && !hasSeenTour(surface!, userId)

  const active = mine ? mine.running : firstVisit
  const stepIndex = mine?.index ?? 0

  const stop = useCallback(() => {
    setHeld({ who, running: false, index: 0 })
    if (surface) markTourSeen(surface, userId)
  }, [who, surface, userId])

  /**
   * Running means: the tour is active, we are standing on the screen this stop
   * lives on, AND the element it points at is really there.
   *
   * All three, because the first two are not enough. The router changes
   * `pathname` before the screen it names has mounted, and several of these
   * screens render their content only once a read returns — and Joyride
   * reports a missing target the moment it looks. Waiting for the URL alone
   * left a window in which the library was hunting for an element that could
   * not exist yet, which on a slow connection ended the tour on its own.
   * `useStepTarget` waits for the element and, if it never comes, says so.
   */
  /**
   * Which stop we are on, readable from an event handler.
   *
   * Deliberately NOT the `index` the library reports. Joyride moves its own
   * index on before the prop it was given catches up, so an event can arrive
   * claiming a stop ahead of the one on screen — and a tour that decides "this
   * was the last one" from that number ends a step early, which is how the ops
   * tour kept dying between Demand and the Tower. The count is ours.
   */
  const at = useRef(stepIndex)
  useEffect(() => {
    at.current = stepIndex
  }, [stepIndex])

  /**
   * The backstop: a tour that is running but drawing nothing is over.
   *
   * Deliberately not "is this stop's element there". That question was asked
   * first and missed the failure that reached users — on a production build
   * the library began scrolling to stop four, never reported finishing, and
   * never drew, with the stop's own element present the whole time. Watching
   * what the user can see catches every way it can stall, including the ones
   * not yet met, and `stop()` unmounts the library with its portal and its
   * overlay together.
   */
  useTourStall(active, stop)

  /**
   * The route follows the stop, declaratively.
   *
   * Navigating from inside the event handler looked simpler and was not: the
   * library raises `step:after` from its own effect, so the call landed in the
   * middle of a commit and the router intermittently dropped it — reliably
   * enough to strand the ops tour between Demand and the Tower, which is the
   * screen the report was about. Stated as "the URL should be the stop's
   * route", it is the router's job to get there and this cannot half-happen.
   */
  const wanted = active ? tour[stepIndex]?.route : undefined
  useEffect(() => {
    if (!wanted || wanted === pathname) return
    void navigate({ to: wanted })
  }, [wanted, pathname, navigate])

  const goTo = useCallback(
    (index: number) => {
      const step = tour[index]
      // Past the end, or before the start. Returning silently here is what
      // left the library running with no stop to show: a full-screen scrim
      // and no bubble, escapable only by reloading into the same trap.
      if (!step) {
        stop()
        return
      }
      setHeld({ who, running: true, index })
    },
    [tour, who, stop],
  )

  const start = useCallback(() => {
    if (!available) return
    // The effect above takes it to the first stop's screen.
    setHeld({ who, running: true, index: 0 })
  }, [available, who])

  const onEvent = useCallback(
    ({ action, index, status, type }: EventData) => {
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        stop()
        return
      }

      /**
       * `TARGET_NOT_FOUND` is deliberately ignored.
       *
       * The library raises it the moment a lifecycle changes with the target
       * absent, which is not the same claim as "this element is not coming" —
       * every route crossing produces that instant. Acting on it is what raced
       * the farmer tour from stop one to stop five with nobody touching it,
       * and ending on it strands a tour whose screen was merely still loading.
       *
       * `useStepTarget` answers the real question: it waits for the element and
       * says so if it never arrives. One source for that decision, and it is
       * ours.
       */

      /**
       * The library announces the stop it is about to show, and that is the
       * one place the two counters can be reconciled.
       *
       * Joyride steps itself when the primary button is clicked, independently
       * of the `stepIndex` it was given. If the two ever disagree — and on a
       * production build, clicking through quickly, they did — it waits for an
       * element belonging to ITS stop while everything here still describes
       * ours: the overlay stays up, no bubble is drawn, and the watchdog is
       * watching the wrong element, so nothing recovers. Following the number
       * it announces makes that divergence self-healing rather than terminal.
       */
      if (type === EVENTS.STEP_BEFORE && typeof index === 'number' && index !== at.current) {
        goTo(index)
        return
      }

      if (type === EVENTS.STEP_AFTER) {
        // One step from where WE are, not from where the library says it is.
        // `goTo` ends the tour when that lands past the last stop, which is
        // also the only thing that ends it: `STATUS.FINISHED` never arrives in
        // controlled mode, because the library discards its own index patches
        // when `stepIndex` is supplied and both of its `→ FINISHED`
        // transitions require an index it therefore never reaches.
        goTo(at.current + (action === ACTIONS.PREV ? -1 : 1))
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
      {/*
        Mounted for exactly as long as the tour is active, which makes "the
        overlay cannot outlive the tour" a fact about the tree rather than a
        promise about state: `TourRenderer` removes its portal on unmount, and
        the portal is what holds the sheet that swallows clicks.
      */}
      {active && (
        <Joyride
          steps={steps}
          // Running for as long as the tour is active, and paused never.
          // Pausing across a screen change was tried twice and measured worse
          // both times: the library's own resume is where the ops tour kept
          // stranding itself between Demand and the Tower. Its brief wait for
          // a target — overlay up, no bubble — is a flicker; the bug being
          // fixed is that same state lasting forever, and the deadline above
          // is what bounds it.
          run={active}
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
            // The library does not scroll. It waits for its own scroll to
            // report finished before it draws, and on a production build that
            // report did not always arrive: the tour sat behind its overlay
            // with no bubble, permanently. Nothing here needs scrolling to a
            // stop badly enough to risk that — and an animated scroll is
            // against this design anyway.
            skipScroll: true,
            // A tour that crosses screens asks for a stop whose element the
            // router has not mounted yet. Waiting for it is the whole reason
            // this can navigate and advance in one move; without it the stop
            // is reported missing and stepped over the moment it is reached.
            // Matched to the deadline above, so the library and this component
            // give a missing stop the same amount of rope.
            targetWaitTimeout: 10_000,
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
