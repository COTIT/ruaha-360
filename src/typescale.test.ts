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

/** The same thing written as a React style object. */
const STYLE_OBJECT_FONT_SIZE = /fontSize:\s*(?:'|")?(?:[0-9]|1[01])(?:\.[0-9]+)?(?:px)?(?:'|")?\s*[,}]/

/**
 * Two exemptions, both deliberate, both recorded here rather than left to
 * whoever reads the diff.
 *
 * `ProvenanceBadge` — the `disputed` mark is a filled disc carrying a bang, and
 * the bang is a glyph inside a 13px disc. It is iconography sized to the mark,
 * not a string anybody reads.
 *
 * `DataTable` — the handoff contradicts itself. Its prose says "nothing below
 * 12px ships"; its design file sets every column label at 11px/600 uppercase
 * with 0.08em tracking, and the implementation prompt says that where the two
 * disagree, the design file wins. So the column labels are 11px. They are
 * labels for a column, repeated at the top of a table the reader has already
 * oriented themselves in — not content. Everything a user actually reads for
 * meaning is 12px or larger. This one is worth putting back to the designer.
 */
const NOT_TEXT = new Set(['src/components/ProvenanceBadge.tsx', 'src/components/DataTable.tsx'])

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
      ...(NOT_TEXT.has(file) ? [] : offendingLines(source, STYLE_OBJECT_FONT_SIZE)),
    ]

    expect(offenders, '12px is the floor — see the type scale in globals.css').toEqual([])
  })
})

describe('the floor holds for the sizes the guard knows', () => {
  test('11px and 10px are caught', () => {
    expect(BELOW_FLOOR.test('className="text-[11px]"')).toBe(true)
    expect(BELOW_FLOOR.test('className="text-[10px]"')).toBe(true)
    expect(RAW_FONT_SIZE.test('font-size: 11px')).toBe(true)
    expect(STYLE_OBJECT_FONT_SIZE.test('{ fontSize: 9, fontWeight: 700 }')).toBe(true)
    expect(STYLE_OBJECT_FONT_SIZE.test("{ fontSize: '10px' }")).toBe(true)
  })

  test('12px and above are not', () => {
    expect(BELOW_FLOOR.test('className="text-[12px]"')).toBe(false)
    expect(BELOW_FLOOR.test('className="text-[15px]"')).toBe(false)
    expect(RAW_FONT_SIZE.test('font-size: 12px')).toBe(false)
    expect(RAW_FONT_SIZE.test('font-size: 30px')).toBe(false)
    expect(STYLE_OBJECT_FONT_SIZE.test('{ fontSize: 12 }')).toBe(false)
    expect(STYLE_OBJECT_FONT_SIZE.test("{ fontSize: '15px' }")).toBe(false)
  })
})
