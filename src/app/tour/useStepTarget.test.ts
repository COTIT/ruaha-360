import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { useStepTarget } from '@/app/tour/useStepTarget'

/**
 * The window this closes is the one that broke the tour in the field.
 *
 * Matching the route is not the same as the element being there: the router
 * changes `pathname` before the screen mounts, and the Tower and the request
 * pipeline render their content only after a read returns. Joyride reports a
 * missing target the moment it looks, so on a slow connection the tour used to
 * end — or worse, skip — in exactly the conditions this product ships into.
 */
const settle = () => act(async () => { await Promise.resolve() })

describe('waiting for a stop to exist', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => vi.useRealTimers())

  test('an element already on the page is found at once', async () => {
    document.body.innerHTML = '<div data-testid="tower"></div>'
    const { result } = renderHook(() => useStepTarget('[data-testid="tower"]', () => {}))

    await settle()
    expect(result.current).toBe(true)
  })

  test('one that arrives later is found when it arrives', async () => {
    const onMissing = vi.fn()
    const { result } = renderHook(() => useStepTarget('[data-testid="tower"]', onMissing))

    await settle()
    expect(result.current).toBe(false)

    await act(async () => {
      document.body.innerHTML = '<div data-testid="tower"></div>'
      await Promise.resolve()
    })

    expect(result.current).toBe(true)
    expect(onMissing).not.toHaveBeenCalled()
  })

  // The deadline, and the decision behind it: a stop whose element is not
  // coming ends the tour rather than parking a spotlight on nothing.
  test('one that never arrives reports missing, once, at the deadline', async () => {
    const onMissing = vi.fn()
    renderHook(() => useStepTarget('[data-testid="never"]', onMissing, 4000))

    await settle()
    expect(onMissing).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(4000)
      await Promise.resolve()
    })

    expect(onMissing).toHaveBeenCalledTimes(1)
  })

  test('and the deadline does not fire once the element is found', async () => {
    const onMissing = vi.fn()
    document.body.innerHTML = '<div data-testid="tower"></div>'
    renderHook(() => useStepTarget('[data-testid="tower"]', onMissing, 4000))

    await settle()
    await act(async () => {
      vi.advanceTimersByTime(10_000)
      await Promise.resolve()
    })

    expect(onMissing).not.toHaveBeenCalled()
  })

  // A new stop is a new question, and the previous answer must not be reused.
  test('a changed selector reads as not-yet-found', async () => {
    document.body.innerHTML = '<div data-testid="one"></div>'
    const { result, rerender } = renderHook(
      ({ selector }: { selector: string }) => useStepTarget(selector, () => {}),
      { initialProps: { selector: '[data-testid="one"]' } },
    )

    await settle()
    expect(result.current).toBe(true)

    rerender({ selector: '[data-testid="two"]' })
    expect(result.current).toBe(false)
  })

  test('nothing to wait for is not something to wait for', async () => {
    const onMissing = vi.fn()
    const { result } = renderHook(() => useStepTarget(null, onMissing))

    await settle()
    await act(async () => {
      vi.advanceTimersByTime(10_000)
      await Promise.resolve()
    })

    expect(result.current).toBe(false)
    expect(onMissing).not.toHaveBeenCalled()
  })

  test('a new callback does not restart the deadline', async () => {
    const onMissing = vi.fn()
    const { rerender } = renderHook(
      ({ cb }: { cb: () => void }) => useStepTarget('[data-testid="never"]', cb, 4000),
      { initialProps: { cb: onMissing } },
    )

    await act(async () => {
      vi.advanceTimersByTime(3000)
      await Promise.resolve()
    })
    rerender({ cb: onMissing })
    await act(async () => {
      vi.advanceTimersByTime(1000)
      await Promise.resolve()
    })

    expect(onMissing).toHaveBeenCalledTimes(1)
  })
})
