import { describe, expect, test } from 'vitest'

import { code, offendingLines, sourceFiles } from './styles/design'

/**
 * `text-deep/60` on the sand ground measures 4.17:1 and was used for every
 * secondary string in the product. It is the redesign's headline accessibility
 * fix, and the fix is not "raise that one opacity" — it is that colour stops
 * being expressed as an opacity at all. Secondary text is `--ink-2` (6.6:1),
 * notes are `--ink-3` (4.8:1), and a tint is a named token rather than a
 * number somebody chose in the moment.
 *
 * PENDING is a ratchet, not an allowlist. Every screen commit deletes entries;
 * the test fails if a converted file regresses, and the list must reach [] by
 * the end of the redesign.
 */

const OPACITY = /(^|[^\w-])(text|bg|border|fill|stroke|ring|divide|outline)-(deep|white|primary|accent|destructive|black|foreground|muted)\/[0-9]+/

const PENDING = new Set([
  'src/app/LoginScreen.tsx',
  'src/app/NoAccessScreen.tsx',
  'src/app/Placeholder.tsx',
  'src/app/SelectRoleScreen.tsx',
  'src/features/officer/OfficerHomeScreen.tsx',
  'src/features/officer/OfficerRecordScreens.tsx',
  'src/features/officer/PersonDetailScreen.tsx',
  'src/features/ops/BuyersScreen.tsx',
  'src/features/ops/CatalogueScreen.tsx',
  'src/features/ops/DemandDetailScreen.tsx',
  'src/features/ops/DemandListScreen.tsx',
  'src/features/ops/OpportunityDetailScreen.tsx',
  'src/features/ops/OpsHomeScreen.tsx',
  'src/features/ops/OpsRequestReviewScreen.tsx',
  'src/features/ops/OpsRequestsScreen.tsx',
  'src/features/ops/VillagesScreen.tsx',
])

const files = sourceFiles('src', ['.ts', '.tsx'])

describe('colour is a named token, never an opacity', () => {
  test.each(files.filter((file) => !PENDING.has(file)))('%s', (file) => {
    expect(
      offendingLines(code(file), OPACITY),
      'use --ink-2 for secondary text, --ink-3 for notes, and the named tints — not an opacity',
    ).toEqual([])
  })
})

describe('the ratchet only turns one way', () => {
  test('every pending file still exists', () => {
    for (const file of PENDING) {
      expect(files, `${file} is listed as pending but is not a source file`).toContain(file)
    }
  })

  test('a pending file that is already clean has been taken off the list', () => {
    const clean = [...PENDING].filter((file) => !OPACITY.test(code(file)))
    expect(clean, 'these files no longer use opacity colours — delete them from PENDING').toEqual([])
  })
})
