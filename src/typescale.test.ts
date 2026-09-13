import { describe, expect, test } from 'vitest'

import { offendingLines, read, sourceFiles } from './styles/design'

/**
 * Eight type steps, and 12px is the floor. Nothing smaller ships: the farmer
 * surface assumes the lowest literacy and the worst hardware in the programme,
 * and a 10px note on a cracked 5-inch screen in daylight is not information.
 *
 * Tailwind's own `text-xs` is exactly 12px, so what this catches is the
 * arbitrary value somebody reaches for when a row is one line too tall.
 */

const BELOW_FLOOR =
  /(^|[^\w-])text-\[\s*(?:([0-9]|1[01])(?:\.[0-9]+)?px|0?\.[0-6][0-9]*rem)\s*\]/

const RAW_FONT_SIZE = /font-size:\s*(?:([0-9]|1[01])(?:\.[0-9]+)?px|0?\.[0-6][0-9]*rem)/

describe('nothing renders below 12px', () => {
  const files = sourceFiles('src')

  test('there are files to check', () => {
    expect(files.length).toBeGreaterThan(50)
  })

  test.each(files)('%s', (file) => {
    const source = read(file)
    const offenders = [
      ...offendingLines(source, BELOW_FLOOR),
      ...offendingLines(source, RAW_FONT_SIZE),
    ]

    expect(offenders, '12px is the floor — see the type scale in globals.css').toEqual([])
  })
})

describe('the floor holds for the sizes the guard knows', () => {
  test('11px and 10px are caught', () => {
    expect(BELOW_FLOOR.test('className="text-[11px]"')).toBe(true)
    expect(BELOW_FLOOR.test('className="text-[10px]"')).toBe(true)
    expect(RAW_FONT_SIZE.test('font-size: 11px')).toBe(true)
  })

  test('12px and above are not', () => {
    expect(BELOW_FLOOR.test('className="text-[12px]"')).toBe(false)
    expect(BELOW_FLOOR.test('className="text-[15px]"')).toBe(false)
    expect(RAW_FONT_SIZE.test('font-size: 12px')).toBe(false)
    expect(RAW_FONT_SIZE.test('font-size: 30px')).toBe(false)
  })
})
