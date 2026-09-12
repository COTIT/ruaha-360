import { beforeEach, describe, expect, test } from 'vitest'

import en from '@/i18n/en/common.json'
import sw from '@/i18n/sw/common.json'
import { flatten } from '../../scripts/i18n-handover.mjs'

const i18n = (await import('@/i18n')).default

const EN = flatten(en) as Record<string, string>
const SW = flatten(sw) as Record<string, string>

beforeEach(async () => {
  await i18n.changeLanguage('en')
})

/**
 * The bundles, as a fence rather than as a driver.
 *
 * These are regression guards: they pass on the day they are written, and
 * their job is to fail on the day someone adds a machine-translated string or
 * a key that renders as its own path. CLAUDE.md's rule is absolute — "never
 * invent Swahili … flag any string you invent rather than shipping machine
 * translation to Tanzanian stakeholders" — and a rule nothing enforces is a
 * rule that survives exactly as long as the person who remembers it.
 */
describe('the Swahili bundle contains only attested strings', () => {
  /**
   * The complete list, and it is short on purpose. `Kiingereza` and
   * `Kiswahili` are the language's own names for the two languages: standard
   * terms, not product copy invented by a developer.
   *
   * **Adding to this list is not a code change.** It is a claim that a native
   * reviewer supplied the string. If that is not true, the entry does not
   * belong here — and neither does the string.
   */
  const ATTESTED = ['language.en', 'language.sw']

  test('and nothing else', () => {
    expect(Object.keys(SW).sort()).toEqual([...ATTESTED].sort())
  })

  test('every Swahili key exists in English, so none is orphaned', () => {
    for (const key of Object.keys(SW)) expect(EN).toHaveProperty(key)
  })

  test('no Swahili value is blank, which would render as nothing at all', () => {
    for (const [key, value] of Object.entries(SW)) {
      expect(value.trim(), key).not.toBe('')
    }
  })
})

/**
 * Until a reviewer has been through the handover file, a farmer's phone shows
 * English. That is the intended state, and it has to be a CLEAN one: a missing
 * key renders as its own path — `register.harvestKg` where a label belongs —
 * which is worse than either language.
 */
describe('Swahili falls back to English cleanly', () => {
  test('every English key resolves under sw', async () => {
    await i18n.changeLanguage('sw')

    const raw = Object.keys(EN).filter((key) => i18n.t(key) === key)
    expect(raw, 'these keys would render as their own path').toEqual([])
  })

  test('and resolves to the English wording, not to emptiness', async () => {
    await i18n.changeLanguage('sw')

    expect(i18n.t('register.title')).toBe(EN['register.title'])
    expect(i18n.t('common.loading')).toBe(EN['common.loading'])
  })

  test('while the two attested strings really are Swahili', async () => {
    await i18n.changeLanguage('sw')
    expect(i18n.t('language.en')).toBe('Kiingereza')
  })

  test('and English is unaffected by any of it', async () => {
    await i18n.changeLanguage('en')
    expect(i18n.t('language.en')).toBe('English')
  })
})

describe('the English bundle is complete in itself', () => {
  test('no key is blank', () => {
    for (const [key, value] of Object.entries(EN)) {
      expect(String(value).trim(), key).not.toBe('')
    }
  })

  // A placeholder that loses its braces renders the literal text, which is how
  // "Stored as {{value}}" becomes "Stored as value" in front of a user.
  test('no interpolation placeholder is malformed', () => {
    for (const [key, value] of Object.entries(EN)) {
      const braces = String(value).match(/\{+|\}+/g) ?? []
      for (const run of braces) expect(run.length, `${key}: ${value}`).toBe(2)
    }
  })

  // Reference data — crop, equipment and category names — is translated in the
  // DATABASE via name_en / name_sw. Those rows are created at runtime and a
  // repo file cannot translate them.
  test('holds no reference data that belongs in the database', () => {
    for (const key of Object.keys(EN)) {
      expect(key).not.toMatch(/^(crops|equipmentNames|categories)\./)
    }
  })
})
