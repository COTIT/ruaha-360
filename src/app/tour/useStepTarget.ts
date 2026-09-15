import { useEffect, useRef, useState } from 'react'

/**
 * Whether the element a stop points at is actually on the page yet.
 *
 * Matching the route is not enough. The router changes `pathname` before the
 * screen it names has mounted, and several of these screens render their
 * content after a read returns — so there is always a window where the route
 * is right and the element is not there. Joyride reports a missing target the
 * moment it looks, which in that window means a tour that ends itself on a
 * slow connection: precisely the field the product is built for.
 *
 * So the run waits for the element rather than for the URL. A `MutationObserver`
 * is what makes waiting cheap — no polling, no timer running per frame — and
 * `deadlineMs` is what stops it waiting forever: a stop whose element is not
 * coming ends the tour, because a tour cannot explain what is not on screen.
 *
 * Ten seconds, matching `expect.timeout` in `playwright.config.ts` and for the
 * same reason stated there: these reads cross a remote database, sign-in alone
 * measures 750–1,615ms on a good connection, and the Tower issues five reads
 * before it has a screen. A tighter deadline does not make the app faster, it
 * just ends the tour on the connections this product is built for. Nothing is
 * left on screen while it waits — Joyride is unmounted — so waiting costs a
 * late bubble rather than a blocked page.
 *
 * No state is set synchronously inside the effect: the status is keyed by the
 * selector it was measured for, so a changed selector reads as "waiting"
 * without anything having to reset it.
 */
export function useStepTarget(
  selector: string | null,
  onMissing: () => void,
  deadlineMs = 10_000,
): boolean {
  const [seen, setSeen] = useState<{ selector: string; found: boolean } | null>(null)

  // Held in a ref so a new callback identity does not restart the deadline.
  const missing = useRef(onMissing)
  useEffect(() => {
    missing.current = onMissing
  }, [onMissing])

  useEffect(() => {
    if (!selector) return
    if (typeof MutationObserver === 'undefined') return

    const check = () => {
      if (document.querySelector(selector) === null) return
      setSeen({ selector, found: true })
      observer.disconnect()
      clearTimeout(timer)
    }

    const observer = new MutationObserver(check)
    const timer = setTimeout(() => {
      observer.disconnect()
      setSeen({ selector, found: false })
      missing.current()
    }, deadlineMs)

    observer.observe(document.body, { childList: true, subtree: true })
    // A microtask rather than a call: the element is usually already there,
    // and settling asynchronously keeps this out of the effect's own turn.
    queueMicrotask(check)

    return () => {
      observer.disconnect()
      clearTimeout(timer)
    }
  }, [selector, deadlineMs])

  // Measured for this selector, or — when it has not been measured yet — read
  // straight from the DOM. The read matters: most stops follow another stop on
  // the same screen, where the element is already there, and without it every
  // step would report "not yet" for one render and interrupt a tour that has
  // nothing to wait for.
  if (seen?.selector === selector) return seen.found
  return selector !== null && document.querySelector(selector) !== null
}
