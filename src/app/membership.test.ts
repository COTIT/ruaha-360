import { describe, expect, test } from 'vitest'

import { activeMemberships, resolveLanding, roleHome } from '@/app/membership'
import type { ActiveMembership } from '@/app/membership'

const m = (
  role: ActiveMembership['role'],
  extra: Partial<ActiveMembership> = {},
): ActiveMembership => ({
  id: crypto.randomUUID(),
  role,
  project_id: '20000000-0000-4000-8000-000000000001',
  village_id: null,
  revoked_at: null,
  ...extra,
})

describe('roleHome', () => {
  test('each product role has its own surface', () => {
    expect(roleHome('farmer')).toBe('/farm')
    expect(roleHome('field_officer')).toBe('/officer')
    expect(roleHome('ops')).toBe('/ops')
  })

  // CLAUDE.md: admin is operational (seed, support), not a product surface.
  // There is no /admin route, and admin's scope in the role matrix is the
  // whole project, identical to ops.
  test('admin lands on the ops surface, since no admin surface exists', () => {
    expect(roleHome('admin')).toBe('/ops')
  })
})

describe('activeMemberships', () => {
  test('drops revoked rows', () => {
    const rows = [m('farmer'), m('ops', { revoked_at: '2026-09-01T00:00:00Z' })]
    expect(activeMemberships(rows)).toHaveLength(1)
    expect(activeMemberships(rows)[0].role).toBe('farmer')
  })

  test('a fully revoked user has no active memberships', () => {
    expect(activeMemberships([m('ops', { revoked_at: '2026-09-01T00:00:00Z' })])).toEqual([])
  })
})

describe('resolveLanding', () => {
  // Spec 4.2: 0 rows -> /no-access, 1 row -> that role's home,
  // 2+ rows -> /select-role.
  test('zero memberships is a real screen, not a crash', () => {
    expect(resolveLanding([])).toEqual({ to: '/no-access' })
  })

  test('one membership goes straight to that role home', () => {
    expect(resolveLanding([m('farmer')])).toEqual({ to: '/farm' })
    expect(resolveLanding([m('field_officer')])).toEqual({ to: '/officer' })
    expect(resolveLanding([m('ops')])).toEqual({ to: '/ops' })
  })

  test('two or more memberships need the picker', () => {
    expect(resolveLanding([m('farmer'), m('field_officer')])).toEqual({ to: '/select-role' })
  })

  test('revoked rows do not count toward the picker', () => {
    const rows = [m('farmer'), m('ops', { revoked_at: '2026-09-01T00:00:00Z' })]
    expect(resolveLanding(rows)).toEqual({ to: '/farm' })
  })

  test('a user whose only membership was revoked gets no-access', () => {
    expect(resolveLanding([m('ops', { revoked_at: '2026-09-01T00:00:00Z' })])).toEqual({
      to: '/no-access',
    })
  })
})
