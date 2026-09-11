import { describe, expect, test } from 'vitest'

import { humanizeDbError } from '@/lib/errors'

const key = (error: unknown) => {
  const result = humanizeDbError(error)
  return result.kind === 'key' ? result.key : `VERBATIM:${result.message}`
}

/**
 * QA #3, #4, #20, #25 — one place deciding what a user reads when a write
 * fails.
 *
 * **The distinction this file exists to hold.** business-rules §9 says the
 * Postgres messages in THIS schema are written to be read by humans and must
 * be surfaced verbatim: `over-commitment: 4100.00 kg available, …` names the
 * numbers the user needs, and no rewriting improves it. What §9 never covers
 * is the machine noise underneath — constraint identifiers, type-parse
 * failures, overflow, JS exceptions — and that is the only thing mapped here.
 *
 * So the DEFAULT IS VERBATIM. A message is only replaced when it is recognised
 * as something no human wrote.
 */
describe('the schema own messages pass through untouched', () => {
  // Every `raise exception` in supabase/migrations, verbatim.
  test.each([
    'a request may only be created as draft or submitted',
    'illegal transition draft -> approved',
    'only ops or admin may review a request',
    'a submitted request cannot be edited',
    'client_ref is required so a retry cannot create a duplicate farmer',
    'only field staff may register a farmer',
    'village_id is required',
    'unknown crop',
    'this crop is measured by area: area_ha is required',
    'this crop is measured by tree count: tree_count is required',
    'this crop is measured by unit count: unit_count is required',
    'unknown crop cycle',
    'only field staff may verify records',
    'supply must reference a current, undeleted harvest report',
    'over-commitment: 4100.00 kg available, 4100.00 kg already committed, 100.00 kg requested',
  ])('%s', (message) => {
    const result = humanizeDbError(new Error(message))
    expect(result).toEqual({ kind: 'verbatim', message })
  })

  // The guard's message names the actual kilograms. Replacing it with "that is
  // too much" would remove the only part worth reading.
  test('the over-commitment numbers survive', () => {
    const result = humanizeDbError(
      new Error('over-commitment: 4100.00 kg available, 4100.00 kg already committed, 100.00 kg requested'),
    )
    expect(result.kind).toBe('verbatim')
    if (result.kind === 'verbatim') expect(result.message).toContain('4100.00 kg already committed')
  })

  // An unrecognised message is far more likely to be one of ours than machine
  // noise, and a sentence a human wrote is better than "something went wrong".
  test('an unfamiliar message is assumed to be one of ours', () => {
    expect(key(new Error('the village has no capacity row'))).toBe(
      'VERBATIM:the village has no capacity row',
    )
  })
})

/** QA #4. A constraint identifier is not copy, in any language. */
describe('check-constraint violations become sentences', () => {
  const violation = (name: string) =>
    new Error(`new row for relation "pue_request" violates check constraint "${name}"`)

  test.each([
    ['pue_request_hours_per_day_check', 'error.hoursRange'],
    ['pue_request_days_per_week_check', 'error.daysRange'],
    ['pue_request_quantity_check', 'error.quantityPositive'],
    ['cycle_window_sane', 'error.windowBackwards'],
    ['demand_window_sane', 'error.windowBackwards'],
    ['opportunity_supply_contributed_kg_check', 'error.contributionPositive'],
    ['harvest_report_quantity_kg_check', 'error.quantityNotNegative'],
  ])('%s', (name, expected) => {
    expect(key(violation(name))).toBe(expected)
  })

  // No table name, no constraint name, no quotes from the original.
  test('nothing of the raw message survives', () => {
    const result = humanizeDbError(violation('cycle_window_sane'))
    expect(result.kind).toBe('key')
  })

  // A constraint nobody has mapped yet must still not leak its name.
  test('an unmapped constraint falls back rather than leaking its identifier', () => {
    expect(key(violation('some_future_check'))).toBe('error.invalidValue')
  })
})

describe('the other classes of machine noise', () => {
  // QA #3.
  test('a malformed id', () => {
    expect(key(new Error('invalid input syntax for type uuid: "not-a-uuid"'))).toBe('error.badId')
  })

  // QA #20 — the message genuinely names no field, so neither can we.
  test('numeric overflow says a number was too large, honestly vaguely', () => {
    expect(key(new Error('numeric field overflow'))).toBe('error.numericOverflow')
  })

  // §9: writing a harvest row directly instead of through app_supersede_harvest.
  test('the one-current-harvest unique violation', () => {
    expect(
      key(new Error('duplicate key value violates unique constraint "harvest_one_current"')),
    ).toBe('error.oneCurrentHarvest')
  })

  // The generic fallback is true and unhelpful. Postgres names the constraint
  // rather than the value, so this mapping is the only place that knowledge
  // can live.
  test('a duplicate buyer name says it was the name', () => {
    expect(
      key(new Error('duplicate key value violates unique constraint "buyer_project_id_name_key"')),
    ).toBe('error.duplicateBuyer')
  })

  test('the same harvest twice on one opportunity says so', () => {
    expect(
      key(
        new Error(
          'duplicate key value violates unique constraint "opportunity_supply_opportunity_id_harvest_report_id_key"',
        ),
      ),
    ).toBe('error.duplicateSupply')
  })

  test('an unmapped unique violation does not leak its constraint name', () => {
    expect(
      key(new Error('duplicate key value violates unique constraint "some_uq"')),
    ).toBe('error.duplicate')
  })

  // A write RLS refused means the UI offered a control it should not have —
  // §9 calls that a bug. The user still needs a sentence.
  test('a row-level security refusal', () => {
    expect(key(new Error('new row violates row-level security policy for table "person"'))).toBe(
      'error.notAllowed',
    )
  })

  test('a not-null violation', () => {
    expect(
      key(new Error('null value in column "given_name" of relation "person" violates not-null constraint')),
    ).toBe('error.missingValue')
  })

  test('a foreign key violation', () => {
    expect(
      key(new Error('insert or update on table "plot" violates foreign key constraint "plot_farm_id_fkey"')),
    ).toBe('error.badReference')
  })
})

/**
 * QA #25. "TypeError: Failed to fetch" tells a field officer nothing;
 * "check your connection" tells them everything.
 */
describe('JS exceptions are never user copy', () => {
  test('a failed fetch is a connection problem', () => {
    expect(key(new TypeError('Failed to fetch'))).toBe('error.network')
  })

  test('however the browser words it', () => {
    expect(key(new Error('NetworkError when attempting to fetch resource.'))).toBe('error.network')
    expect(key(new Error('Network request failed'))).toBe('error.network')
    expect(key(new Error('Load failed'))).toBe('error.network')
  })

  // A stringified exception can arrive already prefixed with its class.
  test('a stringified exception is recognised by its prefix', () => {
    expect(key('TypeError: Failed to fetch')).toBe('error.network')
    expect(key(new Error('ReferenceError: x is not defined'))).toBe('error.unexpected')
  })

  test('a runtime exception that is not a network one is still not copy', () => {
    expect(key(new TypeError('x.map is not a function'))).toBe('error.unexpected')
  })
})

describe('nothing at all', () => {
  test.each([null, undefined, ''])('%s is an unexplained failure, not a blank banner', (value) => {
    expect(key(value)).toBe('error.unexpected')
  })

  // A PostgrestError is a plain object; String() on it gives [object Object].
  test('a non-Error object does not become [object Object]', () => {
    expect(key({ message: 'over-commitment: 1 kg available' })).toBe(
      'VERBATIM:over-commitment: 1 kg available',
    )
    expect(key({ code: '23514' })).toBe('error.unexpected')
  })
})
