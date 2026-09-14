import { createContext, useContext } from 'react'

export interface TourControls {
  /** Start the tour from the first stop, seen before or not. */
  start: () => void
  /** Whether there is a tour to offer here at all. */
  available: boolean
}

/**
 * Its own file so `TourProvider.tsx` exports only a component: a module that
 * exports both components and values loses fast refresh, the same reason
 * `controlStyles.ts` sits beside `controls.tsx`.
 */
export const TourContext = createContext<TourControls>({ start: () => {}, available: false })

export function useTour(): TourControls {
  return useContext(TourContext)
}
