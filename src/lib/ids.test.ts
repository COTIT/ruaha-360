import { describe, expect, test } from 'vitest'

import { isUuid } from '@/lib/ids'

/**
 * QA #3. `/officer/people/not-a-uuid` rendered
 * `invalid input syntax for type uuid: "not-a-uuid"` — database internals as
 * user copy, on every `$id` route.
 *
 * A well-formed id matching nothing already behaves correctly: RLS returns
 * zero rows and the screen says "not found". That is the behaviour a malformed
 * id should reach too, which means recognising one BEFORE the query rather
 * than translating the failure afterwards.
 */
describe('isUuid', () => {
  test('accepts the ids the seed uses', () => {
    expect(isUuid('30000000-0000-4000-8000-000000000001')).toBe(true)
    expect(isUuid('e2000000-0000-4000-8000-000000000001')).toBe(true)
  })

  test('accepts a generated v4', () => {
    expect(isUuid(crypto.randomUUID())).toBe(true)
  })

  test('is case-insensitive, as Postgres is', () => {
    expect(isUuid('E2000000-0000-4000-8000-000000000001')).toBe(true)
  })

  test.each([
    'not-a-uuid',
    '',
    '   ',
    '30000000-0000-4000-8000',
    '30000000-0000-4000-8000-0000000000011',
    '30000000_0000_4000_8000_000000000001',
    'zzzzzzzz-0000-4000-8000-000000000001',
    // The shape Postgres accepts without dashes is deliberately NOT accepted:
    // nothing in this app produces one, so it is far likelier to be junk.
    '30000000000040008000000000000001',
  ])('rejects %s', (value) => {
    expect(isUuid(value)).toBe(false)
  })

  test('rejects a missing value without throwing', () => {
    expect(isUuid(undefined)).toBe(false)
    expect(isUuid(null)).toBe(false)
  })

  // An id with surrounding space came from a URL nobody typed carefully; it is
  // not this function's job to repair it.
  test('does not trim', () => {
    expect(isUuid(' 30000000-0000-4000-8000-000000000001 ')).toBe(false)
  })
})
