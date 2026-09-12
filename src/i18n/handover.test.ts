import { describe, expect, test } from 'vitest'

import {
  SURFACE_OF,
  buildHandover,
  flatten,
  renderHandover,
} from '../../scripts/i18n-handover.mjs'

const en = {
  common: { loading: 'Loading…' },
  register: { title: 'Register a farmer', harvestKg: 'Expected harvest (kg)' },
  tower: { drill: 'See the records' },
  estimate: { isEstimate: 'This is an estimate, not a measurement.' },
  language: { en: 'English', sw: 'Kiswahili' },
}
const sw = { language: { en: 'Kiingereza', sw: 'Kiswahili' } }

describe('flatten', () => {
  test('turns nested namespaces into dotted keys', () => {
    expect(flatten({ a: { b: 'x' }, c: 'y' })).toEqual({ 'a.b': 'x', c: 'y' })
  })

  test('leaves a flat object alone', () => {
    expect(flatten({ a: 'x' })).toEqual({ a: 'x' })
  })
})

/**
 * CLAUDE.md: "Farmer and Officer surfaces ship complete Swahili. Ops and Tower
 * may ship English for the demo." A reviewer's time is the scarce resource, so
 * the handover has to say which strings actually block the demo.
 */
describe('which surface a key belongs to', () => {
  test('farmer and officer namespaces are required', () => {
    expect(SURFACE_OF('register.title')).toBe('required')
    expect(SURFACE_OF('equipment.submit')).toBe('required')
    expect(SURFACE_OF('farmHome.title')).toBe('required')
  })

  test('shared chrome is required too — both surfaces render it', () => {
    expect(SURFACE_OF('common.loading')).toBe('required')
    expect(SURFACE_OF('error.network')).toBe('required')
    expect(SURFACE_OF('nav.signOut')).toBe('required')
  })

  test('ops and tower may ship English', () => {
    expect(SURFACE_OF('tower.drill')).toBe('optional')
    expect(SURFACE_OF('demand.colBuyer')).toBe('optional')
    expect(SURFACE_OF('buyers.title')).toBe('optional')
  })

  // An unrecognised namespace is REQUIRED, not optional: a new farmer-facing
  // namespace must not slip out of the reviewer's list by being forgotten here.
  test('an unknown namespace is assumed to block the demo', () => {
    expect(SURFACE_OF('somethingNew.title')).toBe('required')
  })
})

describe('buildHandover', () => {
  test('carries every English key', () => {
    const rows = buildHandover(en, sw)
    expect(rows).toHaveLength(Object.keys(flatten(en)).length)
  })

  test('shows the English string a reviewer has to translate', () => {
    const row = buildHandover(en, sw).find((r) => r.key === 'register.title')
    expect(row?.english).toBe('Register a farmer')
  })

  // The two attested keys are already done, and asking for them again wastes
  // the reviewer's attention.
  test('marks what already has Swahili, with the existing wording', () => {
    const row = buildHandover(en, sw).find((r) => r.key === 'language.sw')
    expect(row?.swahili).toBe('Kiswahili')
    expect(row?.translated).toBe(true)
  })

  test('and leaves the rest empty rather than guessing', () => {
    const row = buildHandover(en, sw).find((r) => r.key === 'register.title')
    expect(row?.swahili).toBe('')
    expect(row?.translated).toBe(false)
  })

  /**
   * Language and labelling in CLAUDE.md are product requirements, not copy
   * preferences: "Getting them wrong misrepresents the programme." A reviewer
   * who does not know that will translate "estimate" into something confident.
   */
  test('attaches the labelling rule to the strings it governs', () => {
    const row = buildHandover(en, sw).find((r) => r.key === 'estimate.isEstimate')
    expect(row?.note).toMatch(/estimate/i)
  })

  test('a string with no rule attached carries no invented note', () => {
    const row = buildHandover(en, sw).find((r) => r.key === 'common.loading')
    expect(row?.note).toBe('')
  })

  test('required rows come first, so the blocking work is at the top', () => {
    const rows = buildHandover(en, sw)
    const firstOptional = rows.findIndex((r) => r.surface === 'optional')
    const lastRequired = rows.map((r) => r.surface).lastIndexOf('required')
    expect(lastRequired).toBeLessThan(firstOptional)
  })

  test('interpolation placeholders are flagged, because they must survive', () => {
    const rows = buildHandover({ a: { b: 'Stored as {{value}}' } }, {})
    expect(rows[0].placeholders).toEqual(['{{value}}'])
  })

  test('a string with no placeholders reports none', () => {
    expect(buildHandover({ a: { b: 'Plain' } }, {})[0].placeholders).toEqual([])
  })
})

describe('renderHandover', () => {
  const doc = () => renderHandover(buildHandover(en, sw), { generated: '2026-09-13' })

  test('states the rule it exists to serve', () => {
    expect(doc()).toMatch(/farmer and officer/i)
    expect(doc()).toMatch(/ops and tower/i)
  })

  // The instruction that matters most to whoever picks this up next.
  test('says plainly that nothing here may be machine translated', () => {
    expect(doc()).toMatch(/machine translation|native reviewer/i)
  })

  // The fixture holds seven keys: six required, one on the tower surface, and
  // two that already carry Swahili.
  test('counts the work rather than making the reviewer count it', () => {
    const rendered = doc()
    expect(rendered).toMatch(/6 strings/)
    expect(rendered).toMatch(/1 strings/)
    expect(rendered).toMatch(/7 strings in total, of which 2 already have Swahili/)
  })

  test('every key appears with its English string', () => {
    expect(doc()).toContain('register.title')
    expect(doc()).toContain('Register a farmer')
  })

  test('a pipe in a string does not break the table it sits in', () => {
    const rendered = renderHandover(buildHandover({ a: { b: 'one | two' } }, {}), {
      generated: '2026-09-13',
    })
    const row = rendered.split('\n').find((line) => line.includes('one'))
    // Four columns plus the leading and trailing delimiters.
    expect(row?.split('|').length).toBe(7)
  })
})
