import type { CSSProperties } from 'react'

/**
 * The shared control surface.
 *
 * Two densities, and the difference is a product decision rather than a taste:
 * ops is read at a desk with a mouse, field surfaces are read outdoors with a
 * thumb. Both use `min-height` and never `height`, because a Kiswahili label
 * runs 10–30% longer than the English these were laid out in and has to be
 * allowed to wrap rather than be clipped.
 */

/** 40px. Ops. */
export const CONTROL: CSSProperties = {
  minHeight: 40,
  fontSize: 14,
  fontFamily: 'inherit',
  border: '1.5px solid var(--rule-2)',
  borderRadius: 'var(--radius-control)',
  background: 'var(--paper)',
  color: 'var(--ink)',
  padding: '8px 12px',
  boxSizing: 'border-box',
}

/** 48px. Officer and farmer. */
export const CONTROL_FIELD: CSSProperties = {
  ...CONTROL,
  minHeight: 48,
  fontSize: 16,
  padding: '12px 14px',
}

/** A primary action. Full width on a field surface, by the caller's class. */
export const BUTTON_PRIMARY: CSSProperties = {
  minHeight: 44,
  border: 0,
  borderRadius: 'var(--radius-control)',
  background: 'var(--primary)',
  color: '#fff',
  fontSize: 15,
  fontWeight: 600,
  fontFamily: 'inherit',
  padding: '10px 18px',
  textWrap: 'balance',
}

export const BUTTON_SECONDARY: CSSProperties = {
  minHeight: 44,
  border: '1.5px solid var(--rule-2)',
  borderRadius: 'var(--radius-control)',
  background: 'var(--paper)',
  color: 'var(--ink)',
  fontSize: 15,
  fontWeight: 500,
  fontFamily: 'inherit',
  padding: '10px 18px',
  textWrap: 'balance',
}

