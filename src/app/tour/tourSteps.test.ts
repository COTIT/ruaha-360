import { describe, expect, test } from 'vitest'

import { TOURS, type TourStep } from '@/app/tour/tourSteps'
import { resolveLanding } from '@/app/membership'
import { code, read, sourceFiles } from '@/styles/design'
import en from '@/i18n/en/common.json'

/**
 * A guided tour is the one feature that breaks in total silence.
 *
 * It points at other people's markup by selector, and nothing in a refactor
 * tells you that `officer-unverified` was renamed — the tour simply finds no
 * element and either skips the step or parks an empty bubble in the middle of
 * the screen, which is worse than not having a tour. So the steps are DATA,
 * checked here against the app they describe: every target exists, every route
 * exists, every string is a key somebody can translate.
 *
 * Targets are `data-testid` on purpose. They are already a contract this repo
 * keeps — `pnpm e2e` fails when one moves — so the tour inherits that contract
 * instead of inventing a parallel one out of class names.
 */
const SURFACES = ['farmer', 'officer', 'ops'] as const

/**
 * Every test id the app renders. Two spellings, because shared components take
 * theirs as a prop — `<DataTable testId="requests-table">` puts the attribute
 * on markup that lives in another file entirely.
 */
const RENDERED_TEST_IDS = new Set(
  sourceFiles('src', ['.tsx'])
    .flatMap((file) => [...code(file).matchAll(/(?:data-testid|testId)="([a-z0-9-]+)"/g)])
    .map((match) => match[1]),
)

/** Every route the generated tree can resolve. */
const ROUTES = new Set(
  [...read('src/routeTree.gen.ts').matchAll(/'(\/[a-z0-9\-/$]*)'/g)].map((match) => match[1]),
)

function lookup(key: string): unknown {
  return key.split('.').reduce<unknown>(
    (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
    en,
  )
}

const everyStep: Array<[string, TourStep]> = SURFACES.flatMap((surface) =>
  TOURS[surface].map((step) => [`${surface}: ${step.testId}`, step] as [string, TourStep]),
)

describe('every role has a tour', () => {
  test.each(SURFACES)('%s', (surface) => {
    expect(TOURS[surface].length, 'a tour of one or two stops is not a tour').toBeGreaterThanOrEqual(3)
  })

  // Where the user actually lands after signing in. A tour whose first stop is
  // somewhere else opens by teleporting them, before it has explained anything.
  test.each([
    ['farmer', 'farmer'],
    ['officer', 'field_officer'],
    ['ops', 'ops'],
  ] as const)('the %s tour starts where that role lands', (surface, role) => {
    const landing = resolveLanding([{ role, revoked_at: null }] as never)
    expect(TOURS[surface][0].route).toBe(landing.to)
  })
})

describe('every step points at something that exists', () => {
  test.each(everyStep)('%s', (_name, step) => {
    expect(RENDERED_TEST_IDS, `no element renders data-testid="${step.testId}"`).toContain(step.testId)
    expect(ROUTES, `${step.route} is not a route`).toContain(step.route)
  })
})

describe('every step is written in words somebody can translate', () => {
  test.each(everyStep)('%s', (_name, step) => {
    expect(typeof lookup(step.titleKey), `${step.titleKey} is missing from en/common.json`).toBe('string')
    expect(typeof lookup(step.bodyKey), `${step.bodyKey} is missing from en/common.json`).toBe('string')
  })
})

/**
 * "As easy to follow as possible" is mostly this: a tour that visits Register,
 * then People, then Register again has made the user travel twice to say one
 * thing. Each route gets one contiguous run of steps.
 */
describe('a tour never doubles back', () => {
  test.each(SURFACES)('%s visits each screen once', (surface) => {
    const visits = TOURS[surface].map((step) => step.route)
    const runs = visits.filter((route, index) => route !== visits[index - 1])
    expect(runs, 'a route is visited, left, and visited again').toEqual([...new Set(runs)])
  })
})
